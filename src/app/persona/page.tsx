'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePersona, type PersonaVersion } from '@/hooks/usePersona';
import { GlitchText } from '@/components/shared/GlitchText';
import type { PersonaProfile } from '@/types/persona';
import {
  emptyOverrides,
  rejectionKey,
  type OverridableArrayKey,
  type PersonaOverrides,
} from '@/types/persona-overrides';

export default function PersonaPage() {
  const {
    state,
    versions,
    loading,
    error,
    saveOverrides,
    activate,
  } = usePersona();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PersonaOverrides>(emptyOverrides());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state) setDraft(state.overrides);
  }, [state]);

  if (loading) return <Center>載入中…</Center>;
  if (error)
    return <Center tone="error">無法載入 Persona：{error.message}</Center>;
  if (!state) {
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

  // 編輯模式下顯示 raw，由 EditableArray 在 UI 上呈現「rejected」與「added」
  const view: PersonaProfile = editing ? state.raw : state.profile;

  async function handleSave() {
    setSaving(true);
    try {
      await saveOverrides(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(state?.overrides ?? emptyOverrides());
    setEditing(false);
  }

  return (
    <main className="mx-auto max-w-3xl space-y-10 px-6 py-12">
      <Header
        state={state}
        versions={versions}
        editing={editing}
        onEditToggle={() => setEditing((v) => !v)}
        onActivate={(id) => void activate(id)}
      />

      <Section title="核心人格">
        <Lead>{view.coreIdentity.selfDescription}</Lead>
        <p className="text-sm text-neutral-700">
          {view.coreIdentity.lifePhilosophy}
        </p>
        <ArrayBlock
          section="coreValues"
          rawItems={state.raw.coreIdentity.coreValues}
          draft={draft}
          editing={editing}
          onChange={setDraft}
        />
      </Section>

      <Section title="思考方式">
        <Field
          label="解決問題的方式"
          value={view.thinkingPatterns.problemSolvingStyle}
        />
        <Field
          label="決策考量"
          value={view.thinkingPatterns.decisionFramework.join('；')}
        />
        <Field
          label="常用思考框架"
          value={view.thinkingPatterns.commonMentalModels.join('、')}
        />
        {view.thinkingPatterns.biases.length > 0 ? (
          <Field
            label="偏好 / 偏誤"
            value={view.thinkingPatterns.biases.join('、')}
          />
        ) : null}
      </Section>

      <Section title="溝通風格">
        <Lead>{view.communicationStyle.overallTone}</Lead>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <Stat
            label="正式程度"
            value={`${view.communicationStyle.formalityLevel}/10`}
          />
          <Stat label="節奏" value={view.communicationStyle.pacing} />
          {view.communicationStyle.humorType ? (
            <Stat label="幽默" value={view.communicationStyle.humorType} />
          ) : null}
          <Stat
            label="語言"
            value={`${view.communicationStyle.languageMix.primary}${
              view.communicationStyle.languageMix.mixesEnglish
                ? '（混英）'
                : ''
            }`}
          />
        </div>
        <ArrayBlock
          section="commonPhrases"
          label="口頭禪"
          rawItems={state.raw.communicationStyle.commonPhrases}
          draft={draft}
          editing={editing}
          onChange={setDraft}
          renderItem={(v) => `「${v}」`}
        />
        {view.communicationStyle.commonEmojis.length > 0 && !editing ? (
          <Field
            label="常用 emoji"
            value={view.communicationStyle.commonEmojis.join(' ')}
          />
        ) : null}
      </Section>

      <Section title="關心的領域">
        {view.knowledgeDomains.length === 0 ? (
          <p className="text-xs text-neutral-400">資料不足</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {view.knowledgeDomains.map((d) => (
              <li
                key={d.domain}
                className="flex items-baseline justify-between gap-3"
              >
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
          {view.emotionalProfile.baseline} · 表達強度{' '}
          {view.emotionalProfile.expressivenessLevel}/10
        </Lead>
        {view.emotionalProfile.triggers.length > 0 ? (
          <ul className="space-y-1 text-sm text-neutral-700">
            {view.emotionalProfile.triggers.map((t, i) => (
              <li key={i}>
                <span className="text-neutral-500">{t.situation}</span>
                {' → '}
                <span>{t.typicalReaction}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section title="關係 / 角色">
        <Field label="社交傾向" value={view.relationships.socialOrientation} />
        <Field label="界線" value={view.relationships.boundaryStyle} />
        <ArrayBlock
          section="rolesAndIdentities"
          label="角色"
          rawItems={state.raw.relationships.rolesAndIdentities}
          draft={draft}
          editing={editing}
          onChange={setDraft}
        />
      </Section>

      <Section title="自我認知（誠實，不美化）">
        <ArrayBlock
          section="strengths"
          label="強項"
          rawItems={state.raw.selfAwareness.strengths}
          draft={draft}
          editing={editing}
          onChange={setDraft}
        />
        <ArrayBlock
          section="weaknessesAdmitted"
          label="自承的弱點"
          rawItems={state.raw.selfAwareness.weaknessesAdmitted}
          draft={draft}
          editing={editing}
          onChange={setDraft}
        />
        {view.selfAwareness.contradictions.length > 0 && !editing ? (
          <Field
            label="矛盾之處"
            value={view.selfAwareness.contradictions.join('；')}
          />
        ) : null}
      </Section>

      <Section title="Red Lines（Cookie 不會做的事）" tone="danger">
        <ArrayBlock
          section="redLines"
          rawItems={state.raw.redLines}
          draft={draft}
          editing={editing}
          onChange={setDraft}
          variant="numbered"
        />
      </Section>

      {editing ? (
        <EditFooter
          dirty={!shallowEqual(draft, state.overrides)}
          saving={saving}
          onSave={() => void handleSave()}
          onCancel={handleCancel}
        />
      ) : (
        <footer className="border-t border-neutral-200 pt-6 text-xs text-neutral-400">
          <GlitchText intensity={0.3}>
            這份 profile 是模型對你的歸納，不是事實本身。
          </GlitchText>
          {' '}如果某條讀起來不像你，進入編輯模式把它劃掉。Cookie 對話時會尊重你的修正。
        </footer>
      )}
    </main>
  );
}

function Header({
  state,
  versions,
  editing,
  onEditToggle,
  onActivate,
}: {
  state: { version: number; generatedAt: string };
  versions: PersonaVersion[];
  editing: boolean;
  onEditToggle: () => void;
  onActivate: (id: string) => void;
}) {
  return (
    <header className="space-y-3">
      <p className="text-xs uppercase tracking-widest text-neutral-500">
        Cookie 對你的理解 · version {state.version}
      </p>
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl tracking-tight">這是它看見的你</h1>
          <p className="mt-1 text-xs text-neutral-500">
            生成於 {new Date(state.generatedAt).toLocaleString()} · 共{' '}
            {versions.length} 個版本
          </p>
        </div>
        <div className="flex items-center gap-2">
          {versions.length > 1 ? (
            <select
              value={versions.find((v) => v.isActive)?.id ?? ''}
              onChange={(e) => onActivate(e.target.value)}
              className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs"
              disabled={editing}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version} · {new Date(v.generatedAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            onClick={onEditToggle}
            className={`rounded-full border px-3 py-1 text-xs ${
              editing
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-300 text-neutral-700 hover:border-neutral-900'
            }`}
          >
            {editing ? '結束編輯' : '編輯'}
          </button>
        </div>
      </div>
    </header>
  );
}

interface ArrayBlockProps {
  section: OverridableArrayKey;
  rawItems: string[];
  draft: PersonaOverrides;
  editing: boolean;
  onChange: (next: PersonaOverrides) => void;
  label?: string;
  renderItem?: (v: string) => string;
  variant?: 'tags' | 'numbered';
}

function ArrayBlock({
  section,
  rawItems,
  draft,
  editing,
  onChange,
  label,
  renderItem,
  variant = 'tags',
}: ArrayBlockProps) {
  const [input, setInput] = useState('');
  const rejected = useMemo(() => new Set(draft.rejected), [draft.rejected]);
  const additions = draft.additions[section];

  function toggleReject(v: string) {
    const key = rejectionKey(section, v);
    onChange({
      ...draft,
      rejected: rejected.has(key)
        ? draft.rejected.filter((k) => k !== key)
        : [...draft.rejected, key],
    });
  }

  function addItem() {
    const v = input.trim();
    if (!v) return;
    onChange({
      ...draft,
      additions: {
        ...draft.additions,
        [section]: [...additions, v],
      },
    });
    setInput('');
  }

  function removeAddition(idx: number) {
    onChange({
      ...draft,
      additions: {
        ...draft.additions,
        [section]: additions.filter((_, i) => i !== idx),
      },
    });
  }

  // 非編輯模式：直接渲染 (raw - rejected) + additions
  const visibleItems = editing
    ? rawItems // 編輯時所有 raw 都顯示，rejected 的劃掉
    : [
        ...rawItems.filter((v) => !rejected.has(rejectionKey(section, v))),
        ...additions,
      ];

  if (visibleItems.length === 0 && additions.length === 0 && !editing) return null;

  return (
    <div className="space-y-2">
      {label ? (
        <p className="text-xs text-neutral-500">{label}</p>
      ) : null}

      {variant === 'numbered' ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
          {visibleItems.map((v) => {
            const isRejected =
              editing && rejected.has(rejectionKey(section, v));
            return (
              <li
                key={v}
                className={isRejected ? 'text-neutral-300 line-through' : ''}
              >
                {v}
                {editing ? (
                  <button
                    type="button"
                    onClick={() => toggleReject(v)}
                    className="ml-2 text-[10px] text-neutral-400 hover:text-neutral-900"
                  >
                    {isRejected ? '保留' : '不像我'}
                  </button>
                ) : null}
              </li>
            );
          })}
          {editing
            ? additions.map((v, i) => (
                <li key={`add-${i}`} className="text-neutral-700">
                  {v}
                  <span className="ml-2 text-[10px] text-neutral-400">手動加</span>
                  <button
                    type="button"
                    onClick={() => removeAddition(i)}
                    className="ml-1 text-[10px] text-red-500 hover:underline"
                  >
                    移除
                  </button>
                </li>
              ))
            : null}
        </ul>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {visibleItems.map((v) => {
            const isRejected =
              editing && rejected.has(rejectionKey(section, v));
            return (
              <li
                key={v}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${
                  isRejected
                    ? 'border-neutral-200 text-neutral-300 line-through'
                    : 'border-neutral-300 text-neutral-700'
                }`}
              >
                {renderItem ? renderItem(v) : v}
                {editing ? (
                  <button
                    type="button"
                    onClick={() => toggleReject(v)}
                    className="ml-2 text-[10px] text-neutral-400 hover:text-neutral-900"
                  >
                    {isRejected ? '保留' : '×'}
                  </button>
                ) : null}
              </li>
            );
          })}
          {editing
            ? additions.map((v, i) => (
                <li
                  key={`add-${i}`}
                  className="rounded-full border border-dashed border-neutral-400 px-2.5 py-0.5 text-xs text-neutral-700"
                >
                  {renderItem ? renderItem(v) : v}
                  <button
                    type="button"
                    onClick={() => removeAddition(i)}
                    className="ml-2 text-[10px] text-red-500 hover:underline"
                  >
                    ×
                  </button>
                </li>
              ))
            : null}
        </ul>
      )}

      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addItem();
          }}
          className="flex gap-2 pt-1"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="新增…"
            className="flex-1 rounded border border-neutral-300 px-2 py-1 text-xs"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:border-neutral-900 disabled:opacity-40"
          >
            加上
          </button>
        </form>
      ) : null}
    </div>
  );
}

function EditFooter({
  dirty,
  saving,
  onSave,
  onCancel,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <footer className="sticky bottom-4 flex items-center justify-between rounded-md border border-neutral-300 bg-white/95 px-4 py-3 text-xs shadow-sm backdrop-blur">
      <span className="text-neutral-500">
        {dirty ? '有未儲存的修正' : '沒有變動'}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-full border border-neutral-300 px-3 py-1 hover:border-neutral-900"
        >
          取消
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || saving}
          className="rounded-full bg-neutral-900 px-3 py-1 text-white disabled:opacity-40"
        >
          {saving ? '儲存中…' : '儲存修正'}
        </button>
      </div>
    </footer>
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

function shallowEqual(a: PersonaOverrides, b: PersonaOverrides): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
