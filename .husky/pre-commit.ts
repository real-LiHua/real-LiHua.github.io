import { readFile, writeFile } from "node:fs/promises";
import { applyEdits, modify, parse } from "jsonc-parser";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

console.log("Updating the compatibility date for Wrangler.");

dayjs.extend(utc);
var config = (await readFile("wrangler.jsonc")).toString();
var compatibility_date = parse(config)["compatibility_date"];
var yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
await writeFile(
  "wrangler.jsonc",
  applyEdits(config, modify(config, ["compatibility_date"], yesterday, {})),
  {},
);
console.log("Updated compatibility date for Wrangler.");
if (compatibility_date !== yesterday) {
  process.exit(1);
}
