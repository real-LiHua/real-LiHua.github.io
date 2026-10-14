// Table of contents: builds a nested list from article headings and highlights
// the current section while scrolling.

import type { ClientContext } from "@/modules/types";

export const TOC = {
  init(ctx: ClientContext): void {
    const article = ctx.utils.query<HTMLElement>("[data-article]");
    const container = ctx.utils.query<HTMLElement>("[data-toc-container]");
    if (!article || !container) {
      return;
    }

    const headings = Array.from(article.querySelectorAll<HTMLHeadingElement>("h2[id], h3[id]"));
    if (headings.length === 0) {
      container.closest<HTMLElement>("[data-toc]")?.setAttribute("hidden", "");
      return;
    }

    // TOC links may already be server-rendered (from Astro `render().headings`);
    // only build them client-side when absent.
    if (container.querySelector("[data-toc-link]") === null) {
      const list = ctx.document.createElement("ul");
      list.className = "menu menu-sm w-full";
      for (const heading of headings) {
        const item = ctx.document.createElement("li");
        item.style.paddingInlineStart = heading.tagName === "H3" ? "1rem" : "0";
        const link = ctx.document.createElement("a");
        link.href = `#${heading.id}`;
        link.textContent = heading.textContent ?? "";
        link.dataset.tocLink = heading.id;
        item.append(link);
        list.append(item);
      }
      container.replaceChildren(list);
    }

    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>("[data-toc-link]"));
    const byId = new Map(links.map((link) => [link.dataset.tocLink ?? "", link]));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          for (const link of links) {
            link.classList.toggle("menu-active", link.dataset.tocLink === entry.target.id);
          }
        }
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 1 },
    );
    for (const heading of headings) {
      observer.observe(heading);
    }
    void byId;
  },
};
