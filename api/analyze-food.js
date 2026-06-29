export default async function handler(req, res) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

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
                  text: "Say: Gemini is connected and working"
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    res.status(200).json({
      success: true,
      raw: data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
