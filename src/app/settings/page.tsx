import AppShell from "@/components/app-shell";
import { SettingsForm } from "@/components/settings-form";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl py-8">
        <h1 className="mb-1 text-2xl font-semibold">Settings</h1>
        <p className="mb-6 text-sm text-neutral-600">Configure where IdeaClyst reads Threlmark roadmaps from.</p>
        <SettingsForm />
      </div>
    </AppShell>
  );
}
