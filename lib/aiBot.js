export function getBotReply(msg) {
  msg = msg.toLowerCase();

  if (msg.includes("sad")) return "💙 It's okay";
  if (msg.includes("love")) return "❤️ Love matters";
  if (msg.includes("happy")) return "😊 Stay happy";
  if (msg.includes("help")) return "🤝 I'm here";

  return "💭 Tell me more";
}
