const encode = (bytes) => btoa(String.fromCharCode(...bytes));
const decode = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
async function wrappingKey(secret) {
  try {
    const raw = decode(secret);
    if (raw.length !== 32) throw Error();
    return await crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
      "encrypt",
      "decrypt",
    ]);
  } catch {
    throw Error("encryption_unavailable");
  }
}
function cipher(provider, iv) {
  return {
    name: "AES-GCM",
    iv,
    additionalData: new TextEncoder().encode("shop-setup:v1:" + provider),
  };
}
export async function seal(provider, key, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    cipher(provider, iv),
    await wrappingKey(secret),
    new TextEncoder().encode(key),
  );
  return { v: 1, iv: encode(iv), data: encode(new Uint8Array(encrypted)) };
}
export async function unlock(provider, connection, secret) {
  if (!connection?.sealed) throw Error("missing_key");
  try {
    const box = connection.sealed;
    if (box.v !== 1) throw Error();
    return new TextDecoder().decode(
      await crypto.subtle.decrypt(
        cipher(provider, decode(box.iv)),
        await wrappingKey(secret),
        decode(box.data),
      ),
    );
  } catch {
    throw Error("encryption_unavailable");
  }
}
