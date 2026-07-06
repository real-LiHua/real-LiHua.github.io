const handleImg = (img: HTMLImageElement, fallbackSrc: string): void => {
  const onFirstError = (): void => {
    img.removeEventListener("error", onFirstError);
    img.src = fallbackSrc;
    img.addEventListener("error", () => {
      img.style.display = "none";
    });
  };
  img.addEventListener("error", onFirstError);
};

const initGravatarFallback = (): void => {
  for (const img of document.querySelectorAll<HTMLImageElement>("img[data-gravatar-fallback]")) {
    const fallbackSrc = img.dataset.gravatarFallback;
    if (fallbackSrc) {
      handleImg(img, fallbackSrc);
    }
  }
};

document.addEventListener("astro:page-load", initGravatarFallback);
