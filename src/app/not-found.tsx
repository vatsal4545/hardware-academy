import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  return (
    <Container className="py-24 text-center">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">That page is not on the curriculum</h1>
      <div className="mt-6">
        <ButtonLink href="/">Back to the start</ButtonLink>
      </div>
    </Container>
  );
}
