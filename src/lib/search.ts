import { create, insertMultiple, save, type RawData } from "@orama/orama";
import { searchSchema } from "./search-config";
import { createSearchTokenizer } from "./search-tokenizer";

export interface SearchablePost {
  id: string;
  body?: string;
  data: {
    title: string;
    description: string;
    isPreview: boolean;
    topics: { name: string }[];
  };
}

export interface SearchDocument {
  title: string;
  description: string;
  body: string;
  topics: string;
  url: string;
  isPreview: boolean;
}

export function createSearchDatabase() {
  return create({
    schema: searchSchema,
    components: { tokenizer: createSearchTokenizer() },
  });
}

export function stripMarkdownForSearch(markdown: string): string {
  return markdown
    .replaceAll(/<!--[\s\S]*?-->/gu, " ")
    .replaceAll(/^```[^\n]*$/gmu, " ")
    .replaceAll(/!\[(?<alt>[^\]]*)\]\([^)]*\)/gu, "$<alt>")
    .replaceAll(/\[(?<text>[^\]]+)\]\([^)]*\)/gu, "$<text>")
    .replaceAll(/\[(?<refText>[^\]]+)\]\[[^\]]*\]/gu, "$<refText>")
    .replaceAll(/^#{1,6}\s+/gmu, "")
    .replaceAll(/^\s*>\s?/gmu, "")
    .replaceAll(/^\s*[-+*]\s+/gmu, "")
    .replaceAll(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gmu, " ")
    .replaceAll(/[`*_~]/gu, "")
    .replaceAll(/<[^>]+>/gu, " ")
    .replaceAll(/\s+/gu, " ")
    .trim();
}

export function buildSearchIndex(posts: SearchablePost[]): RawData {
  const database = createSearchDatabase();

  insertMultiple(
    database,
    posts.map(
      (post): SearchDocument => ({
        title: post.data.title,
        description: post.data.description,
        body: stripMarkdownForSearch(post.body ?? ""),
        topics: post.data.topics.map((topic) => topic.name).join(" "),
        url: `/posts/${post.id}/`,
        isPreview: post.data.isPreview,
      }),
    ),
  );

  return save(database);
}
