import crypto from "crypto";

// AES-256-GCM. Key is derived (sha256) from ENCRYPTION_KEY so any-length secret works.
// Ciphertext layout: base64( iv(12) | authTag(16) | ciphertext ).
function key() {
  const secret = process.env.ENCRYPTION_KEY || "";
  return crypto.createHash("sha256").update(secret).digest(); // 32 bytes
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt(b64: string): string {
  const raw = Buffer.from(b64, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
