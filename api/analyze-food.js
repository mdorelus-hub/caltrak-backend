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

Return ONLY valid JSON. No markdown. No explanation.

Format:
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

    // 🔥 SAFE TEXT HANDLING (NO JSON PARSE YET)
    const rawText = await response.text();

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        error: "Gemini API failed",
        details: rawText
      });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: "Gemini returned non-JSON response",
        raw: rawText
      });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({
        success: false,
        error: "Empty Gemini response",
        raw: data
      });
    }

    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      return res.status(500).json({
        success: false,
        error: "No JSON found in model output",
        raw: text
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(match[0]);
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: "Invalid JSON format from model",
        raw: text
      });
    }

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
