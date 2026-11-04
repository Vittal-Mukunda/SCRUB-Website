import { Link } from "react-router-dom";
import { usePageMeta } from "../components/usePageMeta";

export default function NotFound() {
  usePageMeta("Page not found", undefined, true);
  return (
    <section className="page-hero page-hero--center">
      <div className="wrap">
        <p className="eyebrow">404</p>
        <h1 className="display">This part of the lake is uncharted.</h1>
        <p className="lead lead--center">The page you were looking for does not exist.</p>
        <Link to="/" className="btn btn--accent">Back to the surface</Link>
      </div>
    </section>
  );
}
