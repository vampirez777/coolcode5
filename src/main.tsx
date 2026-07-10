import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const HOME_CSS_FILES = [
  "/halal-source/css/1764582d9f137bbe.css",
  "/halal-source/css/a97eacd973338313.css",
  "/halal-source/css/e3ab2e5b8f62e77f.css",
  "/halal-source/css/554f355ae40bfd5a.css",
  "/halal-source/css/inline_styles.css",
  "/halal-source/css/lovable-fixes.css",
];

const DASH_CSS_FILES = [
  "/dash-source/css/1764582d9f137bbe.css",
  "/dash-source/css/a97eacd973338313.css",
  "/dash-source/css/e3ab2e5b8f62e77f.css",
  "/dash-source/css/554f355ae40bfd5a.css",
  "/dash-source/css/155a1be832d0e87e.css",
  "/dash-source/css/inline_styles.css",
  "/dash-source/css/lovable-dash-fixes.css",
];

const loadStyleSheets = (files: string[]) =>
  Promise.all(
    files.map(
      (href) =>
        new Promise<void>((resolve) => {
          const existing = document.querySelector<HTMLLinkElement>(`link[href="${href}"]`);
          if (existing) return resolve();
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = href;
          link.onload = () => resolve();
          link.onerror = () => resolve();
          document.head.appendChild(link);
        }),
    ),
  ).then(() => undefined);

const loadHomeStyles = () => {
  const path = window.location.pathname;
  const dashRoutes = ["/dashboard", "/deals", "/support", "/settings", "/admin", "/worker", "/giveaway"];
  const isDashRoute = dashRoutes.some((route) => path === route || path.startsWith(`${route}/`));
  if (path !== "/" && !isDashRoute) return Promise.resolve();
  document.documentElement.style.background = "#090909";
  document.body.style.background = "#090909";
  const files = isDashRoute ? DASH_CSS_FILES : HOME_CSS_FILES;
  return loadStyleSheets(files);
};

loadHomeStyles().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
