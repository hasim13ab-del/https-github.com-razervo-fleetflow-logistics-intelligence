/**
 * PURGE DEV DATA SCRIPT
 * ======================
 * Safely deletes all 'users', 'hubs', and 'organizations' documents
 * from Firestore, and resets the 'counters' collection to base values.
 * 
 * Prerequisites:
 *   1. npm install firebase-admin
 *   2. Download a Firebase Service Account JSON key from:
 *      Project Settings > Service accounts > Generate new private key
 *      Save as: serviceAccountKey.json in project root
 *   3. Run: npx tsx scripts/purge-dev-data.ts
 * 
 * SAFETY: This script ONLY targets dev collections. It does NOT touch
 * attendance, kpi, shipments, alerts, or system config.
 */

import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Load service account
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('ERROR: serviceAccountKey.json not found in project root.');
    console.error('Download it from Firebase Console > Project Settings > Service accounts');
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const batchSize = 500; // Firestore batch limit

async function deleteCollection(collectionPath: string): Promise<number> {
    let deletedCount = 0;
    console.log(`\n--- Purging collection: ${collectionPath} ---`);

    while (true) {
        const snapshot = await db
            .collection(collectionPath)
            .limit(batchSize)
            .get();

        if (snapshot.empty) {
            console.log(`  ✓ ${collectionPath} is empty. Total deleted: ${deletedCount}`);
            break;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        deletedCount += snapshot.size;
        console.log(`  Deleted ${deletedCount} documents from ${collectionPath}...`);
    }

    return deletedCount;
}

async function resetCounter(collectionPath: string, docId: string, field: string, startValue: number = 0): Promise<void> {
    const ref = db.collection(collectionPath).doc(docId);
    const doc = await ref.get();

    if (doc.exists) {
        await ref.update({ [field]: startValue });
        console.log(`  ✓ Reset ${collectionPath}/${docId}.${field} to ${startValue}`);
    } else {
        await ref.set({
            [field]: startValue,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`  ✓ Created ${collectionPath}/${docId} with ${field}: ${startValue}`);
    }
}

async function main() {
    console.log('========================================');
    console.log('  FIRESTORE DATA PURGE - DEV CLEANUP');
    console.log(`  Project: ${serviceAccount.project_id}`);
    console.log(`  Time: ${new Date().toISOString()}`);
    console.log('========================================\n');

    // Confirm with user
    console.log('WARNING: This will permanently delete data from Firestore!');
    console.log('Target collections: users, hubs, organizations');
    console.log('The following will NOT be touched: attendance, kpi, shipments, alerts, system\n');
    console.log('Press Ctrl+C within 5 seconds to abort...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('Proceeding...\n');

    try {
        // Step 1: Delete all documents in target collections
        const usersDeleted = await deleteCollection('users');
        const hubsDeleted = await deleteCollection('hubs');
        const orgsDeleted = await deleteCollection('organizations');

        // Step 2: Reset counters to 0
        console.log('\n--- Resetting Counters ---');
        await resetCounter('counters', 'hubCounter', 'currentCount', 0);
        await resetCounter('counters', 'employeeCounter', 'currentCount', 0);
        await resetCounter('counters', 'supervisorCounter', 'currentCount', 0);
        await resetCounter('counters', 'riderCounter', 'currentCount', 0);

        console.log('\n========================================');
        console.log('  PURGE COMPLETE');
        console.log(`  Users deleted:        ${usersDeleted}`);
        console.log(`  Hubs deleted:         ${hubsDeleted}`);
        console.log(`  Organizations deleted: ${orgsDeleted}`);
        console.log('  Counters reset to 0');
        console.log('========================================');
        console.log('\nFirst auto-generated IDs will now be:');
        console.log('  HUB-001, EMP-0001, SUP-0001, RID-0001');
        console.log('  (format depends on your counter naming convention)\n');

    } catch (error) {
        console.error('\n✗ Purge failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

main();