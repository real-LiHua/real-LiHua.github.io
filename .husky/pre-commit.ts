import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { applyEdits, modify, parse } from "jsonc-parser";
import { readFile, writeFile } from "node:fs/promises";

dayjs.extend(utc);

const CONFIG_FILE = "wrangler.jsonc";
const COMPATIBILITY_DATE_KEY = "compatibility_date";
const ONE_DAY = 1;
const EXIT_CODE_FAILURE = 1;

const fileContent = await readFile(CONFIG_FILE);
const configContent = fileContent.toString();
const { compatibility_date } = parse(configContent) as {
  compatibility_date: string;
};
const yesterday = dayjs().subtract(ONE_DAY, "day").format("YYYY-MM-DD");
await writeFile(
  CONFIG_FILE,
  applyEdits(configContent, modify(configContent, [COMPATIBILITY_DATE_KEY], yesterday, {})),
  {},
);
if (compatibility_date !== yesterday) {
  globalThis.process.exit(EXIT_CODE_FAILURE);
}
