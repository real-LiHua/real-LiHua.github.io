import { type MdastVisitorContext, defineMdastPlugin } from "satteri";
import { type Options as TocOptions, toc as mdastToc } from "mdast-util-toc";

// 将 mdast-util-toc 封装为 Sätteri 插件：在根节点阶段生成目录并注入到 astro.frontmatter.toc

interface TocItem {
  depth: number;
  slug: string;
  text: string;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getType = (node: unknown): string | undefined =>
  isObject(node) && typeof node.type === "string" ? node.type : undefined;

const getChildren = (node: unknown): unknown[] =>
  isObject(node) && Array.isArray(node.children) ? (node.children as unknown[]) : [];

const getPropString = (obj: unknown, key: string): string | undefined =>
  isObject(obj) && typeof obj[key] === "string" ? (obj[key] as string) : undefined;

const extractText = (node: unknown): string => {
  if (!isObject(node)) {
    return "";
  }

  const typeName = getType(node);
  if (typeName === "text" || typeName === "inlineCode") {
    return String((node as Record<string, unknown>).value ?? "");
  }

  const children = getChildren(node);
  if (children.length === 0) {
    return "";
  }

  return children.map((child) => extractText(child)).join("");
};

const extractSlugAndText = (paragraphNode: unknown): { slug: string; text: string } => {
  if (!isObject(paragraphNode)) {
    return { slug: "", text: "" };
  }

  const linkNode = getChildren(paragraphNode).find((child) => getType(child) === "link");
  const linkUrl = linkNode ? getPropString(linkNode, "url") : undefined;
  if (linkUrl) {
    return { slug: linkUrl.replace(/^#/u, ""), text: extractText(linkNode) };
  }

  return { slug: "", text: extractText(paragraphNode) };
};

const handleListItem = (itemNode: unknown, out: TocItem[], depth: number): void => {
  if (!isObject(itemNode)) {
    return;
  }

  const itemChildren = getChildren(itemNode);
  if (itemChildren.length === 0) {
    return;
  }

  // 找到段落节点
  const paragraphNode = itemChildren.find((child) => getType(child) === "paragraph");
  const { slug, text } = extractSlugAndText(paragraphNode ?? null);

  if (text || slug) {
    out.push({ depth, slug, text });
  }
};

const processList = (list: unknown, out: TocItem[], depth = 1): void => {
  if (!isObject(list)) {
    return;
  }
  if (getType(list) !== "list") {
    return;
  }

  const children = getChildren(list);
  if (children.length === 0) {
    return;
  }

  const handleChild = (childNode: unknown): void => {
    const itemChildren = getChildren(childNode);
    handleListItem(childNode, out, depth);

    const nested = itemChildren.find((childNodeInner) => getType(childNodeInner) === "list");
    if (nested) {
      processList(nested, out, depth + 1);
    }
  };

  for (const child of children) {
    handleChild(child);
  }
};

const injectToc = (existing: Record<string, unknown>, tocArray: TocItem[]): void => {
  const astro = (existing["astro"] as Record<string, unknown>) ?? {};
  const frontmatter = (astro["frontmatter"] as Record<string, unknown>) ?? {};
  frontmatter["toc"] = tocArray;
  astro["frontmatter"] = frontmatter;
  existing["astro"] = astro;
};

// 导出给测试或外部使用
export { injectToc };

export const mdastTocPlugin = (options?: TocOptions): ReturnType<typeof defineMdastPlugin> =>
  defineMdastPlugin({
    name: "mdast-toc",
    root(tree: unknown, ctx: MdastVisitorContext): void {
      // 生成 mdast 转换结果
      const result = mdastToc(
        tree as Parameters<typeof mdastToc>[0],
        options as Parameters<typeof mdastToc>[1],
      );

      if (!result || !result.map) {
        return;
      }

      const tocArray: TocItem[] = [];
      processList(result.map, tocArray, 1);

      const existing = ctx.data as Record<string, unknown> | undefined;
      if (existing) {
        injectToc(existing, tocArray);
      }
    },
  });

export default mdastTocPlugin;
