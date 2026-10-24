import Link from "next/link";
import { Container } from "./container";

const PRODUCT_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#ai-coach", label: "AI Coach" },
  { href: "#workout", label: "Workout" },
  { href: "#nutrition", label: "Nutrition" },
  { href: "#progress", label: "Progress" },
] as const;

const COMPANY_LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

const SOCIAL_LINKS = [
  { href: "https://x.com", label: "X" },
  { href: "https://instagram.com", label: "Instagram" },
  { href: "https://github.com", label: "GitHub" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-hairline bg-surface/40">
      <Container>
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-ink"
              >
                A
              </span>
              AIVO
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-text-secondary">
              AI-powered fitness, nutrition, and wellness.
            </p>
          </div>

          <nav aria-label="Product">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Product
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary transition-colors duration-200 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Company
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary transition-colors duration-200 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Social
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    rel="noreferrer noopener"
                    target="_blank"
                    className="text-sm text-text-secondary transition-colors duration-200 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-hairline py-6 sm:flex-row">
          <p className="text-sm text-text-muted">© AIVO</p>
          <p className="text-sm text-text-muted">Your AI Coach for a Healthier You</p>
        </div>
      </Container>
    </footer>
  );
}
