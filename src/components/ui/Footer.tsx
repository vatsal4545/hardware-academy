import Link from "next/link";
import { Container } from "./Container";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border py-8 text-sm text-muted">
      <Container className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>Hardware Academy. Theory, visualizations, practice, scenarios and interview prep for hardware careers.</p>
        <nav className="flex gap-4" aria-label="Footer">
          <Link href="/plan" className="hover:text-text">
            14-day plan
          </Link>
          <Link href="/interview" className="hover:text-text">
            Interview bank
          </Link>
          <Link href="/careers" className="hover:text-text">
            Careers
          </Link>
        </nav>
      </Container>
    </footer>
  );
}
