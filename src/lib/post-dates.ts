import { getGitTimes, type GitTimes } from "./git-times";

export interface PostDateSource {
  filePath?: string;
  data: { publishedAt: Date };
}

export interface PostDates {
  publishedAt: Date;
  updatedAt: Date;
}

export const resolvePostDates = (publishedAt: Date, gitTimes: GitTimes | null): PostDates => ({
  // Git history is the site-wide source of truth for publication dates; the
  // frontmatter date is the fallback for untracked files or missing history.
  publishedAt: gitTimes?.createdAt ?? publishedAt,
  updatedAt: gitTimes?.updatedAt ?? publishedAt,
});

export const getPostDates = (post: PostDateSource): PostDates => {
  const gitTimes = post.filePath ? getGitTimes(post.filePath) : null;
  return resolvePostDates(post.data.publishedAt, gitTimes);
};

export const byNewestFirst = (
  first: PostDateSource & { id: string },
  second: PostDateSource & { id: string },
): number =>
  getPostDates(second).publishedAt.valueOf() - getPostDates(first).publishedAt.valueOf() ||
  first.id.localeCompare(second.id);
