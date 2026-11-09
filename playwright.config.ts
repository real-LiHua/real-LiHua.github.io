import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4322);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PLAYWRIGHT_PORT must be a valid TCP port.");
}

export default defineConfig({
  testDir: "./tests/e2e",
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  use: {
    baseURL: `http://localhost:${port}`,
  },
  webServer: {
    command: `pnpm build && HOST=0.0.0.0 PORT=${port} node ./dist/server/entry.mjs`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
