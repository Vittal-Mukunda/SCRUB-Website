/**
 * Page chunks. About (the landing page) ships in the main bundle; the others load on demand
 * and are fetched early when a visitor points at their nav link (see Layout).
 */
export const loadProducts = () => import("./pages/Products");
export const loadImpact = () => import("./pages/Impact");
export const loadContact = () => import("./pages/Contact");
export const loadNotFound = () => import("./pages/NotFound");
/** the three.js showroom: the heaviest download on the site */
export const loadShowcase = () => import("./three/Showcase");

const PREFETCH: Record<string, () => Promise<unknown>[]> = {
  "/products": () => [loadProducts(), loadShowcase()],
  "/impact": () => [loadImpact()],
  "/contact": () => [loadContact()],
};

const done = new Set<string>();

/** Starts downloading a page's code (once). Failures are ignored: navigation retries anyway. */
export function prefetch(path: string) {
  if (done.has(path) || !PREFETCH[path]) return;
  done.add(path);
  PREFETCH[path]().forEach((p) => p.catch(() => done.delete(path)));
}

/** After the first page has settled, fetch the small pages in the background so they open instantly. */
export function prefetchWhenIdle() {
  const run = () => {
    prefetch("/impact");
    prefetch("/contact");
  };
  if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2500);
}
