import {onRequest, onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
const Stripe = require("stripe");
const cors = require("cors");
const { Resend } = require("resend");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Define Stripe secret keys
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeTestSecretKey = defineSecret("STRIPE_TEST_SECRET_KEY");

// Define Resend API key
const resendApiKey = defineSecret("RESEND_API_KEY");


// Initialize Stripe (will be initialized in each function)
const getStripe = (testMode = false) => {
  const apiKey = testMode ? stripeTestSecretKey.value() : stripeSecretKey.value();
  return new Stripe(apiKey, {
    apiVersion: "2024-06-20",
  });
};

// Initialize CORS
const corsHandler = cors({origin: true});

// Helper function to send confirmation emails (can be called internally)
const sendConfirmationEmailHelper = async (emailData: {
  recipientEmail: string;
  recipientName: string;
  registrationId?: string;
  children?: any[];
  eventDate?: string;
  location?: string;
  total?: number;
  type?: string;
}) => {
  const {
    recipientEmail,
    recipientName,
    registrationId,
    children,
    eventDate = "Friday Dec 05, 2025, 4:00 PM – Sunday Dec 07, 2025, 4:00 PM",
    location = "Florida Elks Youth Camp, 24175 SE Hwy 450, Umatilla, FL 32784, USA",
    total,
    type = "registration"
  } = emailData;

  // Validate required fields
  if (!recipientEmail || !recipientName) {
    throw new Error("Recipient email and name are required");
  }

  // Initialize Resend
  const resend = new Resend(resendApiKey.value());

  // Create email subject based on type
  let subject = "Muslim Youth Retreat 2025 - Registration Confirmation";
  if (type === "payment") {
    subject = "Muslim Youth Retreat 2025 - Payment Confirmed";
  } else if (type === "reminder") {
    subject = "Muslim Youth Retreat 2025 - Event Reminder";
  }

  // Generate participant list HTML
  const participantsList = children && children.length > 0 ? 
    children.map((child: any, index: number) => `
      <div style="background: rgba(85, 124, 186, 0.1); padding: 16px; border-radius: 12px; margin-bottom: 12px;">
        <h4 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: 600;">
          Participant ${index + 1}: ${child.name}
        </h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; font-size: 14px; color: #4b5563;">
          <div><strong>Age:</strong> ${child.age}</div>
          <div><strong>Grade:</strong> ${child.grade}</div>
          <div><strong>Gender:</strong> ${child.gender}</div>
        </div>
        ${child.dietary ? `<div style="margin-top: 8px; font-size: 14px; color: #4b5563;"><strong>Dietary:</strong> ${child.dietary}</div>` : ''}
        ${child.medical ? `<div style="margin-top: 4px; font-size: 14px; color: #4b5563;"><strong>Medical:</strong> ${child.medical}</div>` : ''}
      </div>
    `).join('') : '';

  // Create beautiful HTML email template
  const emailHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    </head>
    <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;">
      <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 0;">
        
        <!-- Header with Gradient -->
        <div style="background: linear-gradient(135deg, #EEB541 0%, #D4A43A 100%); padding: 40px 32px; text-align: center; border-radius: 0;">
          <div style="background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); padding: 24px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.2); display: inline-block;">
            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 800; letter-spacing: -0.02em;">
              Muslim Youth Retreat 2025
            </h1>
            <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px; font-weight: 500;">
              ${type === 'payment' ? 'Payment Confirmed' : type === 'reminder' ? 'Event Reminder' : 'Registration Confirmed'}
            </p>
          </div>
        </div>

        <!-- Main Content -->
        <div style="padding: 48px 32px;">
          
          <!-- Welcome Message -->
          <div style="text-align: center; margin-bottom: 48px;">
            <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">
              Salaams ${recipientName}!
            </h2>
            <p style="margin: 0; color: #4b5563; font-size: 18px; line-height: 1.6;">
              ${type === 'payment' ? 'Your payment has been confirmed for the Muslim Youth Retreat 2025. Thank you!' : 
                type === 'reminder' ? 'This is a friendly reminder about the upcoming Muslim Youth Retreat 2025.' :
                'Thank you for registering for the Muslim Youth Retreat 2025. We\'re excited to welcome you and your family to this amazing experience!'}
            </p>
          </div>

          ${registrationId ? `
          <!-- Registration Details -->
          <div style="background: linear-gradient(135deg, rgba(85, 124, 186, 0.1) 0%, rgba(238, 181, 65, 0.1) 100%); padding: 32px; border-radius: 20px; margin-bottom: 32px; border: 1px solid rgba(85, 124, 186, 0.2);">
            <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 700; display: flex; align-items: center;">
              <span style="background: linear-gradient(135deg, #557CBA 0%, #4A6BA8 100%); color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 16px;">✓</span>
              Registration Details
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
              <div>
                <strong style="color: #374151; font-weight: 600;">Registration ID:</strong>
                <div style="background: #f3f4f6; padding: 8px 12px; border-radius: 8px; margin-top: 4px; font-family: monospace; color: #1f2937; font-weight: 600;">
                  ${registrationId}
                </div>
              </div>
              ${total ? `
              <div>
                <strong style="color: #374151; font-weight: 600;">Total Amount:</strong>
                <div style="background: linear-gradient(135deg, #EEB541 0%, #D4A43A 100%); color: white; padding: 8px 12px; border-radius: 8px; margin-top: 4px; font-weight: 700; text-align: center;">
                  $${total}
                </div>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}

          ${participantsList ? `
          <!-- Participants -->
          <div style="margin-bottom: 32px;">
            <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 700; display: flex; align-items: center;">
              <span style="background: linear-gradient(135deg, #EEB541 0%, #D4A43A 100%); color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 16px;">👥</span>
              Registered Participants
            </h3>
            ${participantsList}
          </div>
          ` : ''}

          <!-- Event Details -->
          <div style="background: linear-gradient(135deg, #557CBA 0%, #4A6BA8 100%); color: white; padding: 32px; border-radius: 20px; margin-bottom: 32px;">
            <h3 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 700; text-align: center;">
              Event Details
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px;">
              <div style="background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.2); text-align: center;">
                <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; opacity: 0.9;">When</h4>
                <p style="margin: 0; font-size: 15px; line-height: 1.4;">${eventDate}</p>
              </div>
              <div style="background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.2); text-align: center;">
                <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; opacity: 0.9;">Where</h4>
                <p style="margin: 0; font-size: 15px; line-height: 1.4;">${location}</p>
              </div>
            </div>
          </div>

          <!-- What to Bring -->
          <div style="background: #f8fafc; padding: 32px; border-radius: 20px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
            <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 700; display: flex; align-items: center;">
              <span style="background: linear-gradient(135deg, #EEB541 0%, #D4A43A 100%); color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 16px;">🎒</span>
              What to Bring
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; font-size: 14px; color: #4b5563;">
              <div style="display: flex; align-items: center; padding: 8px 0;">
                <span style="color: #10b981; margin-right: 8px; font-weight: bold;">✓</span>
                1 Quran
              </div>
              <div style="display: flex; align-items: center; padding: 8px 0;">
                <span style="color: #10b981; margin-right: 8px; font-weight: bold;">✓</span>
                Sleeping bag/sheets
              </div>
              <div style="display: flex; align-items: center; padding: 8px 0;">
                <span style="color: #10b981; margin-right: 8px; font-weight: bold;">✓</span>
                Pillow & pillowcase
              </div>
              <div style="display: flex; align-items: center; padding: 8px 0;">
                <span style="color: #10b981; margin-right: 8px; font-weight: bold;">✓</span>
                Towels & toiletries
              </div>
              <div style="display: flex; align-items: center; padding: 8px 0;">
                <span style="color: #10b981; margin-right: 8px; font-weight: bold;">✓</span>
                Water bottle
              </div>
              <div style="display: flex; align-items: center; padding: 8px 0;">
                <span style="color: #10b981; margin-right: 8px; font-weight: bold;">✓</span>
                Appropriate clothing
              </div>
            </div>
            <p style="margin: 16px 0 0 0; font-size: 14px; color: #6b7280; font-style: italic;">
              For a complete packing list, please refer to our FAQ section on the website.
            </p>
          </div>

          <!-- Important Notes -->
          <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(245, 101, 101, 0.1) 100%); padding: 24px; border-radius: 16px; border: 1px solid rgba(239, 68, 68, 0.2); margin-bottom: 32px;">
            <h4 style="margin: 0 0 12px 0; color: #dc2626; font-size: 16px; font-weight: 600; display: flex; align-items: center;">
              <span style="margin-right: 8px; font-size: 18px;">⚠️</span>
              Important Reminders
            </h4>
            <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.6;">
              <li style="margin-bottom: 8px;">Registration deadline: <strong>November 17th, 2025</strong></li>
              <li style="margin-bottom: 8px;">Arrival: Friday Dec 5th at 4:30 PM</li>
              <li style="margin-bottom: 8px;">Departure: Sunday Dec 7th at 4:30 PM</li>
              <li>Transportation is not provided - please arrange your own</li>
            </ul>
          </div>

          <!-- Contact Information -->
          <div style="text-align: center; padding: 32px 0; border-top: 1px solid #e5e7eb;">
            <h4 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px; font-weight: 600;">
              Questions? We're here to help!
            </h4>
            <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 16px;">
              Contact us at <a href="mailto:info@muslimyouthretreat.org" style="color: #EEB541; text-decoration: none; font-weight: 600;">info@muslimyouthretreat.org</a>
            </p>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              We can't wait to see you at the retreat! 🌟
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #1f2937; color: white; padding: 32px; text-align: center;">
          <div style="margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #EEB541;">
              Muslim Youth Retreat 2025
            </h3>
            <p style="margin: 0; color: #9ca3af; font-size: 14px;">
              Hosted by Wise Academy
            </p>
          </div>
          <div style="border-top: 1px solid #374151; padding-top: 16px;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">
              © 2025 Muslim Youth Retreat. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Send email using Resend
  logger.info('Attempting to send confirmation email via Resend', {
    to: recipientEmail,
    subject: subject,
    type: type,
    registrationId: registrationId
  });

  const result = await resend.emails.send({
    from: 'Muslim Youth Retreat <noreply@muslimyouthretreat.org>',
    to: [recipientEmail],
    subject: subject,
    html: emailHtml,
  });

  logger.info(`Confirmation email sent successfully`, { 
    messageId: result.data?.id,
    to: recipientEmail,
    subject: subject,
    type: type,
    registrationId: registrationId
  });

  return {
    success: true,
    message: "Confirmation email sent successfully",
    messageId: result.data?.id,
  };
};

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

    const db = admin.firestore();
    
    // Generate a unique registration ID (only called when payment succeeds)
    const registrationId = `REG_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const registrationRef = db.collection("registrations").doc();
    
    logger.info(`Creating new registration: ${registrationId}`);
    const batch = db.batch();

    // Generate participant IDs first
    const participantIds: string[] = [];
    for (let i = 0; i < registrationData.children.length; i++) {
      const participantId = `PRT_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      participantIds.push(participantId);
    }

    // Create guardian document with participant references
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
      participantIds: participantIds,
      participantCount: registrationData.children.length,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    batch.set(guardianRef, guardianDoc);

    // Create participant documents
    for (let i = 0; i < registrationData.children.length; i++) {
      const child = registrationData.children[i];
      const participantRef = db.collection("participants").doc();
      const participantId = participantIds[i];
      
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
        active: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      batch.set(participantRef, participantDoc);
    }

    // Create or update main registration document
    const registrationDoc = {
      registrationId,
      paymentIntentId: paymentIntentId || null,
      guardianId: guardianDoc.guardianId,
      participantIds,
      participantCount: registrationData.children.length,
      parent: registrationData.parent,
      children: registrationData.children,
      agreement: registrationData.agreement,
      total: registrationData.total,
      status: paymentIntentId ? "paid" : "pending",
      step: 4, // Payment step
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    batch.set(registrationRef, registrationDoc);

    // Commit the batch
    await batch.commit();

    logger.info(`Registration saved with ID: ${registrationId}`);

    // Note: Confirmation emails are now sent from the frontend for better control
    // This avoids duplicate emails and gives frontend more flexibility

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

// Get all registrations with populated guardian and participant data (for admin portal)
export const getRegistrations = onCall(async (request) => {
  try {
    // In a real app, you'd want to add authentication here
    // For now, we'll assume this is protected at the frontend level

    const db = admin.firestore();
    const snapshot = await db
        .collection("registrations")
        .orderBy("createdAt", "desc")
        .get();

    const registrations = [];

    for (const doc of snapshot.docs) {
      const registration: any = { id: doc.id, ...doc.data() };
      
      // Only fetch guardian data if guardianId exists and is not undefined
      if (registration.guardianId) {
        try {
          const guardianSnapshot = await db
              .collection("guardians")
              .where("guardianId", "==", registration.guardianId)
              .get();
          
          if (!guardianSnapshot.empty) {
            registration.parent = guardianSnapshot.docs[0].data();
          }
        } catch (guardianError) {
          logger.warn(`Failed to fetch guardian for registration ${registration.id}:`, guardianError);
          registration.parent = null;
        }
      } else {
        registration.parent = null;
      }

      // Only fetch participant data if registrationId exists and is not undefined
      if (registration.registrationId) {
        try {
          const participantSnapshot = await db
              .collection("participants")
              .where("registrationId", "==", registration.registrationId)
              .get();
          
          registration.children = participantSnapshot.docs.map(doc => doc.data());
        } catch (participantError) {
          logger.warn(`Failed to fetch participants for registration ${registration.id}:`, participantError);
          registration.children = [];
        }
      } else {
        registration.children = [];
      }

      registrations.push(registration);
    }

    return {
      success: true,
      registrations,
    };
  } catch (error) {
    logger.error("Error fetching registrations:", error);
    throw new Error("Failed to fetch registrations");
  }
});

// Get all guardians (for admin portal)
export const getGuardians = onCall(async (request) => {
  try {
    const snapshot = await admin.firestore()
        .collection("guardians")
        .orderBy("createdAt", "desc")
        .get();

    const guardians = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: true,
      guardians,
    };
  } catch (error) {
    logger.error("Error fetching guardians:", error);
    throw new Error("Failed to fetch guardians");
  }
});

