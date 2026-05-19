'use client';

import { usePersona } from '@/hooks/usePersona';

export default function PersonaPage() {
  const { persona, loading, error } = usePersona();

  if (loading) {
    return <div className="p-12 text-sm text-neutral-500">載入中…</div>;
  }
  if (error) {
    return (
      <div className="p-12 text-sm text-red-600">
        無法載入 Persona：{error.message}
      </div>
    );
  }
  if (!persona) {
    return (
      <div className="p-12 text-sm text-neutral-500">
        還沒有 Persona Profile。請先完成 onboarding。
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <header>
        <h1 className="text-2xl tracking-tight">Cookie 認為的你</h1>
        <p className="mt-1 text-xs text-neutral-500">
          version {persona.version} · 基於 {persona.basedOnMessages} 段對話 ·{' '}
          {new Date(persona.generatedAt).toLocaleString()}
        </p>
      </header>

      <Section title="核心人格">
        <p>{persona.coreIdentity.selfDescription}</p>
        <p className="text-neutral-600">{persona.coreIdentity.lifePhilosophy}</p>
        <ul className="list-disc pl-5 text-neutral-700">
          {persona.coreIdentity.coreValues.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
      </Section>

      <Section title="溝通風格">
        <p>{persona.communicationStyle.overallTone}</p>
        <p className="text-neutral-600">
          正式程度 {persona.communicationStyle.formalityLevel}/10 ·{' '}
          {persona.communicationStyle.pacing}
        </p>
      </Section>

      <Section title="Red Lines">
        <ul className="list-disc pl-5 text-neutral-700">
          {persona.redLines.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 border-t border-neutral-200 pt-6">
      <h2 className="text-sm font-medium tracking-wide text-neutral-500 uppercase">
        {title}
      </h2>
      <div className="space-y-2 text-sm">{children}</div>
    </section>
  );
}
