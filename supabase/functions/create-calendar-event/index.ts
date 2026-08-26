import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SERVICE_ACCOUNT = JSON.parse(
  Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON")!
);

const GOOGLE_CALENDAR_ID = Deno.env.get("GOOGLE_CALENDAR_ID");

// Convert PEM private key to ArrayBuffer for WebCrypto
function pemToArrayBuffer(pem: string) {
  const b64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "")
    .trim();

  const raw = atob(b64);
  const buffer = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; i++) {
    buffer[i] = raw.charCodeAt(i);
  }

  return buffer.buffer;
}

// Create JWT for Google OAuth
async function createJWT() {
  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const now = Math.floor(Date.now() / 1000);

  const claim = {
    iss: SERVICE_ACCOUNT.client_email,
    scope: "https://www.googleapis.com/auth/calendar.events",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const encoder = new TextEncoder();

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedClaim = btoa(JSON.stringify(claim));
  const toSign = `${encodedHeader}.${encodedClaim}`;

  const keyData = pemToArrayBuffer(SERVICE_ACCOUNT.private_key);

  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    encoder.encode(toSign)
  );

  const signatureB64 = btoa(
    String.fromCharCode(...Array.from(new Uint8Array(signature)))
  );

  return `${toSign}.${signatureB64}`;
}

// Exchange JWT for access token
async function getAccessToken() {
  const jwt = await createJWT();

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  try {
    const payload = await req.json();
    const { summary, description } = payload;
    // create-booking sends startDateTime/endDateTime; accept the older
    // startTime/endTime names too for backward compatibility.
    const startDateTime = payload.startDateTime ?? payload.startTime;
    const endDateTime = payload.endDateTime ?? payload.endTime;
    const timeZone = payload.timeZone ?? "America/Los_Angeles";

    const accessToken = await getAccessToken();
    const eventRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${GOOGLE_CALENDAR_ID}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          summary,
          description,
          start: { dateTime: startDateTime, timeZone },
          end: { dateTime: endDateTime, timeZone }
        })
      }
    );
    const eventData = await eventRes.json();
    return new Response(JSON.stringify(eventData), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
});
