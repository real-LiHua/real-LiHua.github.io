import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { OGImageRoute } from "astro-og-canvas";
import { assertUniqueSeriesPositions } from "../../lib/content-validation";
import { ogImageOptions, type OgImageContent } from "../../lib/og-image";

// OpenGraph images are generated once at build time, even though the site is
// served on demand by the Node adapter.
export const prerender = true;

const posts = (await getCollection("posts")).sort(
  (first, second) =>
    second.data.publishedAt.valueOf() - first.data.publishedAt.valueOf() ||
    first.id.localeCompare(second.id),
);
assertUniqueSeriesPositions(posts);

const topics = new Map(
  posts.flatMap((post) => post.data.topics.map((topic) => [topic.slug, topic.name] as const)),
);
const series = new Map(
  posts.flatMap((post) =>
    post.data.series ? [[post.data.series.id, post.data.series.title] as const] : [],
  ),
);

const pages: Record<string, OgImageContent> = {
  index: {
    title: "李华的博客",
    description: "个人博客阅读预览。",
  },
  posts: {
    title: "文章",
    description: "按时间排列的文章索引与筛选。",
  },
  series: {
    title: "文章系列",
    description: "按主题串联的系列文章。",
  },
};

for (const post of posts) {
  pages[`posts/${post.id}`] = {
    title: post.data.title,
    description: post.data.isPreview
      ? `预览示例 · ${post.data.description}`
      : post.data.description,
  };
}

for (const [slug, name] of topics) {
  pages[`topics/${slug}`] = {
    title: name,
    description: `「${name}」主题下的文章。`,
  };
}

for (const [id, title] of series) {
  pages[`series/${id}`] = {
    title,
    description: `系列文章：${title}。`,
  };
}

const ogRoute = await OGImageRoute({
  pages,
  getImageOptions: (_path, page) => ogImageOptions(page),
});

export const getStaticPaths = ogRoute.getStaticPaths;

// `OGImageRoute` returns the encoded image without a content type. Static
// builds serve the prerendered file with `image/png`; the dev server and any
// on-demand rendering need the header set explicitly.
export const GET: APIRoute = async (context) => {
  const response = await ogRoute.GET(context);
  response.headers.set("Content-Type", "image/png");
  return response;
};
