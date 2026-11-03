import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import Reveal from "../components/Reveal";
import CountUp from "../components/CountUp";
import WaterBackdrop from "../components/WaterBackdrop";
import { useInView } from "../components/useInView";
import { ArrowRight } from "../components/Icons";
import { bots, brand, founders, funding } from "../data/content";
import { photo } from "../data/photo";
import { prefetch } from "../routes";

function initials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  return (parts[0]?.[0] ?? "S") + (parts[1]?.[0] ?? "");
}

export default function About() {
  const [videoOk, setVideoOk] = useState(true);
  const missionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // the 3 MB footage waits until the first screen has finished loading (or the visitor scrolls to it)
  // so it never competes with the page itself, and only plays while the slide is on screen
  const reachedMission = useInView(missionRef, { once: true, margin: "0px 0px -10% 0px" });
  const missionOnScreen = useInView(missionRef);
  const [warm, setWarm] = useState(false);
  const nearMission = reachedMission || warm;

  useEffect(() => {
    const t = setTimeout(() => setWarm(true), 3500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (missionOnScreen) v.play().catch(() => {});
    else v.pause();
  }, [missionOnScreen, nearMission]);

  /** Story slides: scroll stops on each slide instead of gliding through. */
  useEffect(() => {
    document.documentElement.classList.add("snap");
    return () => document.documentElement.classList.remove("snap");
  }, []);

  return (
    <>
      {/* 1. HERO */}
      <section className="slide hero" aria-labelledby="hero-title">
        <WaterBackdrop />
        <div className="hero__content">
          <h1 id="hero-title" className="hero__logo">
            <Logo variant="full" className="logo--hero" />
          </h1>
          <Reveal delay={0.25}>
            <p className="hero__tagline">{brand.tagline}</p>
            <p className="hero__sub">{brand.subline}</p>
          </Reveal>
        </div>
        <a className="hero__scroll" href="#mission" aria-label="Scroll to our mission">
          <span>Scroll</span>
          <i />
        </a>
      </section>

      {/* 2. MISSION: text on the left, full-bleed working footage behind */}
      <section ref={missionRef} id="mission" className="slide mission" aria-labelledby="mission-title">
        <div className="mission__media" aria-hidden="true">
          <div className="mission__photo" />
          {videoOk && nearMission && (
            <video
              ref={videoRef}
              className="mission__video"
              src={brand.videoSrc}
              muted
              loop
              playsInline
              preload="auto"
              onError={() => setVideoOk(false)}
            />
          )}
          <div className="mission__scrim" />
        </div>
        <div className="wrap mission__grid">
          <div className="mission__text">
            <Reveal>
              <p className="eyebrow">Our mission</p>
              <h2 id="mission-title" className="display mission__title">Bring every lake back to life.</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="lead">{brand.mission}</p>
            </Reveal>
            <Reveal delay={0.2}>
              <ul className="pillars">
                {brand.pillars.map((p) => (
                  <li key={p.k}>
                    <span className="pillars__k">{p.k}</span>
                    <div>
                      <strong>{p.title}</strong>
                      <span>{p.text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <p className="mission__caption">SCRUB deployed on Madiwala Lake</p>
        </div>
      </section>

      {/* 3. FUNDING: full-bleed split, the amount on deep green, backers beside it */}
      <section className="slide funding" aria-labelledby="funding-title">
        <div className="funding__panel">
          <Reveal className="funding__figure">
            <p className="eyebrow">Backed to build</p>
            <h2 id="funding-title" className="sr-only">Funding raised</h2>
            <div className="funding__amount" aria-label={`${funding.amount} ${funding.unit} raised`}>
              <span className="funding__cur">₹</span>
              <CountUp to={funding.amount} />
              <span className="funding__unit">{funding.unit}</span>
            </div>
            <p className="funding__caption">
              raised across <strong>{funding.sponsorCount} sponsors &amp; stakeholders</strong>, funding our field trials, our
              fleet and the next generation of SCRUB.
            </p>
            <ul className="funding__uses" aria-label="What the funding goes into">
              <li>Field trials</li>
              <li>Our fleet</li>
              <li>The next SCRUB</li>
            </ul>
          </Reveal>
        </div>

        <div className="funding__side">
          <div className="funding__backers">
            <Reveal>
              <h3 className="funding__h">Our backers</h3>
            </Reveal>
            <ul className="sponsors">
              {funding.sponsors.map((s, i) => (
                <Reveal as="li" key={i} delay={0.1 * i} className="sponsor">
                  <span className="sponsor__logo" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{s.name}</strong>
                    <span>{s.kind}</span>
                  </div>
                  {import.meta.env.DEV && s.draft && <em className="draft-tag">placeholder</em>}
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 4. FOUNDERS */}
      <section className="slide founders" aria-labelledby="founders-title">
        <div className="wrap">
          <Reveal>
            <p className="eyebrow">The team behind SCRUB</p>
            <h2 id="founders-title" className="display">Meet the founders.</h2>
          </Reveal>
          <ul className="founders__grid">
            {founders.map((f, i) => (
              <Reveal as="li" key={i} delay={0.12 * i} className="founder">
                <div className="founder__photo">
                  {f.photo ? (
                    <img src={f.photo} alt={f.name} loading="lazy" />
                  ) : (
                    <span aria-hidden="true">{initials(f.name)}</span>
                  )}
                </div>
                <h3>{f.name}</h3>
                <p className="founder__role">{f.role}</p>
                <p className="founder__bio">{f.bio}</p>
                {import.meta.env.DEV && <em className="draft-tag draft-tag--dark">placeholder</em>}
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. CTA: the four robots, each a way into the showroom */}
      <section className="slide cta" aria-labelledby="cta-title">
        <WaterBackdrop intensity="soft" />
        <div className="wrap cta__inner">
          <Reveal>
            <h2 id="cta-title" className="display">Four robots. One mission.</h2>
            <p className="lead lead--center">From big lakes to flowing canals, see what each SCRUB does.</p>
          </Reveal>
          <ul className="cta__bots">
            {bots.map((b, i) => (
              <Reveal as="li" key={b.id} delay={0.08 * i}>
                <Link to={`/products?bot=${b.id}`} className="cta-bot" onPointerEnter={() => prefetch("/products")} onFocus={() => prefetch("/products")}>
                  <span className="cta-bot__media">
                    <img {...photo(b.cover, "(max-width: 860px) 46vw, 280px")} alt="" loading="lazy" decoding="async" style={{ objectPosition: b.focus }} />
                  </span>
                  <span className="cta-bot__text">
                    <span className="cta-bot__id">{b.id.toUpperCase()}</span>
                    <strong>{b.name}</strong>
                    <span className="cta-bot__purpose">{b.purpose}</span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </ul>
          <Reveal delay={0.2}>
            <Link to="/products" className="btn btn--accent btn--lg" onPointerEnter={() => prefetch("/products")} onFocus={() => prefetch("/products")}>
              Explore products <ArrowRight />
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
