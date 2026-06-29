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

    const body = typeof req.body === "string"
  ? JSON.parse(req.body)
  : req.body || {};

if (!req.body) {
  return res.status(400).json({
    success: false,
    error: "Missing request body"
  });
}

let body = req.body;

// If Vercel sends body as a string, convert it
if (typeof body === "string") {
  try {
    body = JSON.parse(body);
  } catch (e) {
    return res.status(400).json({
      success: false,
      error: "Invalid JSON body"
    });
  }
}

const imageBase64 = body.imageBase64;

if (!imageBase64) {
  return res.status(400).json({
    success: false,
    error: "No image provided"
  });
}
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    // =========================
    // CALL GEMINI API
    // =========================
    const fetchFn = globalThis.fetch;

if (!fetchFn) {
  return res.status(500).json({
    success: false,
    error: "fetch is not available in this runtime"
  });
}

const response = await fetchFn(
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
Analyze this food image and return ONLY valid JSON in this format:

{
  "food": "",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number
}

Be accurate and estimate portion sizes based on visible food.
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
