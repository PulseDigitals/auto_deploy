import { readEnv } from "./env";

export type StatePayload = {
  deploymentId: string;
  provider: string;
  targetCallback: string;
  mode: "dynamic" | "gateway";
  pkceVerifier: string;
  userId?: string;
  issuedAt: number;
};

function toBase64Url(data: ArrayBuffer | Uint8Array): string {
  const view = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  let binary = "";
  view.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  const raw =
    typeof btoa === "function"
      ? btoa(binary)
      : (globalThis as any).Buffer?.from(binary, "binary").toString("base64");
  return (raw || "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(data: string): Uint8Array {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary =
    typeof atob === "function"
      ? atob(padded)
      : (globalThis as any).Buffer?.from(padded, "base64").toString("binary");
  if (!binary) return new Uint8Array();
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export class StateService {
  private secret: string;

  constructor(secret?: string) {
    const envSecret = secret ?? readEnv("TOKEN_ENCRYPTION_KEY");
    if (!envSecret) {
      throw new Error("TOKEN_ENCRYPTION_KEY is required for state encryption");
    }
    this.secret = envSecret;
  }

  private async getKey() {
    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(this.secret.padEnd(32, "0")).slice(0, 32);
    return crypto.subtle.importKey("raw", keyMaterial, "AES-GCM", false, [
      "encrypt",
      "decrypt",
    ]);
  }

  async signAndEncrypt(payload: StatePayload): Promise<string> {
    const key = await this.getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(payload));
    const cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      key,
      encoded,
    );
    return `${toBase64Url(iv)}.${toBase64Url(cipher)}`;
  }

  async decryptAndVerify(token: string): Promise<StatePayload> {
    const [ivPart, cipherPart] = token.split(".");
    if (!ivPart || !cipherPart) {
      throw new Error("Malformed state payload");
    }
    const key = await this.getKey();
    const iv = fromBase64Url(ivPart);
    const cipher = fromBase64Url(cipherPart);
    const cipherBuffer = cipher.buffer.slice(
      cipher.byteOffset,
      cipher.byteOffset + cipher.byteLength,
    ) as ArrayBuffer;
    const plainBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      key,
      cipherBuffer,
    );
    const json = new TextDecoder().decode(plainBuffer);
    return JSON.parse(json) as StatePayload;
  }
}
