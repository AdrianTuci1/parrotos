import { Firestore } from '@google-cloud/firestore';

const firestore = new Firestore({ projectId: 'statsparrot-prod' });

async function check() {
  const doc = await firestore.collection('organizations').doc('5d1596aa-8360-4693-9e22-e3419b83b0cd').get();
  if (!doc.exists) {
    console.log('Doc does not exist!');
    return;
  }
  const data = doc.data();
  console.log('Data:', JSON.stringify(data, null, 2));
}

check().catch(console.error);
