const THEME_KEY = "theme";
const THEME_DARK = "dark";
const THEME_LIGHT = "light";

const setTheme = (theme: string, persist = true): void => {
  document.documentElement.dataset.theme = theme;
  if (persist) {
    localStorage.setItem(THEME_KEY, theme);
  }
};

const EXT_PREFIX = "data-darkreader";

const isExtensionActive = (): boolean => {
  const { attributes } = document.documentElement;
  for (const attr of attributes) {
    if (attr.name.startsWith(EXT_PREFIX)) {
      return true;
    }
  }
  return false;
};

const observeExtension = (toggle: HTMLElement): void => {
  const update = (): void => {
    toggle.style.visibility = isExtensionActive() ? "hidden" : "";
  };

  update();
  new MutationObserver(update).observe(document.documentElement, {
    attributes: true,
  });
};

document.addEventListener("astro:page-load", () => {
  const tc = document.querySelector<HTMLInputElement>(".theme-controller");

  if (!tc) {
    return;
  }

  if (!isExtensionActive() && localStorage.getItem(THEME_KEY) === THEME_DARK) {
    tc.checked = true;
  }

  tc.addEventListener("change", () => {
    const next = tc.checked ? THEME_DARK : THEME_LIGHT;
    setTheme(next, !isExtensionActive());
  });

  const label = tc.closest("label");
  if (label) {
    observeExtension(label);
  }
});
