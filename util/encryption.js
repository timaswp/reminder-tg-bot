import 'dotenv/config';
import crypto from 'crypto';

const publicKey = process.env.PUBLIC_KEY.replace(/\\n/g, '\n');
const privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');

export function encrypt(text) {
  return crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(text)
  ).toString('base64');
}

export function decrypt(encrypted) {
  return crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(encrypted, 'base64')
  ).toString();
}
