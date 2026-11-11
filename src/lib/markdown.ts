import { satteri } from "@astrojs/markdown-satteri";
import { mermaidHast, mermaidMdast } from "@xingwangzhe/satteri-mermaid";

/**
 * Diagram colors reuse the site palette via CSS variables (with literal fallbacks) so build-time
 * SVG follows the light/dark theme at view time.
 *
 * `responsive: false` keeps element dimensions in the SVG: the plugin's responsive transform strips
 * every `width`/`height` attribute, which erases node `<rect>` geometry. Scaling is handled in
 * `global.css` instead (`.mermaid svg { max-width: 100%; height: auto; }`).
 */
const mermaidTheme = {
  theme: "modern",
  responsive: false,
  font: "Maple Mono Normal NF CN, Noto Sans CJK SC, monospace",
  themeOverrides: {
    background: "var(--background, #fff)",
    primaryColor: "var(--muted, #eee)",
    secondaryColor: "var(--secondary, #e5e5e5)",
    tertiaryColor: "var(--accent, #e8e8e8)",
    primaryTextColor: "var(--foreground, #111)",
    textColor: "var(--muted-foreground, #666)",
    primaryBorderColor: "var(--primary, #4c7c54)",
    lineColor: "var(--primary, #4c7c54)",
    edgeLabelBackground: "var(--card, #fff)",
    clusterBackground: "var(--card, #fff)",
    clusterBorder: "var(--border, #ccc)",
    sequenceActorFill: "var(--muted, #eee)",
    sequenceActorBorder: "var(--primary, #4c7c54)",
    sequenceActorLine: "var(--border, #ccc)",
    sequenceNoteFill: "var(--accent, #e8e8e8)",
    sequenceNoteBorder: "var(--primary, #4c7c54)",
    sequenceActivationFill: "var(--secondary, #e5e5e5)",
    sequenceActivationBorder: "var(--primary, #4c7c54)",
  },
} as const;

export const markdownProcessor = satteri({
  mdastPlugins: [mermaidMdast()],
  hastPlugins: [mermaidHast(mermaidTheme)],
});
