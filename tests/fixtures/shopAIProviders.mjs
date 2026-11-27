// Fictional provider exchanges shared by credential-free tests and the local preview.
export const ids = {
  openai: "gpt-5-mini",
  anthropic: "claude-sonnet-4-6",
  gemini: "gemini-3-flash-preview",
};
export function mockProviders(onRequest = () => {}) {
  return async function send(url, init) {
    onRequest(url, init);
    const u = new URL(url),
      provider = {
        "api.openai.com": "openai",
        "api.anthropic.com": "anthropic",
        "generativelanguage.googleapis.com": "gemini",
      }[u.host];
    if (!provider) throw Error("unexpected endpoint");
    const key =
      init.headers.Authorization?.slice(7) ??
      init.headers["x-api-key"] ??
      init.headers["x-goog-api-key"];
    if (!key || key.startsWith("invalid-"))
      return Response.json({ message: "rejected " + key }, { status: 401 });
    if (init.method === "GET") {
      const id = ids[provider];
      if (provider === "gemini")
        return Response.json({
          models: [
            {
              name: "models/" + id,
              supportedGenerationMethods: ["generateContent"],
            },
            {
              name: "models/gemini-embedding",
              supportedGenerationMethods: ["embedContent"],
            },
          ],
        });
      if (provider === "anthropic")
        return Response.json({
          data: [
            {
              id,
              capabilities: {
                structured_outputs: { supported: true },
                server_tools: { web_search: { supported: true } },
              },
            },
            {
              id: "claude-old",
              capabilities: { structured_outputs: { supported: false } },
            },
          ],
          has_more: false,
        });
      return Response.json({
        data: [
          { id },
          { id: "gpt-4o-transcribe" },
          { id: "text-embedding-3-small" },
        ],
      });
    }
    const b = JSON.parse(init.body);
    let input =
      b.input ?? b.messages?.[0]?.content ?? b.contents?.[0]?.parts?.[0]?.text;
    let source = input.includes("example.com")
      ? "https://example.com/"
      : "https://juniper.example/menu";
    const test =
      input.includes("Juniper Fixture") ||
      input.includes("Extract the page heading");
    const fact = source.includes("example.com")
      ? "Example Domain"
      : "Mobile detailing in Mesa";
    if (provider === "anthropic" && b.tools)
      return Response.json({
        stop_reason: "end_turn",
        content: [
          { type: "text", citations: [{ url: source, cited_text: fact }] },
        ],
      });
    const grounded = !!b.tools || input.includes("Cited website excerpts:");
    let answers = {};
    try {
      answers =
        JSON.parse(input.split("\nCited website excerpts:")[0]).answers ?? {};
    } catch {}
    const row = (key, v, quote, url = "") => ({
      key,
      json_value: JSON.stringify(v),
      quote,
      url,
    });
    const suggestions = test
      ? [
          row(
            "name",
            grounded ? fact : "Juniper Fixture",
            grounded ? fact : "Juniper Fixture",
            grounded ? source : "",
          ),
        ]
      : [
          ...(grounded ? [row("service_area", "Mesa", fact, source)] : []),
          ...(answers.menu_notes?.includes("Cabin")
            ? [
                row(
                  "services",
                  [{ name: "Cabin", price: 100, minutes: 60 }],
                  "Cabin",
                ),
              ]
            : []),
        ];
    const text = JSON.stringify({ suggestions });
    if (provider === "gemini")
      return Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text }] },
            urlContextMetadata: {
              urlMetadata: grounded
                ? [
                    {
                      retrievedUrl: source,
                      urlRetrievalStatus: "URL_RETRIEVAL_STATUS_SUCCESS",
                    },
                  ]
                : [],
            },
          },
        ],
      });
    if (provider === "anthropic")
      return Response.json({
        stop_reason: "end_turn",
        content: [{ type: "text", text }],
      });
    return Response.json({
      status: "completed",
      output: [
        { action: { sources: grounded ? [{ url: source }] : [] } },
        { content: [{ type: "output_text", text }] },
      ],
    });
  };
}
