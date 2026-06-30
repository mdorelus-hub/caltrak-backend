export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const { imageBase64 } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: "No image provided"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Missing GEMINI_API_KEY"
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
Analyze this food image.

Return ONLY JSON:

{
  "food": "",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "confidenceScore": 0
}
`
                },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: imageBase64
                  }
                }
              ]
            }
          ]
        })
      }
    );

    const raw = await response.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(500).json({
        success: false,
        error: "Gemini returned invalid JSON",
        raw
      });
    }

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        error: "Gemini API request failed",
        details: data
      });
    }

    const candidate = data?.candidates?.[0];

    if (!candidate) {
      return res.status(500).json({
        success: false,
        error: "No candidates returned",
        details: data
      });
    }

    if (candidate.finishReason && candidate.finishReason !== "STOP") {
      return res.status(500).json({
        success: false,
        error: "Generation stopped",
        finishReason: candidate.finishReason,
        details: data
      });
    }

    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({
        success: false,
        error: "Candidate contained no text",
        details: data
      });
    }

    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      return res.status(500).json({
        success: false,
        error: "No JSON found in Gemini output",
        raw: text
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return res.status(500).json({
        success: false,
        error: "Gemini JSON could not be parsed",
        raw: text
      });
    }

    return res.status(200).json({
      success: true,
      food: parsed.food ?? "Unknown",
      calories: Number(parsed.calories) || 0,
      protein: Number(parsed.protein) || 0,
      carbs: Number(parsed.carbs) || 0,
      fat: Number(parsed.fat) || 0,
      confidenceScore: Number(parsed.confidenceScore) || 0
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
