import IdeaForm from "@/components/idea-form";

export default function NewSessionPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Start an Idea Session
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Give the council a rough idea. The more context you provide, the sharper
          the plan — but a title and a sentence are enough to begin.
        </p>
      </div>
      <IdeaForm />
    </div>
  );
}
