export const searchSchema = {
  title: "string",
  description: "string",
  body: "string",
  topics: "string",
  url: "string",
  isPreview: "boolean",
} as const;

export const searchProperties = ["title", "description", "body", "topics"] as const;
