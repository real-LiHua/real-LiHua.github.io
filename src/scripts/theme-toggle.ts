document.addEventListener("astro:page-load", () => {
  const tc = document.querySelector(".theme-controller") as HTMLInputElement;

  if (localStorage.getItem("theme") === "dark") {
    tc.checked = true;
  }

  tc.addEventListener("change", () => {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.dataset.theme = "light";
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.dataset.theme = "dark";
      localStorage.setItem("theme", "dark");
    }
  });
});
