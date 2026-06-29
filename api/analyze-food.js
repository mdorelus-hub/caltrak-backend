export default async function handler(req, res) {
  // =========================
  // CORS (FIX FOR FIREBASE)
  // =========================
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Only allow POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST" });
    }

    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image provided" });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    // =========================
    // CALL GEMINI API
    // =========================
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
You are a professional nutrition AI analyzing food images.

Analyze the image and return ONLY valid JSON.

IMPORTANT RULES:
- Return ONLY JSON (no markdown, no explanation, no extra text)
- Estimate portion sizes visually
- Be as accurate as possible
- If unsure, lower confidenceScore

Return in this exact format:

{
  "food": "string (describe the meal clearly)",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "confidenceScore": number
}

Confidence score rules:
- 90–100: very clear, easy to identify food + portion
- 70–89: mostly clear but minor uncertainty
- 50–69: mixed or partially unclear ingredients
- below 50: unclear, blurry, or hard to estimate

Now analyze the image.
`
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

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

   return res.status(200).json({
  success: true,
  result: text,
  raw: data
});

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
