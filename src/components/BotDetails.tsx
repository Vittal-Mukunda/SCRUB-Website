import Reveal from "./Reveal";
import { Check } from "./Icons";
import type { Bot } from "../data/content";
import { photo } from "../data/photo";

/** Everything about one robot, shown right under the showroom: photos, features and specs. */
export default function BotDetails({ bot }: { bot: Bot }) {
  const hasDraft = bot.features.some((f) => f.draft) || bot.specs.some((s) => s.draft);
  return (
    <section id="details" className="bd" aria-labelledby="bd-title">
      <div className="wrap">
        <Reveal>
          <p className="eyebrow">{bot.id.toUpperCase()} · {bot.status}</p>
          <h2 id="bd-title" className="display display--md">{bot.name}: {bot.purpose}</h2>
          <p className="lead">{bot.summary}</p>
          <dl className="bd__meta">
            <div><dt>Built for</dt><dd>{bot.environment}</dd></div>
            <div><dt>Stage</dt><dd>{bot.status}</dd></div>
          </dl>
        </Reveal>

        <Reveal>
          <h3 className="h2 bd__h">Photos</h3>
          <ul className="bd__photos">
            {bot.photos.map((p) => (
              <li key={p.src}>
                <img {...photo(p.src, "(max-width: 760px) 92vw, 400px")} alt={p.caption} loading="lazy" decoding="async" />
                <span><strong>{p.caption}</strong>{p.credit && <small>{p.credit}</small>}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <div className="bd__lower">
          <div>
            <Reveal><h3 className="h2">Features</h3></Reveal>
            <ul className="features">
              {bot.features.map((f, i) => (
                <Reveal as="li" key={f.title} delay={0.05 * i} className={`feature ${f.draft ? "feature--draft" : ""}`}>
                  <span className="feature__tick"><Check width={16} height={16} /></span>
                  <div>
                    <strong>{f.title}{f.draft && <em className="draft-mark" title="Draft placeholder"> ◇</em>}</strong>
                    <p>{f.text}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>

          <div>
            <Reveal><h3 className="h2">Specifications</h3></Reveal>
            <Reveal delay={0.1}>
              <table className="specs">
                <tbody>
                  {bot.specs.map((s) => (
                    <tr key={s.label} className={s.draft ? "is-draft" : ""}>
                      <th scope="row">{s.label}</th>
                      <td>{s.value}{s.reported && <sup title="As reported in media coverage"> *</sup>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="footnote">
                {bot.specs.some((s) => s.reported) && <>* As reported in published media coverage. </>}
                {hasDraft && <>◇ and “To be confirmed” items are draft placeholders pending team confirmation.</>}
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
