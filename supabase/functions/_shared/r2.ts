// CLOUDFLARE R2, AS THE PHOTO DOOR NEEDS IT. ROADMAP 0.11.
//
// R2 speaks the S3 protocol, and the one thing this file does is SIGN: it turns
// "this method, this object, for this many seconds" into a URL that carries its
// own proof, so a browser can PUT one photo without ever holding a credential
// (`docs/the-photo-allowance.md` § 4: the browser never holds R2 credentials).
// The server uses the same signing to ask R2 how big a stored object is, and to
// delete one.
//
// NO IMPORTS AT ALL — only the Web Crypto API Deno and Node 24 both carry — so
// `tests/photo-door-server.test.mjs` loads this file and RUNS it, the way
// `retryRead.ts` and `photoKey.ts` are run. **The signing is checked against
// Amazon's own published example**, not against itself: a signer tested only
// against its own output agrees with itself whatever it does.
//
// **CREDENTIALS ARE READ FROM THE ENVIRONMENT BY NAME AND NOWHERE ELSE.**
// `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` — the three names
// `docs/services-and-secrets.md` records. A value never appears in a log, an
// error, a response or a URL: **a presigned URL carries the access key id and a
// signature, never the secret**, and an error from `fetch` is replaced by a
// plain one because the runtime's own message includes the full signed URL.

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha256Hex = async (s: string) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));

async function hmac(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(msg));
}

// RFC 3986 unreserved only, which is what S3 signing asks for and what
// `encodeURIComponent` is one character short of (`! ' ( ) *`).
const rfc3986 = (s: string) =>
  encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
const encodePath = (p: string) => p.split("/").map(rfc3986).join("/");

export interface PresignOptions {
  method: string;
  /** `host` only, no scheme: `examplebucket.s3.amazonaws.com`. */
  host: string;
  /** The absolute path, unencoded, starting with a slash. */
  path: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  /** Seconds the URL stays good for. */
  expires: number;
  now: Date;
  /** Extra headers that become part of the proof (lowercase names). The
   *  caller MUST send them with exactly these values or R2 refuses. */
  headers?: Record<string, string>;
}

/**
 * AWS Signature Version 4, query-string form, unsigned payload. Returns the
 * whole `https://…` URL.
 */
export async function presign(o: PresignOptions): Promise<string> {
  const amzDate = o.now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${o.region}/s3/aws4_request`;

  const headers: Record<string, string> = { host: o.host };
  for (const [k, v] of Object.entries(o.headers ?? {})) headers[k.toLowerCase()] = String(v).trim();
  const names = Object.keys(headers).sort();
  const signedHeaders = names.join(";");
  const canonicalHeaders = names.map((n) => `${n}:${headers[n]}\n`).join("");

  const params: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${o.accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(o.expires),
    "X-Amz-SignedHeaders": signedHeaders,
  };
  const query = Object.keys(params).sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(params[k])}`).join("&");

  const path = encodePath(o.path);
  const canonicalRequest = [o.method, path, query, canonicalHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await sha256Hex(canonicalRequest)].join("\n");

  let k: ArrayBuffer = await hmac(enc.encode("AWS4" + o.secretAccessKey), dateStamp);
  for (const part of [o.region, "s3", "aws4_request"]) k = await hmac(k, part);
  const signature = hex(await hmac(k, stringToSign));

  return `https://${o.host}${path}?${query}&X-Amz-Signature=${signature}`;
}

// ---------------------------------------------------------------------------
// THE STORE. What the photo door calls; a test hands it a fake instead.
// ---------------------------------------------------------------------------

export const R2_ENV = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"] as const;

export interface R2Config { accountId: string; accessKeyId: string; secretAccessKey: string }

/**
 * The credentials, or `null` and the NAMES of what is missing. A name is safe
 * to log; a value never is, so nothing here returns or prints one except
 * inside the config object the signer reads.
 */
export function r2Config(get: (name: string) => string | undefined): { config: R2Config | null; missing: string[] } {
  const v = Object.fromEntries(R2_ENV.map((n) => [n, (get(n) ?? "").trim()]));
  const missing = R2_ENV.filter((n) => !v[n]);
  if (missing.length) return { config: null, missing: [...missing] };
  return {
    config: { accountId: v.R2_ACCOUNT_ID, accessKeyId: v.R2_ACCESS_KEY_ID, secretAccessKey: v.R2_SECRET_ACCESS_KEY },
    missing: [],
  };
}

export interface R2Store {
  /** A URL a browser may PUT one object to, for `Content-Type: contentType` only. */
  putUrl(bucket: string, key: string, contentType: string, expires: number): Promise<string>;
  /** A URL anybody holding it may GET the object from, until it expires. */
  getUrl(bucket: string, key: string, expires: number): Promise<string>;
  /** What R2 itself says is stored: the size is R2's, never the client's. */
  head(bucket: string, key: string): Promise<{ exists: boolean; bytes: number | null }>;
  /** Removes the object. Already gone is success. */
  del(bucket: string, key: string): Promise<void>;
}

const R2_FAILED = "R2 request failed";

export function makeR2(
  cfg: R2Config,
  fetchImpl: typeof fetch = fetch,
  now: () => Date = () => new Date(),
): R2Store {
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const sign = (method: string, bucket: string, key: string, expires: number, headers?: Record<string, string>) =>
    presign({
      method, host, path: `/${bucket}/${key}`, accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey, region: "auto", expires, now: now(), headers,
    });
  // `fetch`'s own failure text includes the whole signed URL, so it is never
  // allowed to travel: a generic message goes up instead.
  const call = async (method: string, url: string) => {
    try { return await fetchImpl(url, { method }); } catch { throw new Error(R2_FAILED); }
  };
  return {
    putUrl: (bucket, key, contentType, expires) => sign("PUT", bucket, key, expires, { "content-type": contentType }),
    getUrl: (bucket, key, expires) => sign("GET", bucket, key, expires),
    async head(bucket, key) {
      const res = await call("HEAD", await sign("HEAD", bucket, key, 60));
      if (res.status === 404) return { exists: false, bytes: null };
      if (!res.ok) throw new Error(`${R2_FAILED} (${res.status})`);
      // An absent header is null, never zero: `Number(null)` is 0, and a size
      // that reads as zero is a size that reads as free.
      const raw = res.headers.get("content-length");
      const n = raw === null || raw.trim() === "" ? NaN : Number(raw);
      return { exists: true, bytes: Number.isInteger(n) && n >= 0 ? n : null };
    },
    async del(bucket, key) {
      const res = await call("DELETE", await sign("DELETE", bucket, key, 60));
      if (!res.ok && res.status !== 404) throw new Error(`${R2_FAILED} (${res.status})`);
    },
  };
}
