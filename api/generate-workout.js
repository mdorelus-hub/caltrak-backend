export default async function handler(req, res) {
  // =========================
  // CORS
  // =========================
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST" });
    }

    const { equipment, availableTime, muscleTarget } = req.body;

    if (!equipment || !availableTime || !muscleTarget) {
      return res.status(400).json({
        error: "Missing workout information."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
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
Generate a workout plan.

Equipment:
${equipment}

Workout Time:
${availableTime} minutes

Target Muscle Group:
${muscleTarget}

Return ONLY valid JSON in exactly this format:

{
  "title": "",
  "description": "",
  "estimatedCaloriesBurned": 0,
  "exercises": [
    {
      "name": "",
      "muscleGroup": "",
      "repsOrDuration": "",
      "restTime": "",
      "instructions": ""
    }
  ],
  "coachingTip": ""
}

Do not include markdown.
Do not include \`\`\`.
Return JSON only.
`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({
        error: "Gemini returned an empty response."
      });
    }

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const workout = JSON.parse(cleaned);

    return res.status(200).json(workout);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
