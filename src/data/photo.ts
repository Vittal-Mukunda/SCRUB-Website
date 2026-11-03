import { IMAGES } from "./images.gen";

/**
 * <img> attributes for a photo in /public/media: a srcset so phones and grid thumbnails get the
 * 480px or 800px file, and its pixel size so the page keeps the photo's space before it arrives.
 * `sizes` is how wide the photo is drawn on screen.
 */
export function photo(src: string, sizes: string) {
  const m = IMAGES[src];
  if (!m) return { src };
  if (!m.small.length) return { src, width: m.w, height: m.h };
  const variants = m.small.map((w) => `${src.replace(/\.webp$/, `-${w}.webp`)} ${w}w`);
  return { src, width: m.w, height: m.h, srcSet: [...variants, `${src} ${m.w}w`].join(", "), sizes };
}
