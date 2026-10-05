// Build-time script to fetch Telegram bot username from bot token
// Runs during astro build, outputs username to stdout for Vite define

async function fetchBotUsername(botToken: string): Promise<string> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  if (!response.ok) {
    throw new Error(`Failed to fetch bot info: ${response.statusText}`);
  }
  const data = await response.json();
  if (!data.ok || !data.result?.username) {
    throw new Error(`Invalid bot response: ${JSON.stringify(data)}`);
  }
  return data.result.username;
}

try {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN not set, using fallback");
    process.stdout.write("your_bot");
    process.exit(0);
  }

  const username = await fetchBotUsername(botToken);
  console.log(`Fetched bot username: @${username}`);
  process.stdout.write(username);
} catch (error) {
  console.error("Failed to fetch bot username:", error);
  process.stdout.write("your_bot");
  process.exit(0);
}
