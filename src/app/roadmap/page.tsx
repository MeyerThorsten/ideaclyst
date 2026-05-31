import AppShell from "@/components/app-shell";
import { RoadmapForm } from "@/components/roadmap-form";

export default function RoadmapPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl py-8">
        <h1 className="mb-1 text-2xl font-semibold">Roadmap intelligence</h1>
        <p className="mb-6 text-sm text-neutral-600">
          Read a Threlmark project&apos;s roadmap and generate research-grounded feature, spin-off,
          and service suggestions.
        </p>
        <RoadmapForm />
      </div>
    </AppShell>
  );
}
