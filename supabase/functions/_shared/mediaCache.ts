// ROADMAP 0.11bd: an R2 DELETE does not delete Cloudflare's cached public copy.
// Purge the exact canonical URL after deleting the origin, including on retries
// where the origin is already gone. Never acknowledge removal after a failed purge.
// The R2 S3 credential cannot purge a zone: Andrew supplies a separate, zone-scoped
// Cache Purge token. Only environment names and generic errors may leave this file.
import { publicUrl, type R2Store } from "./r2.ts";

export const MEDIA_CACHE_ENV = ["CF_MEDIA_ZONE_ID", "CF_CACHE_PURGE_TOKEN"] as const;
export interface MediaCacheConfig { zoneId: string; token: string }
export type PurgeMedia = (url: string) => Promise<void>;

export function mediaCacheConfig(get: (name: string) => string | undefined): {
  config: MediaCacheConfig | null; missing: string[];
} {
  const zoneId = (get(MEDIA_CACHE_ENV[0]) ?? "").trim();
  const token = (get(MEDIA_CACHE_ENV[1]) ?? "").trim();
  const missing = [
    ...(/^[a-f0-9]{32}$/i.test(zoneId) ? [] : [MEDIA_CACHE_ENV[0]]),
    ...(token ? [] : [MEDIA_CACHE_ENV[1]]),
  ];
  return { config: missing.length ? null : { zoneId, token }, missing };
}

export function makeMediaPurge(config: MediaCacheConfig, fetchImpl: typeof fetch = fetch): PurgeMedia {
  return async (url) => {
    // Neither a thrown fetch error nor Cloudflare's response body is safe to log.
    // They can contain request credentials. Bound the wait, and replace both.
    try {
      const response = await fetchImpl(`https://api.cloudflare.com/client/v4/zones/${config.zoneId}/purge_cache`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ files: [url] }),
        signal: AbortSignal.timeout(8000),
      });
      const body = await response.json();
      if (!response.ok || body?.success !== true) throw new Error("purge refused");
    } catch {
      throw new Error("Public image cache purge failed");
    }
  };
}

/** Wrap only photo-door's store. Private photos and receipts need no public purge. */
export function withMediaCache(store: R2Store, base: string | null, purge: PurgeMedia | null): R2Store {
  return {
    ...store,
    async del(bucket, key) {
      if (bucket !== "business-media") return store.del(bucket, key);
      // Refuse before changing the origin if the public copy cannot be removed.
      // Absence of configuration is a closed deletion path, never an unpurged success.
      if (!base || !purge) throw new Error("Public image cache purge is not configured");
      await store.del(bucket, key);
      await purge(publicUrl(base, key));
    },
  };
}
