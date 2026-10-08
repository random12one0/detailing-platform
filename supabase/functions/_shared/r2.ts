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
  /** Extra query parameters that become part of the proof (a listing's `list-type`, `prefix`,
   *  `continuation-token`). They are sorted in with the `X-Amz-*` ones, as signing requires. */
  query?: Record<string, string>;
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
    ...(o.query ?? {}),
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

// ---------------------------------------------------------------------------
// THE PUBLIC ADDRESS — ROADMAP 0.11 slice 4, and the one thing R2 has no
// default for.
// ---------------------------------------------------------------------------
// `job-photos` and `expense-receipts` are private: every read is a signed URL
// this file mints, and the bucket needs no address of its own. **`business-media`
// is public-read, and that is not a detail — a logo and a gallery photograph are
// rendered to an anonymous visitor on a tenant's booking page, so a one-hour
// signature is not a URL that can be stored in a row.**
//
// Supabase gives a public bucket an address for free (`getPublicUrl`).
// **R2 does not.** A bucket has a public address only once somebody binds one
// in the Cloudflare dashboard — the `r2.dev` development subdomain, or a custom
// domain. There is nothing to infer and nothing to default to, so the base is
// read from the environment by name like every other credential-shaped thing
// here, and when it is absent the door says so in words.
//
// **AND THE ADDRESS BECOMES PERMANENT DATA, WHICH IS WHY IT IS ANDREW'S
// DECISION AND NOT A SESSION'S.** `gallery_images.image_url` and the brand's
// `logo_url` store an ABSOLUTE url, so whichever host is configured on the day
// of the switch is written into every row created after it. Changing it later
// does not move those rows; it breaks them. `FOR-ANDREW.md` step 9 says this in
// his words and recommends the custom domain for exactly that reason.

/** The environment name carrying `business-media`'s public base. */
export const R2_PUBLIC_ENV = "R2_MEDIA_BASE" as const;

/**
 * The public base for `business-media`, or `null` and the NAME that is missing
 * or unusable. Trailing slashes are trimmed so a base with one and a base
 * without produce the same url.
 *
 * **`https` only.** A public image fetched over `http` is blocked as mixed
 * content on every page this product serves, which would show as a broken
 * logo rather than as a configuration mistake.
 */
export function mediaBase(get: (name: string) => string | undefined): { base: string | null; missing: string[] } {
  const raw = (get(R2_PUBLIC_ENV) ?? "").trim().replace(/\/+$/, "");
  if (!raw || !/^https:\/\/[^\s/?#]+[^\s?#]*$/.test(raw)) return { base: null, missing: [R2_PUBLIC_ENV] };
  return { base: raw, missing: [] };
}

/**
 * Where the public internet reads one object. The key is path-encoded with the
 * same function the signer uses, so a key and its url can never disagree about
 * what character means what.
 */
export const publicUrl = (base: string, key: string) => `${base}/${encodePath(key)}`;

/** One object as the bucket's own listing reports it. `bytes` is R2's number, never a client's. */
export interface ListedObject { key: string; bytes: number }
export interface ListPage { objects: ListedObject[]; next: string | null }

export interface R2Store {
  /** A URL a browser may PUT one object to, for `Content-Type: contentType` only.
   *  With `exactBytes`, the length is signed in too, so a body of any other
   *  size fails the signature — the only server-side ceiling the public store
   *  has, since it has no `finish` to measure at (`_shared/photoDoor.ts`). */
  putUrl(bucket: string, key: string, contentType: string, expires: number, exactBytes?: number): Promise<string>;
  /** A URL anybody holding it may GET the object from, until it expires. */
  getUrl(bucket: string, key: string, expires: number): Promise<string>;
  /** What R2 itself says is stored: the size is R2's, never the client's. */
  head(bucket: string, key: string): Promise<{ exists: boolean; bytes: number | null }>;
  /** Removes the object. Already gone is success. */
  del(bucket: string, key: string): Promise<void>;
  /** One page (up to 1000) of a bucket's keys and sizes, from `token` if given. ROADMAP 0.11 slice 6. */
  list(bucket: string, token?: string | null): Promise<ListPage>;
}

const R2_FAILED = "R2 request failed";

const xmlText = (s: string) =>
  s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

/**
 * A ListObjectsV2 answer, read strictly. **A size that is missing or not a whole number throws**, because
 * a listing that reads an unreadable size as zero would make a stored photograph weigh nothing, and the
 * reconcile exists to catch exactly that. A truncated page with no continuation token throws too: it
 * would be reported as the end of the bucket.
 */
export function parseListPage(xml: string): ListPage {
  if (!/<ListBucketResult[\s>]/.test(xml)) throw new Error("R2 listing was not a listing");
  const objects: ListedObject[] = [];
  for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
    const key = /<Key>([\s\S]*?)<\/Key>/.exec(m[1]);
    const size = /<Size>([\s\S]*?)<\/Size>/.exec(m[1]);
    const n = size ? Number(size[1].trim()) : NaN;
    if (!key || !Number.isInteger(n) || n < 0) throw new Error("R2 listing had an object with no readable size");
    objects.push({ key: xmlText(key[1]), bytes: n });
  }
  const truncated = /<IsTruncated>\s*true\s*<\/IsTruncated>/.test(xml);
  const tok = /<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml);
  if (truncated && !tok) throw new Error("R2 listing was cut short with no way to continue");
  return { objects, next: truncated && tok ? xmlText(tok[1]) : null };
}

