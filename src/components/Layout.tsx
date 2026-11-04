import { Suspense, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import Logo from "./Logo";
import { Close, Menu } from "./Icons";
import { socialIcon } from "./socialIcon";
import { brand, contact, socials } from "../data/content";
import { prefetch, prefetchWhenIdle } from "../routes";

const YEAR = new Date().getFullYear();

const NAV = [
  { to: "/", label: "About", end: true },
  { to: "/products", label: "Products", end: false },
  { to: "/impact", label: "Impact", end: true },
  { to: "/contact", label: "Contact", end: true },
];

export default function Layout() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  // the phone menu belongs to the page it was opened on, so changing page closes it
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (v: boolean) => setOpenAt(v ? pathname : null);

  const mainRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstRoute = useRef(true);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    // keyboard and screen-reader users start the new page from its top, not from the link they pressed
    if (firstRoute.current) firstRoute.current = false;
    else mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  // the phone menu: Escape closes it (back to its button), and so does growing into the desktop layout
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenAt(null);
      toggleRef.current?.focus();
    };
    const wide = window.matchMedia("(min-width: 861px)");
    const onWide = () => wide.matches && setOpenAt(null);
    window.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(prefetchWhenIdle, []);

  // The home page already shows the big logo at the top, so the nav logo only appears after scrolling.
  const hideBrand = pathname === "/" && !scrolled && !open;

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className={`nav ${scrolled || open ? "nav--solid" : ""}`}>
        <div className="nav__inner">
          <Link to="/" className={`nav__brand ${hideBrand ? "is-hidden" : ""}`} tabIndex={hideBrand ? -1 : undefined}>
            <Logo variant="full" />
          </Link>

          <nav className={`nav__links ${open ? "is-open" : ""}`} aria-label="Primary" onClick={() => setOpen(false)}>
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => `nav__link ${isActive ? "is-active" : ""}`}
                onPointerEnter={() => prefetch(n.to)}
                onFocus={() => prefetch(n.to)}
                onTouchStart={() => prefetch(n.to)}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <button
            ref={toggleRef}
            className="nav__toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <Close /> : <Menu />}
          </button>
        </div>
      </header>

      <main id="main" ref={mainRef} tabIndex={-1}>
        <Suspense fallback={<div className="route-wait" />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="footer">
        <div className="wrap footer__grid">
          <div className="footer__brand">
            <Logo variant="full" />
            <p>{brand.tagline}</p>
            <p className="footer__muted">Student-led, Bengaluru.</p>
          </div>
          <div>
            <h2>Explore</h2>
            <ul>
              {NAV.map((n) => (
                <li key={n.to}><Link to={n.to}>{n.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Follow</h2>
            <ul>
              {socials.map((s) => {
                const Icon = socialIcon(s.name);
                return (
                  <li key={s.name}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer"><Icon width={16} height={16} /> {s.name}</a>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h2>Write to us</h2>
            <ul>
              <li><a href={`mailto:${contact.email}`}>{contact.email}</a></li>
              <li className="footer__muted">{contact.location}</li>
            </ul>
          </div>
        </div>
        <div className="wrap footer__bar">
          <span>© {YEAR} S.C.R.U.B. Robotics</span>
          <span>Clean water for every lake.</span>
        </div>
      </footer>
    </>
  );
}
