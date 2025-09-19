import {onRequest, onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import * as cors from "cors";

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_API_PRIVATE_KEY || "", {
  apiVersion: "2024-12-18.acacia",
});

// Initialize CORS
const corsHandler = cors({origin: true});

// Create payment intent
export const createPaymentIntent = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({error: "Method not allowed"});
        return;
      }

      const {amount, registrationData} = req.body;

      if (!amount || !registrationData) {
        res.status(400).json({error: "Missing required fields"});
        return;
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // Convert to cents
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          registrationId: registrationData.registrationId || "",
          parentName: registrationData.parent.name,
          participantCount: registrationData.children.length.toString(),
        },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error) {
      logger.error("Error creating payment intent:", error);
      res.status(500).json({error: "Failed to create payment intent"});
    }
  });
});

// Save registration data
export const saveRegistration = onCall(async (request) => {
  try {
    const {registrationData, paymentIntentId} = request.data;

    if (!registrationData) {
      throw new Error("Registration data is required");
    }

    // Generate a unique registration ID
    const registrationId = `REG_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Prepare the registration document
    const registrationDoc = {
      registrationId,
      paymentIntentId: paymentIntentId || null,
      parent: registrationData.parent,
      children: registrationData.children,
      agreement: registrationData.agreement,
      total: registrationData.total,
      status: paymentIntentId ? "paid" : "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Save to Firestore
    const docRef = await admin.firestore()
        .collection("registrations")
        .add(registrationDoc);

    logger.info(`Registration saved with ID: ${docRef.id}`);

    return {
      success: true,
      registrationId,
      docId: docRef.id,
    };
  } catch (error) {
    logger.error("Error saving registration:", error);
    throw new Error("Failed to save registration");
  }
});

// Get all registrations (for admin portal)
export const getRegistrations = onCall(async (request) => {
  try {
    // In a real app, you'd want to add authentication here
    // For now, we'll assume this is protected at the frontend level

    const snapshot = await admin.firestore()
        .collection("registrations")
        .orderBy("createdAt", "desc")
        .get();

    const registrations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: true,
      registrations,
    };
  } catch (error) {
    logger.error("Error fetching registrations:", error);
    throw new Error("Failed to fetch registrations");
  }
});

// Confirm payment and update registration status
export const confirmPayment = onCall(async (request) => {
  try {
    const {paymentIntentId, registrationId} = request.data;

    if (!paymentIntentId) {
      throw new Error("Payment intent ID is required");
    }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      // Update registration status in Firestore
      const query = admin.firestore()
          .collection("registrations")
          .where("registrationId", "==", registrationId);

      const snapshot = await query.get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        await doc.ref.update({
          status: "paid",
          paymentConfirmedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info(`Payment confirmed for registration: ${registrationId}`);
        return {success: true, status: "paid"};
      } else {
        throw new Error("Registration not found");
      }
    } else {
      throw new Error("Payment not successful");
    }
  } catch (error) {
    logger.error("Error confirming payment:", error);
    throw new Error("Failed to confirm payment");
  }
});
