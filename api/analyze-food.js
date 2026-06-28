export default function handler(req, res) {
  return res.status(200).json({
    success: true,
    food: "backend working 🎉",
    calories: 250,
    protein: 10,
    carbs: 30,
    fat: 8
  });
}