// Get all participants (for admin portal)
export const getParticipants = onCall(async (request) => {
  try {
    const db = admin.firestore();
    const snapshot = await db
        .collection("participants")
        .orderBy("createdAt", "desc")
        .get();

    const participants = [];

    for (const doc of snapshot.docs) {
      const participant: any = { id: doc.id, ...doc.data() };
      
      // Only fetch guardian data if guardianId exists and is not undefined
      if (participant.guardianId) {
        try {
          const guardianSnapshot = await db
              .collection("guardians")
              .where("guardianId", "==", participant.guardianId)
              .get();
          
          if (!guardianSnapshot.empty) {
            participant.guardian = guardianSnapshot.docs[0].data();
          } else {
            participant.guardian = null;
          }
        } catch (guardianError) {
          logger.warn(`Failed to fetch guardian for participant ${participant.id}:`, guardianError);
          participant.guardian = null;
        }
      } else {
        participant.guardian = null;
      }

      participants.push(participant);
    }

    return {
      success: true,
      participants,
    };
  } catch (error) {
    logger.error("Error fetching participants:", error);
    throw new Error("Failed to fetch participants");
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
          paymentIntentId: paymentIntentId,
          testMode: useTestMode,
          paymentConfirmedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info(`Payment confirmed for registration: ${registrationId}`);

        // Note: Payment confirmation emails are now sent from the frontend for better control
        // This avoids duplicate emails and gives frontend more flexibility

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

// Refund payment
export const refundPayment = onCall(
  { secrets: [stripeSecretKey, stripeTestSecretKey] },
  async (request) => {
    logger.info("Refund payment function called", { data: request.data });
    try {
      const { paymentIntentId, amount, reason, registrationId } = request.data;

      if (!paymentIntentId) {
        throw new Error("Payment intent ID is required");
      }

      if (!registrationId) {
        throw new Error("Registration ID is required");
      }

      // First, get the registration to determine the test mode
      const registrationQuery = admin.firestore()
          .collection("registrations")
          .where("registrationId", "==", registrationId);
      
      const registrationSnapshot = await registrationQuery.get();
      
      if (registrationSnapshot.empty) {
        throw new Error("Registration not found");
      }
      
      const registrationData = registrationSnapshot.docs[0].data();
      const useTestMode = registrationData.testMode === true;
      
      logger.info("Using stored test mode from registration", { 
        registrationId, 
        useTestMode,
        storedTestMode: registrationData.testMode 
      });
      
      // Initialize Stripe with the correct mode
      const stripe = getStripe(useTestMode);
      
      // Create refund with Stripe
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason: reason || 'requested_by_customer',
        metadata: {
          registrationId: registrationId,
          refundedBy: 'admin_portal',
          refundDate: new Date().toISOString(),
        },
      });

      // Mark guardian and participants as inactive using batch operations
      const db = admin.firestore();
      const batch = db.batch();
      const registrationDoc = registrationSnapshot.docs[0];

      // Update registration status
      batch.update(registrationDoc.ref, {
        status: "refunded",
        refundId: refund.id,
        refundAmount: refund.amount / 100, // Convert back to dollars
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
        refundReason: reason || 'requested_by_customer',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Mark guardian as inactive if they exist
      if (registrationData.guardianId) {
        const guardianQuery = db
            .collection("guardians")
            .where("guardianId", "==", registrationData.guardianId);
        
        const guardianSnapshot = await guardianQuery.get();
        if (!guardianSnapshot.empty) {
          const guardianDoc = guardianSnapshot.docs[0];
          batch.update(guardianDoc.ref, {
            active: false,
            inactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
            inactivatedReason: 'registration_refunded',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          logger.info(`Marking guardian ${registrationData.guardianId} as inactive`);
        }
      }

      // Mark all participants as inactive
      const participantsQuery = db
          .collection("participants")
          .where("registrationId", "==", registrationId);
      
      const participantsSnapshot = await participantsQuery.get();
      participantsSnapshot.docs.forEach((participantDoc) => {
        batch.update(participantDoc.ref, {
          active: false,
          inactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
          inactivatedReason: 'registration_refunded',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      
      if (participantsSnapshot.size > 0) {
        logger.info(`Marking ${participantsSnapshot.size} participants as inactive for registration ${registrationId}`);
      }

      // Commit all updates
      await batch.commit();

      logger.info(`Payment refunded for registration: ${registrationId}, Refund ID: ${refund.id}`);
      
      return {
        success: true,
        refundId: refund.id,
        refundAmount: refund.amount / 100,
        status: "refunded"
      };
    } catch (error: any) {
      logger.error("Error processing refund:", error);
      throw new Error(`Failed to process refund: ${error.message}`);
    }
  }
);

// Save registration progress (for incomplete registrations)
export const saveRegistrationProgress = onCall(async (request) => {
  try {
    const { progressData } = request.data;

    if (!progressData) {
      throw new Error("Progress data is required");
    }

    const db = admin.firestore();
    
    // Use email as unique identifier to prevent duplicates
    const userEmail = progressData.parent?.email;
    if (!userEmail) {
      throw new Error("Parent email is required for saving progress");
    }

    // Check if there's already a saved registration for this email
    const existingQuery = await db
        .collection("savedRegistrations")
        .where("parent.email", "==", userEmail)
        .where("status", "==", "incomplete")
        .get();

    let savedRegistrationRef;
    let savedRegistrationId;
    let isUpdate = false;

    if (!existingQuery.empty) {
      // Update existing saved registration
      savedRegistrationRef = existingQuery.docs[0].ref;
      const existingData = existingQuery.docs[0].data();
      savedRegistrationId = existingData.savedRegistrationId;
      isUpdate = true;
      
      logger.info(`Updating existing saved registration: ${savedRegistrationId}`);
    } else {
      // Create new saved registration
      savedRegistrationRef = db.collection("savedRegistrations").doc();
      savedRegistrationId = `SAVED_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      logger.info(`Creating new saved registration: ${savedRegistrationId}`);
    }

    // Calculate estimated total based on children count
    const estimatedTotal = progressData.total || (progressData.children?.length > 1 ? 250 * progressData.children.length : 275);

    const savedRegistrationDoc = {
      savedRegistrationId,
      step: progressData.step || 1,
      parent: progressData.parent || {},
      children: progressData.children || [],
      agreement: progressData.agreement || {},
      total: estimatedTotal,
      participantCount: progressData.children?.length || 0,
      status: "incomplete",
      paymentError: progressData.paymentError || null,
      paymentAttemptedAt: progressData.paymentAttemptedAt || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastAccessedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(isUpdate ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() })
    };

    await savedRegistrationRef.set(savedRegistrationDoc, { merge: isUpdate });

    logger.info(`Registration progress ${isUpdate ? 'updated' : 'saved'} with ID: ${savedRegistrationId}`);

    return {
      success: true,
      savedRegistrationId,
      docId: savedRegistrationRef.id,
      isUpdate,
    };
  } catch (error) {
    logger.error("Error saving registration progress:", error);
    throw new Error("Failed to save registration progress");
  }
});

// Get all saved registrations (for admin portal)
export const getSavedRegistrations = onCall(async (request) => {
  try {
    const db = admin.firestore();
    const snapshot = await db
        .collection("savedRegistrations")
        .where("status", "==", "incomplete")
        .orderBy("updatedAt", "desc")
        .get();

    const savedRegistrations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: true,
      savedRegistrations,
    };
  } catch (error) {
    logger.error("Error fetching saved registrations:", error);
    throw new Error("Failed to fetch saved registrations");
  }
});

// Delete saved registration progress
export const deleteSavedRegistration = onCall(async (request) => {
  try {
    const { savedRegistrationId } = request.data;

    if (!savedRegistrationId) {
      throw new Error("Saved registration ID is required");
    }

    const db = admin.firestore();
    
    // Find and delete the saved registration document
    const query = db
        .collection("savedRegistrations")
        .where("savedRegistrationId", "==", savedRegistrationId);

    const snapshot = await query.get();

    if (snapshot.empty) {
      throw new Error("Saved registration not found");
    }

    const doc = snapshot.docs[0];
    await doc.ref.delete();

    logger.info(`Saved registration deleted: ${savedRegistrationId}`);

    return {
      success: true,
      message: "Saved registration deleted successfully",
    };
  } catch (error: any) {
    logger.error("Error deleting saved registration:", error);
    throw new Error(`Failed to delete saved registration: ${error.message}`);
  }
});

// Delete saved registration progress by email (for start fresh functionality)
export const deleteSavedRegistrationByEmail = onCall(async (request) => {
  try {
    const { email } = request.data;

    if (!email) {
      throw new Error("Email is required");
    }

    const db = admin.firestore();
    
    // Find all saved registrations for this email
    const query = db
        .collection("savedRegistrations")
        .where("parent.email", "==", email)
        .where("status", "==", "incomplete");

    const snapshot = await query.get();

    if (snapshot.empty) {
      logger.info(`No saved registrations found for email: ${email}`);
      return {
        success: true,
        message: "No saved registrations found for this email",
        deletedCount: 0,
      };
    }

    // Delete all found documents using batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    logger.info(`Deleted ${snapshot.size} saved registrations for email: ${email}`);

    return {
      success: true,
      message: "Saved registrations deleted successfully",
      deletedCount: snapshot.size,
    };
  } catch (error: any) {
    logger.error("Error deleting saved registrations by email:", error);
    throw new Error(`Failed to delete saved registrations: ${error.message}`);
  }
});

// Send contact form email
export const sendContactEmail = onCall(
  { secrets: [resendApiKey] },
  async (request) => {
    try {
      const { name, email, phone, subject, message } = request.data;

      // Validate required fields
      if (!name || !email || !subject || !message) {
        throw new Error("Name, email, subject, and message are required");
      }

      // Initialize Resend
      const resend = new Resend(resendApiKey.value());

      // Prepare email content
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5530; border-bottom: 2px solid #2c5530; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>From:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
            <p><strong>Subject:</strong> ${subject}</p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="color: #2c5530;">Message:</h3>
            <div style="background-color: #fff; padding: 15px; border-left: 4px solid #2c5530; margin: 10px 0;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <hr style="margin: 30px 0; border: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This email was sent from the Muslim Youth Retreat 2025 contact form.
          </p>
        </div>
      `;

      // Validate email addresses before sending
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error(`Invalid sender email format: ${email}`);
      }

      // Send email using Resend
      logger.info('Attempting to send email via Resend', {
        from: email,
        to: 'info@muslimyouthretreat.org',
        subject: subject,
        hasMessage: !!message
      });

      const result = await resend.emails.send({
        from: 'MYR Contact Form <inquiry@resend.dev>',
        to: ['info@muslimyouthretreat.org'],
        replyTo: email,
        subject: `Contact Form: ${subject}`,
        html: emailHtml,
      });

      logger.info(`Contact email sent successfully`, { 
        messageId: result.data?.id,
        from: email,
        subject: subject,
        resendResponse: result
      });

      return {
        success: true,
        message: "Email sent successfully",
        messageId: result.data?.id,
      };
    } catch (error: any) {
      logger.error("Error sending contact email:", {
        error: error.message,
        stack: error.stack,
        name: error.name,
        statusCode: error.statusCode,
        resendError: error.response?.data || error.response || error,
        requestData: {
          from: request.data.email,
          to: 'info@muslimyouthretreat.org',
          subject: request.data.subject
        }
      });
      
      // Provide more specific error messages
      if (error.statusCode === 422) {
        throw new Error(`Email validation error: ${error.message}`);
      } else if (error.statusCode === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      } else if (error.statusCode >= 500) {
        throw new Error("Email service temporarily unavailable. Please try again later.");
      } else {
        throw new Error(`Failed to send contact email: ${error.message}`);
      }
    }
  }
);

// Send confirmation email (public cloud function)
export const sendConfirmationEmail = onCall(
  { secrets: [resendApiKey] },
  async (request) => {
    try {
      return await sendConfirmationEmailHelper(request.data);
    } catch (error: any) {
      logger.error("Error in sendConfirmationEmail cloud function:", {
        error: error.message,
        stack: error.stack,
        requestData: request.data
      });
      
      // Provide more specific error messages
      if (error.statusCode === 422) {
        throw new Error(`Email validation error: ${error.message}`);
      } else if (error.statusCode === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      } else if (error.statusCode >= 500) {
        throw new Error("Email service temporarily unavailable. Please try again later.");
      } else {
        throw new Error(`Failed to send confirmation email: ${error.message}`);
      }
    }
  }
);

// Delete registration and all related documents
export const deleteRegistration = onCall(async (request) => {
  logger.info("Delete registration function called", { data: request.data });
  try {
    const { registrationId } = request.data;

    if (!registrationId) {
      throw new Error("Registration ID is required");
    }

    const db = admin.firestore();
    const batch = db.batch();

    // Find the registration document
    const registrationQuery = db
        .collection("registrations")
        .where("registrationId", "==", registrationId);
    
    const registrationSnapshot = await registrationQuery.get();

    if (registrationSnapshot.empty) {
      throw new Error("Registration not found");
    }

    const registrationDoc = registrationSnapshot.docs[0];
    const registrationData = registrationDoc.data();
    
    // Delete the registration document
    batch.delete(registrationDoc.ref);

    // Delete all participants associated with this registration
    const participantsQuery = db
        .collection("participants")
        .where("registrationId", "==", registrationId);
    
    const participantsSnapshot = await participantsQuery.get();
    participantsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete the guardian if they have no other participants
    if (registrationData.guardianId) {
      // Check if this guardian has other participants not in this registration
      const otherParticipantsQuery = db
          .collection("participants")
          .where("guardianId", "==", registrationData.guardianId);
      
      const otherParticipantsSnapshot = await otherParticipantsQuery.get();
      
      // Filter out participants that belong to the registration being deleted
      const remainingParticipants = otherParticipantsSnapshot.docs.filter(
        doc => doc.data().registrationId !== registrationId
      );

      if (remainingParticipants.length === 0) {
        // No other participants, safe to delete guardian
        const guardianQuery = db
            .collection("guardians")
            .where("guardianId", "==", registrationData.guardianId);
        
        const guardianSnapshot = await guardianQuery.get();
        guardianSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
      }
    }

    // Commit all deletions
    await batch.commit();

    logger.info(`Registration ${registrationId} and all related documents deleted successfully`);

    return {
      success: true,
      message: "Registration and all related documents deleted successfully",
      deletedRegistrationId: registrationId,
    };
  } catch (error: any) {
    logger.error("Error deleting registration:", error);
    throw new Error(`Failed to delete registration: ${error.message}`);
  }
});
