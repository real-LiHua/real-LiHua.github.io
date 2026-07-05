const THEME_KEY = "theme";
const THEME_DARK = "dark";
const THEME_LIGHT = "light";

const setTheme = (theme: string): void => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
};

document.addEventListener("astro:page-load", () => {
  const tc = document.querySelector<HTMLInputElement>(".theme-controller");

  if (!tc) {
    return;
  }

  if (localStorage.getItem(THEME_KEY) === THEME_DARK) {
    tc.checked = true;
  }

  tc.addEventListener("change", () => {
    const next = tc.checked ? THEME_DARK : THEME_LIGHT;
    setTheme(next);
  });
});
