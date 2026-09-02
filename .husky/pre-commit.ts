import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { applyEdits, modify, parse } from "jsonc-parser";
import { readFile, writeFile } from "node:fs/promises";

dayjs.extend(utc);

const COMPATIBILITY_DATE_KEY = "compatibility_date",
  CONFIG_FILE = "wrangler.jsonc",
  EXIT_CODE_FAILURE = 1,
  ONE_DAY = 1,
  fileContent = await readFile(CONFIG_FILE),
  configContent = fileContent.toString(),
  { compatibility_date } = parse(configContent) as {
    compatibility_date: string;
  },
  yesterday = dayjs().subtract(ONE_DAY, "day").format("YYYY-MM-DD");
await writeFile(
  CONFIG_FILE,
  applyEdits(configContent, modify(configContent, [COMPATIBILITY_DATE_KEY], yesterday, {})),
  {},
);
if (compatibility_date !== yesterday) {
  globalThis.process.exit(EXIT_CODE_FAILURE);
}
