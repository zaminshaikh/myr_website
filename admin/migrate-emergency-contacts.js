const admin = require('firebase-admin');
const serviceAccount = require('./myr-website-firebase-adminsdk-fbsvc-552d052115.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateEmergencyContacts() {
  console.log('Starting emergency contact migration...\n');
  
  try {
    // Get all participants
    const participantsSnapshot = await db.collection('participants').get();
    console.log(`Found ${participantsSnapshot.size} participant documents\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const batch = db.batch();
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500;
    
    for (const participantDoc of participantsSnapshot.docs) {
      const participant = participantDoc.data();
      const participantId = participant.participantId;
      const registrationId = participant.registrationId;
      
      console.log(`Processing participant: ${participant.name} (${participantId})`);
      
      // Check if emergency contact is already populated with relation
      if (participant.emergencyContact?.name && 
          participant.emergencyContact?.phone && 
          participant.emergencyContact?.relation) {
        console.log(`  ✓ Already has complete emergency contact info (skipping)\n`);
        skippedCount++;
        continue;
      }
      
      if (!registrationId) {
        console.log(`  ✗ No registration ID found (skipping)\n`);
        errorCount++;
        continue;
      }
      
      try {
        // Find the registration document
        const registrationSnapshot = await db
          .collection('registrations')
          .where('registrationId', '==', registrationId)
          .limit(1)
          .get();
        
        if (registrationSnapshot.empty) {
          console.log(`  ✗ Registration document not found: ${registrationId} (skipping)\n`);
          errorCount++;
          continue;
        }
        
        const registration = registrationSnapshot.docs[0].data();
        const emergencyContact = registration.emergencyContact;
        
        if (!emergencyContact) {
          console.log(`  ✗ No emergency contact in registration (skipping)\n`);
          errorCount++;
          continue;
        }
        
        // Update the participant with emergency contact info
        const updatedEmergencyContact = {
          name: emergencyContact.name || participant.emergencyContact?.name || "",
          phone: emergencyContact.phone || participant.emergencyContact?.phone || "",
          relation: emergencyContact.relationship || emergencyContact.relation || "",
        };
        
        batch.update(participantDoc.ref, {
          emergencyContact: updatedEmergencyContact,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`  ✓ Will update with:`);
        console.log(`    Name: ${updatedEmergencyContact.name}`);
        console.log(`    Phone: ${updatedEmergencyContact.phone}`);
        console.log(`    Relation: ${updatedEmergencyContact.relation}\n`);
        
        updatedCount++;
        batchCount++;
        
        // Commit batch if we hit the limit
        if (batchCount >= MAX_BATCH_SIZE) {
          console.log(`Committing batch of ${batchCount} updates...\n`);
          await batch.commit();
          batchCount = 0;
        }
        
      } catch (error) {
        console.log(`  ✗ Error processing participant: ${error.message}\n`);
        errorCount++;
      }
    }
    
    // Commit any remaining updates
    if (batchCount > 0) {
      console.log(`Committing final batch of ${batchCount} updates...\n`);
      await batch.commit();
    }
    
    console.log('\n=================================');
    console.log('Migration completed!');
    console.log('=================================');
    console.log(`Total participants: ${participantsSnapshot.size}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped (already complete): ${skippedCount}`);
    console.log(`Errors/Skipped: ${errorCount}`);
    console.log('=================================\n');
    
  } catch (error) {
    console.error('Fatal error during migration:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the migration
migrateEmergencyContacts();

