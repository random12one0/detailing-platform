import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "info@andrewsdetail.com";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  // Allow CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Internal-only relay: this function must be callable ONLY by our own edge
  // functions (create-booking, etc.), which pass the service-role key. The public
  // anon key is NOT accepted, so this can no longer be abused as an open email relay.
  const auth = req.headers.get("Authorization") || "";
  if (!SERVICE_ROLE_KEY || auth !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }

  try {
    console.log('RESEND_API_KEY present:', !!RESEND_API_KEY);

    const { to, subject, body, attachments } = await req.json();
    console.log('Sending email to:', to, 'Subject:', subject);

    // Optional attachments passthrough to Resend. Each item is
    // { filename, content } where content is base64 (e.g. a .vcf contact card).
    const payload: Record<string, unknown> = {
      from: `Andrew's Car Wash <${FROM_EMAIL}>`,
      to: [to],
      subject: subject,
      html: body,
    };
    if (Array.isArray(attachments) && attachments.length > 0) {
      payload.attachments = attachments;
    }

    // Send email via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const responseData = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', responseData);
      return new Response(JSON.stringify({
        error: 'Failed to send email',
        details: responseData
      }), {
        status: res.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    console.log('Email sent successfully via Resend:', responseData);
    return new Response(JSON.stringify({
      success: true,
      message: 'Email sent successfully',
      id: responseData.id
    }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error('Email send error:', err);
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }
});
