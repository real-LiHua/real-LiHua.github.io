export interface ArticleMetadataInput {
  publishedAt: Date;
  updatedAt?: Date;
  series?: { title: string };
  topics: { name: string }[];
}

export interface ArticleMetadataOptions {
  author?: string;
}

export interface ArticleMetadata {
  publishedTime: Date;
  modifiedTime: Date;
  author?: string;
  section?: string;
  tags: string[];
}

export const buildArticleMetadata = (
  input: ArticleMetadataInput,
  options: ArticleMetadataOptions = {},
): ArticleMetadata => {
  const author = options.author?.trim();
  const section = input.series?.title.trim();
  const tags = input.topics.map((topic) => topic.name.trim()).filter((name) => name.length > 0);

  return {
    publishedTime: input.publishedAt,
    modifiedTime: input.updatedAt ?? input.publishedAt,
    ...(author ? { author } : {}),
    ...(section ? { section } : {}),
    tags,
  };
};
