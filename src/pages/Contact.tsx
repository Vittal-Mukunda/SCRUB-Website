import { useState } from "react";
import type { FormEvent } from "react";
import Reveal from "../components/Reveal";
import { Check, Mail, Pin } from "../components/Icons";
import { socialIcon } from "../components/socialIcon";
import { contact, socials } from "../data/content";

interface FormState {
  name: string;
  email: string;
  org: string;
  type: string;
  message: string;
}

const EMPTY: FormState = { name: "", email: "", org: "", type: contact.enquiryTypes[0], message: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Contact() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [sent, setSent] = useState(false);

  const set = (k: keyof FormState) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (form.name.trim().length < 2) next.name = "Please tell us your name.";
    if (!EMAIL_RE.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (form.message.trim().length < 10) next.message = "A few words about what you have in mind, please.";
    setErrors(next);
    if (Object.keys(next).length) return;

    // No backend yet: hand the enquiry to the visitor's email app, addressed to the team.
    const subject = `[SCRUB website] ${form.type}: ${form.name.trim()}`;
    const lines = [`Name: ${form.name.trim()}`, `Email: ${form.email.trim()}`];
    if (form.org.trim()) lines.push(`Organisation: ${form.org.trim()}`);
    lines.push(`Enquiry: ${form.type}`, "", form.message.trim());
    const body = lines.join("\n");
    window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <Reveal>
            <p className="eyebrow">Contact</p>
            <h1 className="display">Let&rsquo;s clean a lake together.</h1>
            <p className="lead">
              Sponsor us, bring SCRUB to your lake, invite us to speak or join the team. We read every message.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section section--tight">
        <div className="wrap contact">
          <Reveal className="contact__panel">
            {sent ? (
              <div className="sent" role="status">
                <span className="sent__tick"><Check width={28} height={28} /></span>
                <h2 className="h2">Your email app should be opening.</h2>
                <p>
                  Press send there to reach us. If nothing opened, write to{" "}
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>.
                </p>
                <button className="btn btn--ghost" onClick={() => { setSent(false); setForm(EMPTY); }}>
                  Write another message
                </button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="form">
                <div className="form__row">
                  <label>
                    <span>Your name</span>
                    <input value={form.name} onChange={set("name")} autoComplete="name" aria-invalid={!!errors.name} />
                    {errors.name && <small className="form__err">{errors.name}</small>}
                  </label>
                  <label>
                    <span>Email</span>
                    <input type="email" value={form.email} onChange={set("email")} autoComplete="email" aria-invalid={!!errors.email} />
                    {errors.email && <small className="form__err">{errors.email}</small>}
                  </label>
                </div>
                <div className="form__row">
                  <label>
                    <span>Organisation <em>(optional)</em></span>
                    <input value={form.org} onChange={set("org")} autoComplete="organization" />
                  </label>
                  <label>
                    <span>I&rsquo;m writing about</span>
                    <select value={form.type} onChange={set("type")}>
                      {contact.enquiryTypes.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </label>
                </div>
                <label>
                  <span>Message</span>
                  <textarea rows={6} value={form.message} onChange={set("message")} aria-invalid={!!errors.message} />
                  {errors.message && <small className="form__err">{errors.message}</small>}
                </label>
                <button type="submit" className="btn btn--accent btn--lg">Send message</button>
                <p className="form__note">This opens your email app with the message ready to send to our team.</p>
              </form>
            )}
          </Reveal>

          <Reveal delay={0.1} className="contact__side">
            <div className="info-card">
              <Mail />
              <div><small>Email</small><a href={`mailto:${contact.email}`}>{contact.email}</a></div>
            </div>
            <div className="info-card">
              <Pin />
              <div><small>Where we are</small><span>{contact.location}</span></div>
            </div>
            <div className="info-card info-card--col">
              <small>Follow SCRUB</small>
              <ul className="chips">
                {socials.map((s) => {
                  const Icon = socialIcon(s.name);
                  return (
                    <li key={s.name}>
                      <a href={s.href} target="_blank" rel="noopener noreferrer"><Icon width={16} height={16} /> {s.handle}</a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
