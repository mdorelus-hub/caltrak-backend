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
    const body = req.body || {};
    const imageBase64 = body.imageBase64;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image provided" });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
You are a nutrition AI.

Return ONLY valid JSON. No text. No markdown.

JSON format:
{
  "food": "string",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "confidenceScore": number
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
        }),
      }
    );

    const data = await response.json();

    // 🔴 HARD SAFETY CHECK (prevents silent crashes)
    if (!response.ok) {
      return res.status(500).json({
        success: false,
        error: "Gemini API error",
        details: data
      });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({
        success: false,
        error: "Empty response from Gemini",
        raw: data
      });
    }

    // 🔥 Extract JSON even if Gemini adds extra text
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      return res.status(500).json({
        success: false,
        error: "No JSON found in response",
        raw: text
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(match[0]);
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "Invalid JSON format",
        raw: text
      });
    }

    // ✅ FINAL CLEAN RESPONSE
    return res.status(200).json({
      success: true,
      food: parsed.food || "Unknown",
      calories: parsed.calories || 0,
      protein: parsed.protein || 0,
      carbs: parsed.carbs || 0,
      fat: parsed.fat || 0,
      confidenceScore: parsed.confidenceScore ?? 0
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
