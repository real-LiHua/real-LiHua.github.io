// UI Components — deep module.
//
// A small contract for view helpers shared by Astro components, so component
// files do not each re-implement class concatenation or URL building.

export interface UIComponents {
  /** Join truthy class names. */
  cx(...classes: Array<string | false | null | undefined>): string;
  /** Canonical post URL. */
  postHref(id: string): string;
  /** Canonical tag URL. */
  tagHref(tag: string): string;
}

const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(" ");

export const uiComponents: UIComponents = {
  cx,
  postHref: (id) => `/posts/${id}/`,
  tagHref: (tag) => `/tags/${encodeURIComponent(tag)}/`,
};
