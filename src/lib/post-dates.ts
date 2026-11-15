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

// Preview sample posts live in the parent repository only for tests; their
// git dates are repo-maintenance artifacts, not publication dates. They are
// excluded here so their frontmatter publishedAt applies, mirroring the real
// articles in the content submodule (invisible to the parent `git log`).
const FIXTURE_PATTERN = /(^|[\\/])tests[\\/]fixtures[\\/]/u;

export const getPostDates = (post: PostDateSource): PostDates => {
  const gitTimes =
    post.filePath && !FIXTURE_PATTERN.test(post.filePath) ? getGitTimes(post.filePath) : null;
  return resolvePostDates(post.data.publishedAt, gitTimes);
};

export const byNewestFirst = (
  first: PostDateSource & { id: string },
  second: PostDateSource & { id: string },
): number =>
  getPostDates(second).publishedAt.valueOf() - getPostDates(first).publishedAt.valueOf() ||
  first.id.localeCompare(second.id);
