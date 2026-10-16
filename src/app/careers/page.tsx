import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = { title: "Careers" };

export default function CareersPage() {
  return (
    <Container className="py-10">
      <h1 className="text-3xl font-bold tracking-tight">Careers</h1>
      <p className="mt-2 max-w-2xl text-muted">Roles, skills, tools, portfolio projects and resume bullets. This page is being written.</p>
    </Container>
  );
}
