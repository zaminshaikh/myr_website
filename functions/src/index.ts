import {onRequest, onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
const Stripe = require("stripe");
const cors = require("cors");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Define Stripe secret keys
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeTestSecretKey = defineSecret("STRIPE_TEST_SECRET_KEY");

// Initialize Stripe (will be initialized in each function)
const getStripe = (testMode = false) => {
  const apiKey = testMode ? stripeTestSecretKey.value() : stripeSecretKey.value();
  return new Stripe(apiKey, {
    apiVersion: "2024-06-20",
  });
};

// Initialize CORS
const corsHandler = cors({origin: true});

// Create payment intent
export const createPaymentIntent = onRequest(
  { secrets: [stripeSecretKey, stripeTestSecretKey] },
  (req, res) => {
    corsHandler(req, res, async () => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({error: "Method not allowed"});
        return;
      }

      const {amount, registrationData, testMode} = req.body;

      if (!amount || !registrationData) {
        res.status(400).json({error: "Missing required fields"});
        return;
      }

      // Create payment intent
      const useTestMode = testMode === true;
      logger.info(`Initializing Stripe with ${useTestMode ? 'test' : 'live'} secret key - testMode flag: ${testMode}`);
      const stripe = getStripe(useTestMode);
      logger.info("Stripe initialized, creating payment intent");
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // Convert to cents
        currency: "usd",
        // Disable automatic payment methods to avoid HTTPS security warnings in development
        // automatic_payment_methods: { enabled: true },
        payment_method_types: ['card'], // Explicitly allow card payments
        metadata: {
          registrationId: registrationData.registrationId || "",
          parentName: registrationData.parent?.name || "",
          participantCount: (registrationData.children?.length || 0).toString(),
          testMode: useTestMode ? "true" : "false",
        },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        testMode: useTestMode,
      });
    } catch (error) {
      logger.error("Error creating payment intent:", error);
      res.status(500).json({error: "Failed to create payment intent"});
    }
    });
  }
);

// Save registration data
export const saveRegistration = onCall(async (request) => {
  try {
    const {registrationData, paymentIntentId} = request.data;

    if (!registrationData) {
      throw new Error("Registration data is required");
    }

    // Generate a unique registration ID
    const registrationId = `REG_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const db = admin.firestore();
    const batch = db.batch();

    // Create guardian document
    const guardianRef = db.collection("guardians").doc();
    const guardianDoc = {
      guardianId: `GRD_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      name: registrationData.parent.name,
      email: registrationData.parent.email,
      phone: registrationData.parent.phone,
      address: {
        street: registrationData.parent.address,
        apartment: registrationData.parent.apartment || "",
        city: registrationData.parent.city,
        state: registrationData.parent.state,
        zipCode: registrationData.parent.zipCode,
        country: registrationData.parent.country,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    batch.set(guardianRef, guardianDoc);

    // Create participant documents
    const participantIds: string[] = [];
    for (const child of registrationData.children) {
      const participantRef = db.collection("participants").doc();
      const participantId = `PRT_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      participantIds.push(participantId);
      
      const participantDoc = {
        participantId,
        registrationId,
        guardianId: guardianDoc.guardianId,
        name: child.name,
        age: parseInt(child.age),
        gender: child.gender,
        grade: child.grade,
        dietary: child.dietary || "",
        medical: child.medical || "",
        emergencyContact: {
          name: child.emergencyContact,
          phone: child.emergencyPhone,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      batch.set(participantRef, participantDoc);
    }

    // Create main registration document
    const registrationRef = db.collection("registrations").doc();
    const registrationDoc = {
      registrationId,
      paymentIntentId: paymentIntentId || null,
      guardianId: guardianDoc.guardianId,
      participantIds,
      participantCount: registrationData.children.length,
      agreement: registrationData.agreement,
      total: registrationData.total,
      status: paymentIntentId ? "paid" : "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    batch.set(registrationRef, registrationDoc);

    // Commit the batch
    await batch.commit();

    logger.info(`Registration saved with ID: ${registrationId}`);

    return {
      success: true,
      registrationId,
      docId: registrationRef.id,
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
export const confirmPayment = onCall(
  { secrets: [stripeSecretKey, stripeTestSecretKey] },
  async (request) => {
  try {
    const {paymentIntentId, registrationId, testMode} = request.data;

    if (!paymentIntentId) {
      throw new Error("Payment intent ID is required");
    }

    // Determine test mode from payment intent ID or explicit flag
    const useTestMode = testMode === true || paymentIntentId.includes('test');

    // Verify payment with Stripe
    const stripe = getStripe(useTestMode);
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
  }
);
