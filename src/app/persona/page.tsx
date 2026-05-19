'use client';

import Link from 'next/link';
import { usePersona } from '@/hooks/usePersona';
import type { PersonaProfile } from '@/types/persona';

export default function PersonaPage() {
  const { persona, loading, error } = usePersona();

  if (loading) {
    return <Center>載入中…</Center>;
  }
  if (error) {
    return <Center tone="error">無法載入 Persona：{error.message}</Center>;
  }
  if (!persona) {
    return (
      <Center>
        <p className="text-sm text-neutral-600">
          還沒有 Persona Profile。請先完成 onboarding 並生成。
        </p>
        <Link
          href="/onboarding"
          className="rounded-full border border-neutral-900 px-4 py-1.5 text-xs hover:bg-neutral-900 hover:text-white"
        >
          回到 onboarding
        </Link>
      </Center>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-10 px-6 py-12">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-neutral-500">
          Cookie 對你的理解 · version {persona.version}
        </p>
        <h1 className="text-3xl tracking-tight">這是它看見的你</h1>
        <p className="text-xs text-neutral-500">
          基於 {persona.basedOnMessages.toLocaleString()} 段對話 ·{' '}
          {new Date(persona.generatedAt).toLocaleString()}
        </p>
      </header>

      <Section title="核心人格">
        <Lead>{persona.coreIdentity.selfDescription}</Lead>
        <p className="text-sm text-neutral-700">
          {persona.coreIdentity.lifePhilosophy}
        </p>
        <TagList items={persona.coreIdentity.coreValues} />
      </Section>

      <Section title="思考方式">
        <Field
          label="解決問題的方式"
          value={persona.thinkingPatterns.problemSolvingStyle}
        />
        <Field
          label="決策考量"
          value={persona.thinkingPatterns.decisionFramework.join('；')}
        />
        <Field
          label="常用思考框架"
          value={persona.thinkingPatterns.commonMentalModels.join('、')}
        />
        {persona.thinkingPatterns.biases.length > 0 ? (
          <Field
            label="偏好 / 偏誤"
            value={persona.thinkingPatterns.biases.join('、')}
          />
        ) : null}
      </Section>

      <Section title="溝通風格">
        <Lead>{persona.communicationStyle.overallTone}</Lead>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <Stat label="正式程度" value={`${persona.communicationStyle.formalityLevel}/10`} />
          <Stat label="節奏" value={persona.communicationStyle.pacing} />
          {persona.communicationStyle.humorType ? (
            <Stat label="幽默" value={persona.communicationStyle.humorType} />
          ) : null}
          <Stat
            label="語言"
            value={`${persona.communicationStyle.languageMix.primary}${
              persona.communicationStyle.languageMix.mixesEnglish
                ? '（混英）'
                : ''
            }`}
          />
        </div>
        {persona.communicationStyle.commonPhrases.length > 0 ? (
          <Field
            label="口頭禪"
            value={persona.communicationStyle.commonPhrases
              .map((p) => `「${p}」`)
              .join(' ')}
          />
        ) : null}
        {persona.communicationStyle.commonEmojis.length > 0 ? (
          <Field
            label="常用 emoji"
            value={persona.communicationStyle.commonEmojis.join(' ')}
          />
        ) : null}
      </Section>

      <Section title="關心的領域">
        {persona.knowledgeDomains.length === 0 ? (
          <p className="text-xs text-neutral-400">資料不足</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {persona.knowledgeDomains.map((d) => (
              <li key={d.domain} className="flex items-baseline justify-between gap-3">
                <span>{d.domain}</span>
                <span className="font-mono text-xs text-neutral-500">
                  熟悉 {d.depth}/10 · 熱情 {d.enthusiasm}/10
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="情緒模式">
        <Lead>
          {persona.emotionalProfile.baseline} · 表達強度{' '}
          {persona.emotionalProfile.expressivenessLevel}/10
        </Lead>
        {persona.emotionalProfile.triggers.length > 0 ? (
          <ul className="space-y-1 text-sm text-neutral-700">
            {persona.emotionalProfile.triggers.map((t, i) => (
              <li key={i}>
                <span className="text-neutral-500">{t.situation}</span>
                {' → '}
                <span>{t.typicalReaction}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {persona.emotionalProfile.copingPatterns.length > 0 ? (
          <Field
            label="應對方式"
            value={persona.emotionalProfile.copingPatterns.join('、')}
          />
        ) : null}
      </Section>

      <Section title="關係 / 角色">
        <Field label="社交傾向" value={persona.relationships.socialOrientation} />
        <Field label="界線" value={persona.relationships.boundaryStyle} />
        <TagList items={persona.relationships.rolesAndIdentities} />
      </Section>

      <Section title="自我認知（誠實，不美化）">
        {persona.selfAwareness.strengths.length > 0 ? (
          <Field label="強項" value={persona.selfAwareness.strengths.join('、')} />
        ) : null}
        {persona.selfAwareness.weaknessesAdmitted.length > 0 ? (
          <Field
            label="自承的弱點"
            value={persona.selfAwareness.weaknessesAdmitted.join('、')}
          />
        ) : null}
        {persona.selfAwareness.contradictions.length > 0 ? (
          <Field
            label="矛盾之處"
            value={persona.selfAwareness.contradictions.join('；')}
          />
        ) : null}
        {persona.selfAwareness.growthAreas.length > 0 ? (
          <Field
            label="想成長的方向"
            value={persona.selfAwareness.growthAreas.join('、')}
          />
        ) : null}
      </Section>

      {persona.redLines.length > 0 ? (
        <Section title="Red Lines（Cookie 不會做的事）" tone="danger">
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
            {persona.redLines.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      <footer className="border-t border-neutral-200 pt-6 text-xs text-neutral-400">
        這份 profile 是模型對你的歸納，不是事實本身。如果某條讀起來不像你，
        那它就是錯的 — 之後會加上手動覆寫的功能。
      </footer>
    </main>
  );
}

function Center({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: 'error';
}) {
  return (
    <main
      className={`flex min-h-screen items-center justify-center px-6 text-center ${
        tone === 'error' ? 'text-red-600' : 'text-neutral-500'
      }`}
    >
      <div className="flex flex-col items-center gap-3 text-sm">{children}</div>
    </main>
  );
}

function Section({
  title,
  children,
  tone,
}: {
  title: string;
  children: React.ReactNode;
  tone?: 'danger';
}) {
  return (
    <section
      className={`space-y-3 border-t pt-6 ${
        tone === 'danger' ? 'border-red-200' : 'border-neutral-200'
      }`}
    >
      <h2
        className={`text-[11px] font-medium uppercase tracking-widest ${
          tone === 'danger' ? 'text-red-500' : 'text-neutral-500'
        }`}
      >
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  return <p className="text-base leading-relaxed">{children}</p>;
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-3 text-sm">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="text-neutral-800">{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-neutral-500">
        {label}
      </dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((v) => (
        <li
          key={v}
          className="rounded-full border border-neutral-300 px-2.5 py-0.5 text-xs text-neutral-700"
        >
          {v}
        </li>
      ))}
    </ul>
  );
}

// 確保 PersonaProfile import 不被 tree-shake 移除型別資訊
export type _Persona = PersonaProfile;
