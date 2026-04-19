import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, query, getDocsFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the explicit databaseId from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const defaultDb = getFirestore(app);

// Diagnostic function to help find the right database
export async function getMaterialsDiagnostic() {
  const results: any = {
    namedDb: { status: 'pending', error: null, count: 0, dbId: firebaseConfig.firestoreDatabaseId },
    defaultDb: { status: 'pending', error: null, count: 0, dbId: '(default)' },
    collectionsChecked: ['materials', 'vat-lieu']
  };

  const collections = ['materials', 'vat-lieu'];

  // Run all checks in parallel for maximum speed
  const checks = [
    ...collections.map(col => ({ db, col, type: 'named' })),
    ...collections.map(col => ({ db: defaultDb, col, type: 'default' }))
  ];

  await Promise.allSettled(checks.map(async (check) => {
    try {
      const snap = await getDocsFromServer(query(collection(check.db, check.col)));
      if (snap.size > 0) {
        const target = check.type === 'named' ? results.namedDb : results.defaultDb;
        if (target.status !== 'success') {
          target.status = 'success';
          target.count = snap.size;
          target.collection = check.col;
        }
      }
    } catch (error) {
      const target = check.type === 'named' ? results.namedDb : results.defaultDb;
      target.status = 'error';
      target.error = error;
    }
  }));

  if (results.namedDb.status === 'pending') results.namedDb.status = 'empty';
  if (results.defaultDb.status === 'pending') results.defaultDb.status = 'empty';

  return results;
}
