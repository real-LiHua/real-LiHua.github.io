import { readFile, writeFile } from "node:fs/promises";
import { applyEdits, modify } from "jsonc-parser";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

console.log("Updating the compatibility date for Wrangler.");

dayjs.extend(utc);
var config = (await readFile("wrangler.jsonc")).toString();
await writeFile(
  "wrangler.jsonc",
  applyEdits(
    config,
    modify(
      config,
      ["compatibility_date"],
      dayjs().subtract(1, "day").format("YYYY-MM-DD"),
      {},
    ),
  ),
  {},
);

console.log("Updated compatibility date for Wrangler.");
