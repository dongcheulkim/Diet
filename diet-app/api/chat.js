export const config = { maxDuration: 60 };

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

  // 최대 3회 재시도 (overloaded/529 대응)
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
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

      // overloaded(529) 또는 서버에러(500+)면 재시도
      if (response.status === 529 || response.status >= 500) {
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
      }

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (e) {
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
        continue;
      }
      console.error("API Error:", e);
      return res.status(500).json({ error: { message: e.message } });
    }
  }
}
