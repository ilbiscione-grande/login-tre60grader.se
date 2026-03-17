import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual
} from "crypto";

type SessionPayload = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at?: number;
  expires_in?: number;
};

type EncryptedSessionPayload = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

function getKeyBuffer(secret: string): Buffer {
  const key = Buffer.from(secret, "base64");

  if (key.length !== 32) {
    throw new Error("AUTH_HANDOFF_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }

  return key;
}

export function hashHandoffSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function createHandoffToken() {
  return {
    id: randomUUID(),
    secret: randomBytes(32).toString("base64url")
  };
}

export function splitHandoffToken(token: string) {
  const [id, secret] = token.split(".", 2);

  if (!id || !secret) {
    return null;
  }

  return { id, secret };
}

export function encryptSessionPayload(
  payload: SessionPayload,
  encryptionKey: string
): EncryptedSessionPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKeyBuffer(encryptionKey), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64")
  };
}

export function decryptSessionPayload(
  payload: EncryptedSessionPayload,
  encryptionKey: string
): SessionPayload {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getKeyBuffer(encryptionKey),
    Buffer.from(payload.iv, "base64")
  );

  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final()
  ]);

  return JSON.parse(plaintext.toString("utf8")) as SessionPayload;
}

export function hashUserAgent(value: string | null) {
  if (!value) return null;
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function safeEqualHexHash(left: string, right: string) {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

export type { SessionPayload, EncryptedSessionPayload };
