// Code copy: injects a copy button into every highlighted `<pre>` block.

import type { ClientContext } from "@/modules/types";

export const CodeCopy = {
  init(ctx: ClientContext): void {
    const blocks = ctx.utils.queryAll<HTMLPreElement>("article pre");
    for (const block of blocks) {
      if (block.dataset.copyBound === "true") {
        continue;
      }
      block.dataset.copyBound = "true";

      const button = ctx.document.createElement("button");
      button.type = "button";
      button.className = "btn btn-xs btn-ghost absolute end-2 top-2 opacity-0 hover:opacity-100";
      button.textContent = "复制";
      button.setAttribute("aria-label", "复制代码");

      ctx.utils.on(button, "click", async () => {
        const code = block.querySelector("code")?.textContent ?? "";
        try {
          await ctx.window.navigator.clipboard.writeText(code);
          button.textContent = "已复制";
          setTimeout(() => {
            button.textContent = "复制";
          }, 1500);
        } catch {
          button.textContent = "复制失败";
        }
      });

      block.style.position = "relative";
      block.append(button);
    }
  },
};
