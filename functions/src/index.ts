import {onRequest, onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
const Stripe = require("stripe");
const cors = require("cors");
const { Resend } = require("resend");
const { jsPDF } = require("jspdf");
const JSZip = require("jszip");
const { getStorage } = require("firebase-admin/storage");

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
  registrationData?: any;
}) => {
  const {
    recipientEmail,
    recipientName,
    registrationId,
    children,
    eventDate = "Friday Dec 05, 2025, 4:00 PM – Sunday Dec 07, 2025, 4:00 PM",
    location = "Florida Elks Youth Camp, 24175 SE Hwy 450, Umatilla, FL 32784, USA",
    total,
    type = "registration",
    registrationData
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
          <div><strong>DOB:</strong> ${child.dateOfBirth || child.age || 'N/A'}</div>
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

          <!-- Personal Message from Team -->
          <div style="background: linear-gradient(135deg, rgba(238, 181, 65, 0.1) 0%, rgba(85, 124, 186, 0.1) 100%); padding: 32px; border-radius: 20px; margin-bottom: 32px; border: 1px solid rgba(238, 181, 65, 0.2);">
            <div style="text-align: center; margin-bottom: 24px;">
              <h3 style="margin: 0; color: #1f2937; font-size: 20px; font-weight: 700; display: flex; align-items: center; justify-content: center;">
                Message from the Team
              </h3>
            </div>
            <div style="background: rgba(255, 255, 255, 0.7); padding: 24px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.3);">
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.7; font-style: italic;">
                "Salam Alaykum,
              </p>
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.7;">
                Thank you for successfully submitting your registration for the Muslim Youth Retreat 2025.
              </p>
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.7;">
                ${type === 'payment' ? 
                  'Your payment has been completed and you are all set! We look forward to seeing you at the retreat.' :
                  'If you\'ve completed your payment already, then you are all set! Please note, registration is not complete until payment is made in full.'
                }
              </p>
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.7;">
                For any questions, or to request alternate payment options, you may contact us at 
                <a href="mailto:info@muslimyouthretreat.org" style="color: #EEB541; text-decoration: none; font-weight: 600;">info@muslimyouthretreat.org</a>
              </p>
              <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.7; font-weight: 600;">
                Sincerely,<br>
                The Muslim Youth Retreat Team"
              </p>
            </div>
          </div>

          ${registrationId ? `
          <!-- Registration Details -->
          <div style="background: linear-gradient(135deg, rgba(85, 124, 186, 0.1) 0%, rgba(238, 181, 65, 0.1) 100%); padding: 32px; border-radius: 20px; margin-bottom: 32px; border: 1px solid rgba(85, 124, 186, 0.2);">
            <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 700; display: flex; align-items: center;">
              <span style="background: linear-gradient(135deg, #557CBA 0%, #4A6BA8 100%); color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
              </span>
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

          <!-- Parent/Guardian Information -->
          <div style="margin-bottom: 32px;">
            <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 700; display: flex; align-items: center;">
              <span style="background: linear-gradient(135deg, #557CBA 0%, #4A6BA8 100%); color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </span>
              Parent/Guardian Information
            </h3>
            <div style="background: rgba(85, 124, 186, 0.1); padding: 20px; border-radius: 12px; margin-bottom: 16px;">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; font-size: 14px; color: #4b5563;">
                <div><strong>Name:</strong> ${recipientName}</div>
                <div><strong>Email:</strong> ${recipientEmail}</div>
                ${registrationData?.parent?.phone ? `<div><strong>Phone:</strong> ${registrationData.parent.phone}</div>` : ''}
                ${registrationData?.parent?.address ? `<div style="grid-column: 1 / -1;"><strong>Address:</strong> ${registrationData.parent.address}${registrationData.parent.apartment ? `, ${registrationData.parent.apartment}` : ''}</div>` : ''}
                ${registrationData?.parent?.city && registrationData?.parent?.state ? `<div><strong>City, State:</strong> ${registrationData.parent.city}, ${registrationData.parent.state} ${registrationData.parent.zipCode || ''}</div>` : ''}
                ${registrationData?.parent?.country ? `<div><strong>Country:</strong> ${registrationData.parent.country}</div>` : ''}
              </div>
            </div>
          </div>

          ${participantsList ? `
          <!-- Participants -->
          <div style="margin-bottom: 32px;">
            <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 700; display: flex; align-items: center;">
              <span style="background: linear-gradient(135deg, #EEB541 0%, #D4A43A 100%); color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </span>
              Registered Participants
            </h3>
            ${participantsList}
          </div>
          ` : ''}

          <!-- Emergency Contact Information -->
          ${registrationData?.emergencyContact ? `
          <div style="margin-bottom: 32px;">
            <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 700; display: flex; align-items: center;">
              <span style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </span>
              Emergency Contact Information
            </h3>
            <div style="background: rgba(220, 38, 38, 0.1); padding: 20px; border-radius: 12px; margin-bottom: 16px;">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; font-size: 14px; color: #4b5563;">
                ${registrationData.emergencyContact.name ? `<div><strong>Name:</strong> ${registrationData.emergencyContact.name}</div>` : ''}
                ${registrationData.emergencyContact.phone ? `<div><strong>Phone:</strong> ${registrationData.emergencyContact.phone}</div>` : ''}
                ${registrationData.emergencyContact.relationship ? `<div><strong>Relationship:</strong> ${registrationData.emergencyContact.relationship}</div>` : ''}
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Agreement Status -->
          ${registrationData?.agreement ? `
          <div style="margin-bottom: 32px;">
            <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 700; display: flex; align-items: center;">
              <span style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 12l2 2 4-4"></path>
                  <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.4 0 2.73.32 3.91.9"></path>
                </svg>
              </span>
              Agreements & Waivers Status
            </h3>
            <div style="background: rgba(5, 150, 105, 0.1); padding: 20px; border-radius: 12px; margin-bottom: 16px;">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px; font-size: 14px; color: #4b5563;">
                <div><strong>Informed Consent:</strong> <span style="color: ${registrationData.agreement.informedConsent ? '#059669' : '#dc2626'}; font-weight: 600;">${registrationData.agreement.informedConsent ? '✓ Agreed' : '✗ Not Agreed'}</span></div>
                <div><strong>Medical Release:</strong> <span style="color: ${registrationData.agreement.medicalRelease ? '#059669' : '#dc2626'}; font-weight: 600;">${registrationData.agreement.medicalRelease ? '✓ Agreed' : '✗ Not Agreed'}</span></div>
                <div style="grid-column: 1 / -1;"><strong>Electronic Signature:</strong> <span style="color: #059669; font-weight: 600;">${registrationData.signature ? '✓ Provided' : '✗ Not Provided'}</span></div>
              </div>
            </div>
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


          <!-- Contact Information -->
          <div style="text-align: center; padding: 32px 0; border-top: 1px solid #e5e7eb;">
            <h4 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px; font-weight: 600;">
              Questions? We're here to help!
            </h4>
            <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 16px;">
              Contact us at <a href="mailto:info@muslimyouthretreat.org" style="color: #EEB541; text-decoration: none; font-weight: 600;">info@muslimyouthretreat.org</a>
            </p>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              We can't wait to see you at the retreat!
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
              Hosted by WISE Academy
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
    from: 'Muslim Youth Retreat <registration@muslimyouthretreat.org>',
    to: [recipientEmail],
    replyTo: 'info@muslimyouthretreat.org',
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
export const saveRegistration = onCall(
  { 
    memory: "512MiB",
    timeoutSeconds: 120
  },
  async (request) => {
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

    // Clean children data first to prevent undefined values
    const cleanChildren = registrationData.children?.map((child: any) => ({
      name: child.name || '',
      dateOfBirth: child.dateOfBirth || child.age || null,
      gender: child.gender || '',
      grade: child.grade || '',
      dietary: child.dietary || '',
      medical: child.medical || '',
      // Keep old emergency contact fields for backward compatibility
      emergencyContact: child.emergencyContact || '',
      emergencyPhone: child.emergencyPhone || ''
    })) || [];

    // Generate participant IDs first
    const participantIds: string[] = [];
    for (let i = 0; i < cleanChildren.length; i++) {
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
      participantCount: cleanChildren.length,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    batch.set(guardianRef, guardianDoc);

    // Create participant documents
    for (let i = 0; i < cleanChildren.length; i++) {
      const child = cleanChildren[i];
      const participantRef = db.collection("participants").doc();
      const participantId = participantIds[i];
      
      const participantDoc = {
        participantId,
        registrationId,
        guardianId: guardianDoc.guardianId,
        name: child.name,
        dateOfBirth: child.dateOfBirth || (child.age ? parseInt(child.age) : null),
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

    // Generate waiver PDF (optional - registration continues even if this fails)
    let waiverPdfUrl = null;
    let waiverFileName = null;
    
    // Only attempt PDF generation if we have the required data
    if (registrationData.agreement && registrationData.signature) {
      try {
        logger.info(`Generating waiver PDF for registration: ${registrationId}`);
        
        // Create the PDF with all registration data
        const pdfResult = await generateWaiverPDFHelper({
          registrationId,
          registrationData: {
            parent: registrationData.parent,
            children: registrationData.children,
            agreement: registrationData.agreement,
            emergencyContact: registrationData.emergencyContact,
            signature: registrationData.signature
          }
        });
        
        waiverPdfUrl = pdfResult.publicUrl;
        waiverFileName = pdfResult.fileName;
        
        logger.info(`Waiver PDF generated successfully: ${waiverFileName}`);
      } catch (pdfError) {
        logger.error("Failed to generate waiver PDF (registration will continue):", pdfError);
        // Explicitly set to null to ensure registration continues
        waiverPdfUrl = null;
        waiverFileName = null;
      }
    } else {
      logger.info("Skipping PDF generation - missing agreement or signature data");
    }

    // Handle backward compatibility for old form structure  
    // Clean up data to prevent undefined values in Firestore (v2)
    const cleanEmergencyContact = registrationData.emergencyContact ? {
      name: registrationData.emergencyContact.name || '',
      phone: registrationData.emergencyContact.phone || '',
      relationship: registrationData.emergencyContact.relationship || ''
    } : {
      // For old registrations, use the first child's emergency contact if available
      name: registrationData.children?.[0]?.emergencyContact || '',
      phone: registrationData.children?.[0]?.emergencyPhone || '',
      relationship: 'Not specified'
    };


    // Create or update main registration document
    const registrationDoc = {
      registrationId,
      paymentIntentId: paymentIntentId || null,
      guardianId: guardianDoc.guardianId,
      participantIds,
      participantCount: cleanChildren.length,
      parent: registrationData.parent,
      children: cleanChildren,
      agreement: registrationData.agreement || {},
      emergencyContact: cleanEmergencyContact,
      signature: registrationData.signature || '',
      waiverPdf: {
        fileName: waiverFileName || null,
        publicUrl: waiverPdfUrl || null,
        generatedAt: waiverPdfUrl ? admin.firestore.FieldValue.serverTimestamp() : null
      },
      total: registrationData.total,
      status: paymentIntentId ? "paid" : "pending",
      step: 5, // Updated for new step count
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
  } catch (error: any) {
    logger.error("Error saving registration:", {
      error: error.message,
      stack: error.stack,
      requestData: request.data
    });
    throw new Error(`Failed to save registration: ${error.message}`);
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
        from: 'MYR Contact Form <inquiry@muslimyouthretreat.org>',
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

// Helper function to generate waiver PDF (can be called internally)
const generateWaiverPDFHelper = async (data: {
  registrationId: string;
  registrationData: any;
}) => {
  const { registrationId, registrationData } = data;

  if (!registrationId || !registrationData) {
    throw new Error("Registration ID and data are required");
  }

  try {

  // Create PDF using jsPDF (professional legal document style)
  const doc = new jsPDF();
  
  // Set professional font and black text
  doc.setFont("times", "normal");
  doc.setTextColor(0, 0, 0); // Black text for legal documents
  
  // Header - Professional legal document style
  doc.setFontSize(18);
  doc.setFont("times", "bold");
  doc.text('MUSLIM YOUTH RETREAT 2025', 105, 25, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont("times", "normal");
  doc.text('REGISTRATION WAIVER AND AGREEMENT', 105, 35, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Document Generated: ${new Date().toLocaleDateString()}`, 105, 45, { align: 'center' });
  
  // Draw professional line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(20, 50, 190, 50);
  
  let yPos = 60;
  
  // Registration Information Section
  doc.setFontSize(12);
  doc.setFont("times", "bold");
  doc.text('REGISTRATION INFORMATION', 20, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont("times", "normal");
  doc.text(`Registration ID: ${registrationId}`, 20, yPos);
  doc.text(`Registration Date: ${new Date().toLocaleDateString()}`, 20, yPos + 6);
  yPos += 20;
  
  // Parent Information Section
  doc.setFontSize(12);
  doc.setFont("times", "bold");
  doc.text('PARENT/GUARDIAN INFORMATION', 20, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont("times", "normal");
  doc.text(`Name: ${registrationData.parent?.name || '_________________________'}`, 20, yPos);
  doc.text(`Email: ${registrationData.parent?.email || '_________________________'}`, 20, yPos + 6);
  doc.text(`Phone: ${registrationData.parent?.phone || '_________________________'}`, 20, yPos + 12);
  
  const address = `${registrationData.parent?.address || ''} ${registrationData.parent?.apartment || ''}`.trim();
  const cityState = `${registrationData.parent?.city || ''}, ${registrationData.parent?.state || ''} ${registrationData.parent?.zipCode || ''}`.trim();
  doc.text(`Address: ${address || '_________________________'}`, 20, yPos + 18);
  doc.text(`City, State, ZIP: ${cityState !== ', ' ? cityState : '_________________________'}`, 20, yPos + 24);
  doc.text(`Country: ${registrationData.parent?.country || '_________________________'}`, 20, yPos + 30);
  yPos += 45;
  
  // Emergency Contact Section
  doc.setFontSize(12);
  doc.setFont("times", "bold");
  doc.text('EMERGENCY CONTACT INFORMATION', 20, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont("times", "normal");
  doc.text(`Name: ${registrationData.emergencyContact?.name || '_________________________'}`, 20, yPos);
  doc.text(`Phone: ${registrationData.emergencyContact?.phone || '_________________________'}`, 20, yPos + 6);
  doc.text(`Relationship: ${registrationData.emergencyContact?.relationship || '_________________________'}`, 20, yPos + 12);
  yPos += 25;
  
  // Participants Section
  doc.setFontSize(12);
  doc.setFont("times", "bold");
  doc.text('PARTICIPANT INFORMATION', 20, yPos);
  yPos += 8;
  
  registrationData.children?.forEach((child: any, index: number) => {
    doc.setFontSize(11);
    doc.setFont("times", "bold");
    doc.text(`Participant ${index + 1}:`, 20, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setFont("times", "normal");
    doc.text(`Name: ${child.name || '_________________________'}`, 25, yPos);
    doc.text(`Date of Birth: ${child.dateOfBirth || child.age || '_________________________'}`, 25, yPos + 6);
    doc.text(`Gender: ${child.gender || '_________________________'}`, 25, yPos + 12);
    doc.text(`Grade: ${child.grade || '_________________________'}`, 25, yPos + 18);
    doc.text(`Dietary Restrictions: ${child.dietary || 'None specified'}`, 25, yPos + 24);
    if (child.medical) {
      doc.text(`Medical Information: ${child.medical}`, 25, yPos + 30);
      yPos += 40;
    } else {
      doc.text('Medical Information: None specified', 25, yPos + 30);
      yPos += 40;
    }
    yPos += 8;
  });
  
  // Check if we need a new page
  if (yPos > 220) {
    doc.addPage();
    yPos = 30;
  }
  
  // Informed Consent Section
  doc.setFontSize(12);
  doc.setFont("times", "bold");
  doc.text('INFORMED CONSENT AND ACKNOWLEDGEMENT', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(9);
  doc.setFont("times", "normal");
  const consentText = doc.splitTextToSize(
    'I hereby give my approval for my child\'s participation in any and all activities prepared by WISE Academy during the selected camp. In exchange for the acceptance of said child, I assume all risk and hazards incidental to the conduct of the activities, and release, absolve and hold harmless WISE Academy, the organizers and all their respective officers, agents, and representatives from any and all liability for injuries to said child arising out of traveling to, participating in, or returning from selected camp sessions.',
    170
  );
  doc.text(consentText, 20, yPos);
  yPos += consentText.length * 3 + 20; // Increased spacing from 8 to 20
  
  // Consent checkbox
  doc.setFontSize(10);
  doc.setFont("times", "bold");
  if (registrationData.agreement?.informedConsent) {
    doc.text('[X] I CONSENT', 20, yPos);
    doc.text('[ ] I DO NOT CONSENT', 100, yPos);
  } else {
    doc.text('[ ] I CONSENT', 20, yPos);
    doc.text('[X] I DO NOT CONSENT', 100, yPos);
  }
  yPos += 25; // Increased spacing after checkboxes
  
  // Medical Release (add new page if needed)
  if (yPos > 180) {
    doc.addPage();
    yPos = 30;
  }
  
  doc.setFontSize(12);
  doc.setFont("times", "bold");
  doc.text('MEDICAL RELEASE AND AUTHORIZATION', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(9);
  doc.setFont("times", "normal");
  const medicalText = doc.splitTextToSize(
    'As Parent and/or Guardian of the named child, I hereby authorize the diagnosis and treatment by a qualified and licensed medical professional, of the minor child, in the event of a medical emergency, which in the opinion of the attending medical professional, requires immediate attention to prevent further endangerment of the minor\'s life, physical disfigurement, physical impairment, or other undue pain, suffering or discomfort, if delayed. Permission is hereby granted to the attending physician to proceed with any medical or minor surgical treatment, x-ray examination and immunizations for the named child. In the event of an emergency arising out of serious illness, the need for major surgery, or significant accidental injury, I understand that every attempt will be made by the attending physician to contact me in the most expeditious way possible. This authorization is granted only after a reasonable effort has been made to reach me. Permission is also granted to WISE Academy, the organizers and its affiliates including Facilitators, Volunteers, and Camp Staff to provide the needed emergency treatment prior to the child\'s admission to the medical facility. Release authorized on the dates and/or duration of the camp sessions. This release is authorized and executed of my own free will, with the sole purpose of authorizing medical treatment under emergency circumstances, for the protection of life and limb of the named minor child, in my absence.',
    170
  );
  doc.text(medicalText, 20, yPos);
  yPos += medicalText.length * 3 + 20; // Increased spacing from 8 to 20
  
  // Medical consent checkbox
  doc.setFontSize(10);
  doc.setFont("times", "bold");
  if (registrationData.agreement?.medicalRelease) {
    doc.text('[X] I CONSENT', 20, yPos);
    doc.text('[ ] I DO NOT CONSENT', 100, yPos);
  } else {
    doc.text('[ ] I CONSENT', 20, yPos);
    doc.text('[X] I DO NOT CONSENT', 100, yPos);
  }
  yPos += 25; // Increased spacing after checkboxes
  
  // Signature section
  doc.setFontSize(12);
  doc.setFont("times", "bold");
  doc.text('ELECTRONIC SIGNATURE CONFIRMATION', 20, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont("times", "normal");
  doc.text('BY ACKNOWLEDGING AND SIGNING BELOW, I AM DELIVERING AN ELECTRONIC SIGNATURE', 20, yPos);
  doc.text('THAT WILL HAVE THE SAME EFFECT AS AN ORIGINAL MANUAL PAPER SIGNATURE.', 20, yPos + 6);
  doc.text('THE ELECTRONIC SIGNATURE WILL BE EQUALLY AS BINDING AS AN ORIGINAL', 20, yPos + 12);
  doc.text('MANUAL PAPER SIGNATURE.', 20, yPos + 18);
  yPos += 30;
  
  doc.text(`Parent/Guardian Name: ${registrationData.parent?.name || '_________________________'}`, 20, yPos);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos + 8);
  yPos += 20;
  
  // Add actual signature image if provided
  if (registrationData.signature && registrationData.signature.startsWith('data:image/')) {
    try {
      doc.text('Parent/Guardian Signature:', 20, yPos);
      yPos += 8;
      
      // Add the signature image
      doc.addImage(registrationData.signature, 'PNG', 20, yPos, 80, 25);
      yPos += 35;
      
      doc.setFontSize(8);
      doc.text('(Electronic Signature)', 20, yPos);
      yPos += 10;
    } catch (signatureError) {
      logger.warn('Failed to add signature image to PDF:', signatureError);
      doc.text('Signature: [Electronic signature provided but could not be embedded]', 20, yPos);
      yPos += 15;
    }
  } else {
    doc.text('Signature: ___________________________________', 20, yPos);
    doc.setFontSize(8);
    doc.text('(No electronic signature provided)', 20, yPos + 8);
    yPos += 20;
  }
  
  // Professional Footer
  // Add new page if needed for footer
  if (yPos > 250) {
    doc.addPage();
    yPos = 30;
  }
  
  yPos += 15;
  doc.setFontSize(8);
  doc.setFont("times", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text('This document was generated electronically by the Muslim Youth Retreat 2025 registration system.', 20, yPos);
  doc.text(`Document generated on: ${new Date().toLocaleString()}`, 20, yPos + 6);
  doc.text('For questions, contact: info@muslimyouthretreat.org', 20, yPos + 12);
  
  // Add page numbers
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
  }
  
  // Generate PDF buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Store PDF in Firebase Storage
    const bucket = getStorage().bucket();
    const fileName = `waivers/${registrationId}_waiver_${Date.now()}.pdf`;
    const file = bucket.file(fileName);

    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          registrationId: registrationId,
          parentName: registrationData.parent?.name || 'Unknown',
          generatedAt: new Date().toISOString()
        }
      }
    });

    // Make the file publicly accessible for download
    await file.makePublic();

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    logger.info(`Waiver PDF generated and stored: ${fileName}`);

    return {
      success: true,
      fileName: fileName,
      publicUrl: publicUrl,
      message: "Waiver PDF generated and stored successfully"
    };

  } catch (error: any) {
    logger.error("Error generating waiver PDF:", error);
    throw new Error(`Failed to generate waiver PDF: ${error.message}`);
  }
};

// Generate and store waiver PDF (public cloud function)
export const generateWaiverPDF = onCall(
  { 
    memory: "512MiB",
    timeoutSeconds: 120
  },
  async (request) => {
  try {
    return await generateWaiverPDFHelper(request.data);
  } catch (error: any) {
    logger.error("Error in generateWaiverPDF cloud function:", error);
    throw new Error(`Failed to generate waiver PDF: ${error.message}`);
  }
});

// Get all waivers (for admin portal)
export const getWaivers = onCall(async (request) => {
  try {
    const db = admin.firestore();
    
    // Get all registrations first, then filter for those with waivers
    const snapshot = await db
        .collection("registrations")
        .orderBy("createdAt", "desc")
        .get();

    const waivers = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        
        // Only include registrations that have waiver PDFs
        if (!data.waiverPdf?.publicUrl) {
          return null;
        }
        
        return {
          id: doc.id,
          registrationId: data.registrationId,
          parentName: data.parent?.name,
          parentEmail: data.parent?.email,
          participantCount: data.participantCount,
          waiverPdf: data.waiverPdf,
          status: data.status,
          createdAt: data.createdAt,
          children: data.children?.map((child: any) => ({
            name: child.name,
            dateOfBirth: child.dateOfBirth || child.age,
            gender: child.gender
          })) || []
        };
      })
      .filter(waiver => waiver !== null); // Remove null entries

    logger.info(`Found ${waivers.length} waivers out of ${snapshot.docs.length} registrations`);

    return {
      success: true,
      waivers,
    };
  } catch (error: any) {
    logger.error("Error fetching waivers:", {
      error: error.message,
      stack: error.stack
    });
    throw new Error(`Failed to fetch waivers: ${error.message}`);
  }
});

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

// Download all waivers as ZIP
export const downloadAllWaivers = onCall({
  memory: "512MiB",
  timeoutSeconds: 120,
  cors: true
}, async (request) => {
  try {
    const db = admin.firestore();
    const bucket = getStorage().bucket();

    // Fetch all registrations with waiver PDFs
    const registrationsSnapshot = await db.collection('registrations').get();
    const waivers = registrationsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as any))
      .filter((registration: any) => registration.waiverPdf?.publicUrl);

    if (waivers.length === 0) {
      throw new Error("No waivers found");
    }

    // Create a new JSZip instance
    const zip = new JSZip();

    // Download each PDF and add to ZIP
    for (const waiver of waivers) {
      try {
        const fileName = (waiver as any).waiverPdf.fileName || `waiver-${waiver.id}.pdf`;
        const file = bucket.file(fileName);
        
        // Download the file
        const [fileBuffer] = await file.download();
        
        // Add to ZIP with a descriptive name
        const parentName = (waiver as any).parent?.name || 'Unknown';
        const zipFileName = `${parentName.replace(/[^a-zA-Z0-9]/g, '_')}_waiver_${waiver.id}.pdf`;
        zip.file(zipFileName, fileBuffer);
        
        logger.info(`Added ${zipFileName} to ZIP`);
      } catch (fileError) {
        logger.warn(`Failed to add waiver ${waiver.id} to ZIP:`, fileError);
        // Continue with other files even if one fails
      }
    }

    // Generate the ZIP file
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    
    // Upload ZIP to Firebase Storage
    const zipFileName = `waivers_export_${new Date().toISOString().split('T')[0]}.zip`;
    const zipFile = bucket.file(`exports/${zipFileName}`);
    
    await zipFile.save(zipBuffer, {
      metadata: {
        contentType: 'application/zip',
        metadata: {
          generatedAt: new Date().toISOString(),
          waiverCount: waivers.length.toString()
        }
      }
    });

    // Make the file publicly accessible
    await zipFile.makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/exports/${zipFileName}`;

    logger.info(`ZIP file created successfully: ${publicUrl}`);

    return {
      success: true,
      downloadUrl: publicUrl,
      fileName: zipFileName,
      waiverCount: waivers.length,
      message: `ZIP file created with ${waivers.length} waivers`
    };

  } catch (error: any) {
    logger.error("Error creating waivers ZIP:", error);
    return {
      success: false,
      error: error.message,
    };
    throw new Error(`Failed to create waivers ZIP: ${error.message}`);
  }
});

// Get registration settings (for admin portal and registration page)
export const getRegistrationSettings = onCall(async (request) => {
  try {
    const db = admin.firestore();
    
    // Get the settings document
    const settingsRef = db.collection("settings").doc("registration");
    const settingsDoc = await settingsRef.get();
    
    if (!settingsDoc.exists) {
      // Return default settings if none exist
      return {
        success: true,
        settings: {
          enabled: true,
          message: "Registration is currently unavailable. Please check back later."
        }
      };
    }
    
    return {
      success: true,
      settings: settingsDoc.data()
    };
  } catch (error: any) {
    logger.error("Error getting registration settings:", error);
    throw new Error(`Failed to get registration settings: ${error.message}`);
  }
});

// Update registration settings (for admin portal)
export const updateRegistrationSettings = onCall(async (request) => {
  try {
    const { enabled, message } = request.data;
    
    if (typeof enabled !== 'boolean') {
      throw new Error("Enabled must be a boolean value");
    }
    
    if (!message || typeof message !== 'string') {
      throw new Error("Message must be a non-empty string");
    }
    
    const db = admin.firestore();
    
    // Update the settings document
    const settingsRef = db.collection("settings").doc("registration");
    await settingsRef.set({
      enabled: enabled,
      message: message,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    logger.info(`Registration settings updated: enabled=${enabled}, message="${message}"`);
    
    return {
      success: true,
      message: "Registration settings updated successfully"
    };
  } catch (error: any) {
    logger.error("Error updating registration settings:", error);
    throw new Error(`Failed to update registration settings: ${error.message}`);
  }
});

// Bulk delete registrations (for admin portal)
export const bulkDeleteRegistrations = onCall(async (request) => {
  logger.info("Bulk delete registrations function called", { data: request.data });
  try {
    const { registrationIds } = request.data;
    
    if (!registrationIds || !Array.isArray(registrationIds) || registrationIds.length === 0) {
      throw new Error("Registration IDs array is required and must not be empty");
    }
    
    const db = admin.firestore();
    let deletedCount = 0;
    
    // Process deletions in batches to avoid Firestore limits
    const batchSize = 10; // Firestore batch limit is 500, but we'll be conservative
    
    for (let i = 0; i < registrationIds.length; i += batchSize) {
      const batch = db.batch();
      const batchIds = registrationIds.slice(i, i + batchSize);
      
      for (const registrationId of batchIds) {
        try {
          // Find the registration document
          const registrationQuery = db
              .collection("registrations")
              .where("registrationId", "==", registrationId);
          
          const registrationSnapshot = await registrationQuery.get();
          
          if (registrationSnapshot.empty) {
            logger.warn(`Registration not found: ${registrationId}`);
            continue;
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
          
          // Check if we should delete the guardian
          if (registrationData.guardianId) {
            // Check if this guardian has other participants not in the registrations being deleted
            const otherParticipantsQuery = db
                .collection("participants")
                .where("guardianId", "==", registrationData.guardianId);
            
            const otherParticipantsSnapshot = await otherParticipantsQuery.get();
            
            // Filter out participants that belong to registrations being deleted
            const remainingParticipants = otherParticipantsSnapshot.docs.filter(
              doc => !registrationIds.includes(doc.data().registrationId)
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
          
          deletedCount++;
        } catch (error: any) {
          logger.error(`Error processing registration ${registrationId}:`, error);
          // Continue with other registrations even if one fails
        }
      }
      
      // Commit this batch if it has operations
      try {
        await batch.commit();
        logger.info(`Committed batch ${Math.floor(i / batchSize) + 1}, processed ${batchIds.length} registrations`);
      } catch (batchError: any) {
        if (batchError.message && batchError.message.includes('batch is empty')) {
          logger.info(`Batch ${Math.floor(i / batchSize) + 1} was empty, skipping commit`);
        } else {
          throw batchError;
        }
      }
    }
    
    logger.info(`Bulk delete completed: ${deletedCount} registrations deleted out of ${registrationIds.length} requested`);
    
    return {
      success: true,
      message: `${deletedCount} registrations deleted successfully`,
      deletedCount: deletedCount,
      requestedCount: registrationIds.length
    };
  } catch (error: any) {
    logger.error("Error bulk deleting registrations:", error);
    throw new Error(`Failed to bulk delete registrations: ${error.message}`);
  }
});
