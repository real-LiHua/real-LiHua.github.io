import packageJson from "../../package.json";

// The package manifest is the single configured source for the site's author
// identity, so article metadata and future bylines cannot drift apart.
export const siteAuthor =
  typeof packageJson.author === "string" ? packageJson.author.trim() || undefined : undefined;
