const MAX_TILT = 8,
 TRANSITION_DURATION = 200,

 prefersReducedMotion = (): boolean =>
  globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches,

 getTiltRotation = (
  event: MouseEvent,
  element: HTMLElement,
): { rotateX: number; rotateY: number } => {
  const rect = element.getBoundingClientRect(),
   centerX = rect.left + rect.width / 2,
   centerY = rect.top + rect.height / 2,
   deltaX = (event.clientX - centerX) / (rect.width / 2),
   deltaY = (event.clientY - centerY) / (rect.height / 2);
  return { rotateX: -deltaY * MAX_TILT, rotateY: deltaX * MAX_TILT };
},

 initTilt = (card: HTMLElement): void => {
  card.addEventListener("mouseenter", () => {
    if (prefersReducedMotion()) {
      return;
    }
    card.style.transition = `transform ${TRANSITION_DURATION}ms ease-out`;
  });

  card.addEventListener("mousemove", (event: MouseEvent) => {
    if (prefersReducedMotion()) {
      return;
    }
    const { rotateX, rotateY } = getTiltRotation(event, card);
    card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    card.style.transition = "none";
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "perspective(600px) rotateX(0deg) rotateY(0deg)";
    card.style.transition = `transform ${TRANSITION_DURATION}ms ease-out`;
  });
},

 initTiltCards = (): void => {
  for (const card of document.querySelectorAll<HTMLElement>(".tilt-card")) {
    initTilt(card);
  }
};

document.addEventListener("astro:page-load", initTiltCards);
