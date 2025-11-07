import { VaultItem, StoredVault } from "../types";

const ALGO = "AES-GCM";
const KEY_ALGO = "PBKDF2";
const HASH = "SHA-256";
const ITERATIONS = 100000;

function strToBuf(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function bufToStr(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf);
}

function bufToB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

// FIX: Changed return type from ArrayBuffer to Uint8Array to ensure type consistency.
function b64ToBuf(b64: string): Uint8Array {
  const str = atob(b64);
  const buf = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    buf[i] = str.charCodeAt(i);
  }
  return buf;
}

async function getKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const pinBuf = strToBuf(pin);
  const baseKey = await crypto.subtle.importKey("raw", pinBuf, KEY_ALGO, false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: KEY_ALGO,
      salt,
      iterations: ITERATIONS,
      hash: HASH,
    },
    baseKey,
    { name: ALGO, length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptVault(
  items: VaultItem[],
  pin: string
): Promise<StoredVault> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey(pin, salt);
  const dataToEncrypt = strToBuf(JSON.stringify(items));

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: ALGO,
      iv,
    },
    key,
    dataToEncrypt
  );

  return {
    iv: bufToB64(iv),
    salt: bufToB64(salt),
    data: bufToB64(encryptedData),
  };
}

export async function decryptVault(
  storedVault: StoredVault,
  pin: string
): Promise<VaultItem[]> {
    try {
        const salt = b64ToBuf(storedVault.salt);
        const iv = b64ToBuf(storedVault.iv);
        const data = b64ToBuf(storedVault.data);
        const key = await getKey(pin, salt);
    
        const decryptedData = await crypto.subtle.decrypt(
          {
            name: ALGO,
            iv,
          },
          key,
          data
        );
    
        const decryptedString = bufToStr(decryptedData);
        return JSON.parse(decryptedString) as VaultItem[];
    } catch(e) {
        console.error("Decryption failed", e);
        throw new Error("Invalid PIN or corrupted data.");
    }
}