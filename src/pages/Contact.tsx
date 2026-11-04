import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Reveal from "../components/Reveal";
import { usePageMeta } from "../components/usePageMeta";
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
/** the message field's cap: the whole message travels inside a mailto: link, which some email apps cut off near 2,000 characters */
const MAX_MESSAGE = 1000;
const MAX_MAILTO = 2000;

export default function Contact() {
  usePageMeta("Contact", "Sponsor S.C.R.U.B. Robotics, bring a SCRUB robot to your lake, invite the team to speak or join us. We read every message.");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [sent, setSent] = useState(false);
  const sentHeading = useRef<HTMLHeadingElement>(null);

  // the form has been replaced by the confirmation: take the keyboard and screen reader to it
  useEffect(() => {
    if (sent) sentHeading.current?.focus();
  }, [sent]);

  const set = (k: keyof FormState) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const next: typeof errors = {};
    if (form.name.trim().length < 2) next.name = "Please tell us your name.";
    if (!EMAIL_RE.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (form.message.trim().length < 10) next.message = "A few words about what you have in mind, please.";

    // No backend yet: hand the enquiry to the visitor's email app, addressed to the team.
    const subject = `[SCRUB website] ${form.type}: ${form.name.trim()}`;
    const lines = [`Name: ${form.name.trim()}`, `Email: ${form.email.trim()}`];
    if (form.org.trim()) lines.push(`Organisation: ${form.org.trim()}`);
    lines.push(`Enquiry: ${form.type}`, "", form.message.trim());
    const href = `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
    if (!next.message && href.length > MAX_MAILTO) next.message = `That is too long for an email link: please shorten it, or write to ${contact.email}.`;

    setErrors(next);
    // keyboard and screen-reader users land on the first thing to fix
    const first = (["name", "email", "message"] as const).find((k) => next[k]);
    if (first) {
      (formEl.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    window.location.href = href;
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
                <h2 ref={sentHeading} tabIndex={-1} className="h2">Your email app should be opening.</h2>
                <p>
                  Press send there to reach us. If nothing opened, write to{" "}
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>.
                </p>
                <div className="sent__actions">
                  {/* nothing opened? the message is still here to adjust and send again */}
                  <button className="btn btn--ghost" onClick={() => setSent(false)}>Back to my message</button>
                  <button className="btn btn--ghost" onClick={() => { setSent(false); setForm(EMPTY); }}>Write another message</button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="form">
                <div className="form__row">
                  <label>
                    <span>Your name</span>
                    <input name="name" required maxLength={80} value={form.name} onChange={set("name")} autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "err-name" : undefined} />
                    {errors.name && <small id="err-name" className="form__err">{errors.name}</small>}
                  </label>
                  <label>
                    <span>Email</span>
                    <input name="email" type="email" required maxLength={120} value={form.email} onChange={set("email")} autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "err-email" : undefined} />
                    {errors.email && <small id="err-email" className="form__err">{errors.email}</small>}
                  </label>
                </div>
                <div className="form__row">
                  <label>
                    <span>Organisation <em>(optional)</em></span>
                    <input name="org" maxLength={120} value={form.org} onChange={set("org")} autoComplete="organization" />
                  </label>
                  <label>
                    <span>I&rsquo;m writing about</span>
                    <select name="type" value={form.type} onChange={set("type")}>
                      {contact.enquiryTypes.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </label>
                </div>
                <label>
                  <span>Message</span>
                  <textarea name="message" required rows={6} maxLength={MAX_MESSAGE} value={form.message} onChange={set("message")} aria-invalid={!!errors.message} aria-describedby={errors.message ? "err-message" : undefined} />
                  {errors.message && <small id="err-message" className="form__err">{errors.message}</small>}
                </label>
                <button type="submit" className="btn btn--accent btn--lg">Send message</button>
                <p className="form__note">This opens your email app with the message ready to send to our team. Messages can be up to {MAX_MESSAGE} characters.</p>
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
