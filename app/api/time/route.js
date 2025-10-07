export default function handler(req, res) {
  res.status(200).json({ time: Date.now() });
}
