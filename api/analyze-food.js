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
Analyze this food image and return ONLY valid JSON:

{
  "food": "",
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

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return res.status(200).json({
      success: true,
      result: text
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
