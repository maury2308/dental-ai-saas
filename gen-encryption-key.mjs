import crypto from 'crypto';

/**
 * Generates a secure 32-byte base64 encoded encryption key
 * for AES-256-GCM.
 */
function generateKey() {
  const key = crypto.randomBytes(32);
  const base64Key = key.toString('base64');

  console.log('------------------------------------------------------------');
  console.log('Generated Encryption Key (AES-256-GCM)');
  console.log('------------------------------------------------------------');
  console.log('Add this to your .env.local file:');
  console.log(`\nENCRYPTION_KEY=${base64Key}\n`);
  console.log('------------------------------------------------------------');
  console.log('Keep this key secret. If lost, encrypted data in the DB');
  console.log('cannot be recovered.');
  console.log('------------------------------------------------------------');
}

generateKey();
