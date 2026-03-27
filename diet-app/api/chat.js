export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: "API key not configured" } });
  }

  // 입력 검증: 허용된 모델과 max_tokens 제한
  const { model, max_tokens } = req.body || {};
  if (!model || !model.startsWith("claude-")) {
    return res.status(400).json({ error: { message: "Invalid model" } });
  }
  if (max_tokens && max_tokens > 2000) {
    req.body.max_tokens = 2000;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (e) {
    console.error("API Error:", e);
    return res.status(500).json({ error: { message: e.message } });
  }
}
