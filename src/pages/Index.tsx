import { useEffect } from "react";
import { clonedHomeHTML } from "./homeCloned";

const arrowSvg = (color: string) => `
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M6 15L15 6M8 6h7v7" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

const plusSvg = `
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
  </svg>
`;

const menuSvg = `
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
  </svg>
`;

const patchMaskedIcons = (root: HTMLElement) => {
  root.querySelectorAll<HTMLElement>('span[style*="mask-image"]').forEach((icon) => {
    const style = icon.getAttribute("style") ?? "";
    icon.removeAttribute("style");
    icon.classList.add("landing-inline-svg-icon");

    if (style.includes("width:21px")) {
      const color = icon.closest(".landing-hero__cta-primary") ? "#090909" : "#FFFFFF";
      icon.innerHTML = arrowSvg(color);
      return;
    }

    if (style.includes("width:20px")) {
      icon.innerHTML = plusSvg;
      return;
    }

    if (style.includes("width:24px")) {
      icon.innerHTML = menuSvg;
    }
  });
};

const wireFaqToggles = (root: HTMLElement) => {
  const cleanup: Array<() => void> = [];

  root.querySelectorAll<HTMLButtonElement>(".landing-faq__item button[aria-controls]").forEach((button) => {
    const answerId = button.getAttribute("aria-controls");
    const answer = answerId ? root.querySelector<HTMLElement>(`[id="${answerId}"]`) : null;
    if (!answer) return;

    const onClick = () => {
      const nextExpanded = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(nextExpanded));
      answer.style.setProperty("--landing-faq-rows", nextExpanded ? "1fr" : "0fr");
    };

    button.addEventListener("click", onClick);
    cleanup.push(() => button.removeEventListener("click", onClick));
  });

  return cleanup;
};

const Index = () => {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".cloned-home");
    if (!root) return;

    root.querySelectorAll(".landing-reveal").forEach((item) => {
      item.classList.add("landing-reveal--visible");
    });
    patchMaskedIcons(root);
    const cleanupFaq = wireFaqToggles(root);

    return () => cleanupFaq.forEach((cleanup) => cleanup());
  }, []);

  return (
    <div
      className="cloned-home"
      dangerouslySetInnerHTML={{ __html: clonedHomeHTML }}
    />
  );
};

export default Index;
