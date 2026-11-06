import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import Reveal from "../components/Reveal";
import Roadmap from "../components/Roadmap";
import WaterBackdrop from "../components/WaterBackdrop";
import { useInView } from "../components/useInView";
import { usePageMeta } from "../components/usePageMeta";
import { ArrowRight } from "../components/Icons";
import { bots, brand, nextUp, timeline } from "../data/content";
import { photo } from "../data/photo";
import { prefetch } from "../routes";

export default function About() {
  usePageMeta(null);
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

      {/* 3 to 7. THE JOURNEY: the intro slide breaks into leaves, V1 clears them, then one step per robot */}
      <Roadmap />

      {/* 8. WHERE WE ARE NOW, AND WHAT IS NEXT */}
      <section className="slide today" aria-labelledby="today-title">
        <div className="wrap today__grid">
          <div>
            <Reveal>
              <p className="eyebrow">So far</p>
              <h2 id="today-title" className="display">From the first splash to the national press.</h2>
            </Reveal>
            <ol className="path">
              {timeline.map((t, i) => (
                <Reveal as="li" key={t.title} delay={0.08 * i}>
                  <time>{t.when}</time>
                  <strong>{t.title}</strong>
                  <span>{t.text}</span>
                </Reveal>
              ))}
            </ol>
          </div>
          <div className="today__next">
            <Reveal>
              <p className="eyebrow">What is next</p>
            </Reveal>
            <ul>
              {nextUp.map((n, i) => (
                <Reveal as="li" key={n.title} delay={0.1 * i} className="next-card">
                  <strong>{n.title}</strong>
                  <span>{n.text}</span>
                  {import.meta.env.DEV && n.draft && <em className="draft-tag">draft</em>}
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 9. CTA: the robots, each a way into the showroom */}
      <section className="slide cta" aria-labelledby="cta-title">
        <WaterBackdrop intensity="soft" />
        <div className="wrap cta__inner">
          <Reveal>
            <h2 id="cta-title" className="display">Three robots. One mission.</h2>
            <p className="lead lead--center">From big lakes to compact survey boats, see what each SCRUB does.</p>
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
