"use node";

import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  }
  return Buffer.from(key, "hex");
}

export function encryptToken(plaintext: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    v: 1,
  };
}

export function decryptToken(payload: {
  ciphertext: string;
  iv: string;
  tag: string;
  v: number;
}) {
  const decipher = crypto.createDecipheriv(
    ALGO,
    getKey(),
    Buffer.from(payload.iv, "base64")
  );

  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
