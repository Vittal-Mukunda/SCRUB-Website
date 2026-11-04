import { useEffect } from "react";

const BRAND = "S.C.R.U.B. Robotics";
const HOME_TITLE = `${BRAND} | Clean waters, cleaner future`;

function meta(name: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  return el;
}

/**
 * Gives each route its own tab title and description (a single-page app otherwise keeps the home page's
 * for every URL), and keeps pages that should not be listed, like the 404, out of search results.
 * `title: null` is the home page. Everything is put back when the page unmounts.
 */
export function usePageMeta(title: string | null, description?: string, noindex = false) {
  useEffect(() => {
    document.title = title ? `${title} | ${BRAND}` : HOME_TITLE;

    const desc = description ? meta("description") : null;
    const prevDesc = desc?.content;
    if (desc && description) desc.content = description;

    const robots = noindex ? meta("robots") : null;
    if (robots) robots.content = "noindex";

    return () => {
      if (desc && prevDesc !== undefined) desc.content = prevDesc;
      robots?.remove();
    };
  }, [title, description, noindex]);
}
