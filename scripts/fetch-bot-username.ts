// Build-time script to fetch the Telegram bot username from the bot token.
//
// Invoked during `astro build` (see astro.config.ts):
//   pnpm tsx scripts/fetch-bot-username.ts
//
// Contract: write ONLY the username to stdout — the caller pipes stdout and
// trims it to populate `import.meta.env.TELEGRAM_BOT_USERNAME`. All diagnostics
// go to stderr so they never contaminate the value. On any failure (or when
// `TELEGRAM_BOT_TOKEN` is unset) fall back to `your_bot` and exit 0, so a
// missing token degrades the deep-link link rather than failing the build.
//
// `package.json` declares `"type": "module"`, so this file is an ES module and
// top-level `await` below is valid without an `export {}` marker.

const FALLBACK_USERNAME = "your_bot";

async function fetchBotUsername(botToken: string): Promise<string> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  if (!response.ok) {
    throw new Error(`Failed to fetch bot info: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    ok?: boolean;
    result?: { username?: string };
    description?: string;
  };
  if (!data.ok || !data.result?.username) {
    throw new Error(`Invalid bot response: ${JSON.stringify(data)}`);
  }

  return data.result.username;
}

try {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    process.stderr.write("TELEGRAM_BOT_TOKEN not set, using fallback\n");
    process.stdout.write(FALLBACK_USERNAME);
    process.exit(0);
  }

  const username = await fetchBotUsername(botToken);
  process.stderr.write(`Fetched bot username: @${username}\n`);
  process.stdout.write(username);
} catch (error) {
  process.stderr.write(`Failed to fetch bot username: ${String(error)}\n`);
  process.stdout.write(FALLBACK_USERNAME);
  process.exit(0);
}