/** The most pages `listAll` will read: 1000 objects each, so 200,000 objects. Past it, it throws rather than
 *  return a partial bucket as if it were the whole one. */
export const LIST_PAGE_CEILING = 200;

export async function listAll(store: Pick<R2Store, "list">, bucket: string): Promise<ListedObject[]> {
  const out: ListedObject[] = [];
  let token: string | null = null;
  for (let page = 0; page < LIST_PAGE_CEILING; page++) {
    const p = await store.list(bucket, token);
    out.push(...p.objects);
    if (!p.next) return out;
    token = p.next;
  }
  throw new Error("R2 listing exceeded its page ceiling");
}

export function makeR2(
  cfg: R2Config,
  fetchImpl: typeof fetch = fetch,
  now: () => Date = () => new Date(),
): R2Store {
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const signPath = (method: string, path: string, expires: number, headers?: Record<string, string>, query?: Record<string, string>) =>
    presign({
      method, host, path, accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey, region: "auto", expires, now: now(), headers, query,
    });
  const sign = (method: string, bucket: string, key: string, expires: number, headers?: Record<string, string>) =>
    signPath(method, `/${bucket}/${key}`, expires, headers);
  // `fetch`'s own failure text includes the whole signed URL, so it is never
  // allowed to travel: a generic message goes up instead.
  const call = async (method: string, url: string) => {
    try { return await fetchImpl(url, { method }); } catch { throw new Error(R2_FAILED); }
  };
  return {
    // A SIGNED `content-length` IS BINDING ON THE BROWSER, which is why it is
    // the public store's ceiling: a browser cannot set that header from
    // JavaScript, it is filled in from the body itself, so a file of any other
    // size simply does not match the signature.
    putUrl: (bucket, key, contentType, expires, exactBytes) => sign("PUT", bucket, key, expires,
      exactBytes === undefined
        ? { "content-type": contentType }
        : { "content-type": contentType, "content-length": String(exactBytes) }),
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
    async list(bucket, token) {
      const query: Record<string, string> = { "list-type": "2", "max-keys": "1000" };
      if (token) query["continuation-token"] = token;
      const res = await call("GET", await signPath("GET", `/${bucket}`, 60, undefined, query));
      if (!res.ok) throw new Error(`${R2_FAILED} (${res.status})`);
      return parseListPage(await res.text());
    },
  };
}
