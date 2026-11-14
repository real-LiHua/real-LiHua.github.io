import type { OGImageOptions } from "astro-og-canvas";
import { OG_FONT_FAMILY, resolveMapleFontPath } from "./og-font";

type RGBColor = [r: number, g: number, b: number];

/** Design tokens from DESIGN.md converted to the RGB values CanvasKit expects. */
const colors = {
  background: [248, 247, 241] as RGBColor,
  card: [252, 252, 249] as RGBColor,
  foreground: [27, 33, 25] as RGBColor,
  mutedForeground: [83, 91, 81] as RGBColor,
  primary: [66, 97, 64] as RGBColor,
};

export interface OgImageContent {
  title: string;
  description?: string;
}

let mapleFontPath: string | undefined;
const mapleFont = (): string => (mapleFontPath ??= resolveMapleFontPath());

/** Build the branded 1200×630 card shared by every OpenGraph image. */
export function ogImageOptions(
  { title, description }: OgImageContent,
  fontPath: string = mapleFont(),
): OGImageOptions {
  return {
    title,
    description,
    bgGradient: [colors.card, colors.background],
    border: { color: colors.primary, width: 12, side: "inline-start" },
    padding: 72,
    fonts: [fontPath],
    font: {
      title: {
        color: colors.foreground,
        size: 64,
        lineHeight: 1.25,
        families: [OG_FONT_FAMILY],
      },
      description: {
        color: colors.mutedForeground,
        size: 34,
        lineHeight: 1.5,
        families: [OG_FONT_FAMILY],
      },
    },
  };
}
