const glyph = (codePoint: number) => String.fromCodePoint(codePoint);

/** Nerd Font (Font Awesome) glyphs bundled with Maple Mono NF. */
export const iconGlyphs = {
  search: glyph(0xf002),
  close: glyph(0xf00d),
  home: glyph(0xf015),
  fileText: glyph(0xf0f6),
  arrowLeft: glyph(0xf060),
  arrowRight: glyph(0xf061),
  list: glyph(0xf03a),
  book: glyph(0xf02d),
  copy: glyph(0xf0c5),
  link: glyph(0xf0c1),
  rss: glyph(0xf09e),
  archive: glyph(0xf187),
  sun: glyph(0xf185),
  moon: glyph(0xf186),
} as const;

export type IconName = keyof typeof iconGlyphs;
