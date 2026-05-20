'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePersona, type PersonaVersion } from '@/hooks/usePersona';
import { useFootprint } from '@/hooks/useFootprint';
import { useAvoidance } from '@/hooks/useAvoidance';
import { GlitchText } from '@/components/shared/GlitchText';
import { SliceForm } from '@/components/persona/SliceForm';
import { EvidenceDrawer } from '@/components/persona/EvidenceDrawer';
import { Button } from '@/components/ui/button';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import type { PersonaProfile } from '@/types/persona';
import {
  emptyOverrides,
  rejectionKey,
  type ContradictionTag,
  type OverridableArrayKey,
  type PersonaOverrides,
} from '@/types/persona-overrides';

export default function PersonaPage() {
  const {
    state,
    versions,
    loading,
    error,
    reload,
    saveOverrides,
    activate,
  } = usePersona();
  const { data: footprint } = useFootprint();
  const { data: avoidance } = useAvoidance();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PersonaOverrides>(emptyOverrides());
  const [evidenceQuery, setEvidenceQuery] = useState<string | null>(null);
  const { pending: saving, run: handleSave } = useAsyncAction(async () => {
    await saveOverrides(draft);
    setEditing(false);
  });
  const { pending: activating, run: handleActivate } = useAsyncAction(activate);

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
        activating={activating}
        onEditToggle={() => setEditing((v) => !v)}
        onActivate={(id) => void handleActivate(id)}
      />

      {!editing ? <ChatCTA /> : null}

      {!editing ? <SliceForm onCreated={reload} /> : null}

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

      {footprint && !editing ? (
        <Section title="語言指紋（純統計）">
          <FootprintBlock footprint={footprint} />
        </Section>
      ) : null}

      {avoidance && avoidance.topics.length > 0 && !editing ? (
        <Section title="迴避主題（候選）">
          <AvoidanceBlock data={avoidance} onAskEvidence={setEvidenceQuery} />
        </Section>
      ) : null}

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
        {view.selfAwareness.contradictions.length > 0 ? (
          <ContradictionsBlock
            items={view.selfAwareness.contradictions}
            overrides={state.overrides}
            onSave={saveOverrides}
            onAskEvidence={setEvidenceQuery}
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
          onSave={() => {
            void handleSave();
          }}
          onCancel={handleCancel}
        />
      ) : (
        <>
        <EvidenceDrawer
          query={evidenceQuery}
          onClose={() => setEvidenceQuery(null)}
        />
        <footer className="space-y-4 border-t border-neutral-200 pt-6 text-xs text-neutral-400">
          <p>
            <GlitchText intensity={0.3}>
              這份 profile 是模型對你的歸納，不是事實本身。
            </GlitchText>
            {' '}如果某條讀起來不像你，進入編輯模式把它劃掉。Cookie 對話時會尊重你的修正。
          </p>
          <nav className="flex flex-wrap gap-3 lowercase tracking-widest">
            <Link href="/chat" className="hover:text-neutral-900">chat</Link>
            <Link href="/memory" className="hover:text-neutral-900">memory</Link>
            <Link href="/audit" className="hover:text-neutral-900">audit</Link>
            <Link href="/settings" className="hover:text-neutral-900">settings</Link>
          </nav>
        </footer>
        </>
      )}
    </main>
  );
}

function Header({
  state,
  versions,
  editing,
  activating,
  onEditToggle,
  onActivate,
}: {
  state: {
    version: number;
    generatedAt: string;
    messageCount: number;
    dayCount: number;
  };
  versions: PersonaVersion[];
  editing: boolean;
  activating: boolean;
  onEditToggle: () => void;
  onActivate: (id: string) => void;
}) {
  return (
    <header className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
        INSTRUMENT READOUT · v{state.version}
        {state.messageCount > 0
          ? ` · based on ${state.messageCount.toLocaleString()} messages across ${state.dayCount} days`
          : ''}
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
              className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs disabled:opacity-50"
              disabled={editing || activating}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version} · {formatVersionLabel(v)}
                </option>
              ))}
            </select>
          ) : null}
          <Button
            onClick={onEditToggle}
            disabled={activating}
            className={`rounded-full border px-3 py-1 text-xs disabled:opacity-50 ${
              editing
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-300 text-neutral-700 hover:border-neutral-900'
            }`}
          >
            {editing ? '結束編輯' : '編輯'}
          </Button>
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
        <Button
          onClick={onCancel}
          disabled={saving}
          className="rounded-full border border-neutral-300 px-3 py-1 hover:border-neutral-900 disabled:opacity-50"
        >
          取消
        </Button>
        <Button
          onClick={onSave}
          loading={saving}
          loadingText="儲存中…"
          disabled={!dirty}
          className="rounded-full bg-neutral-900 px-3 py-1 text-white disabled:opacity-40"
        >
          儲存修正
        </Button>
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

/** T-110：版本下拉的標籤——區分主版本與切片 */
function formatVersionLabel(v: PersonaVersion): string {
  const date = new Date(v.generatedAt).toLocaleDateString();
  if (!v.sliceFilter) return date;
  const parts: string[] = ['slice'];
  if (v.sliceFilter.from) {
    parts.push(new Date(v.sliceFilter.from).toLocaleDateString());
  }
  if (v.sliceFilter.from && v.sliceFilter.to) parts.push('→');
  if (v.sliceFilter.to) {
    parts.push(new Date(v.sliceFilter.to).toLocaleDateString());
  }
  if (v.sliceFilter.chatRoomIds && v.sliceFilter.chatRoomIds.length > 0) {
    parts.push(`· ${v.sliceFilter.chatRoomIds.length} 室`);
  }
  return `${date} · ${parts.join(' ')}`;
}

/**
 * T-106：矛盾偵測——每個矛盾陳述可以被使用者標註成三種狀態之一。
 *   - context-shift：「這是不同情境的我」（保留但不視為不一致）
 *   - accepted：「我知道，這是我」（保留並擁有）
 *   - growth-target：「我想改變這個」（會進 system prompt，對話中 Cookie 會溫和反映）
 *
 * 無編輯模式，隨時可標——這個動作本身就是「自我觀察」，不需要進編輯流程。
 */
function ContradictionsBlock({
  items,
  overrides,
  onSave,
  onAskEvidence,
}: {
  items: string[];
  overrides: PersonaOverrides;
  onSave: (next: PersonaOverrides) => Promise<void>;
  onAskEvidence: (q: string) => void;
}) {
  const [busyStatement, setBusyStatement] = useState<string | null>(null);
  const inflightRef = useRef(false);

  async function setTag(statement: string, tag: ContradictionTag | null) {
    if (inflightRef.current) return;
    inflightRef.current = true;
    setBusyStatement(statement);
    try {
      const nextTags = { ...overrides.contradictionTags };
      if (tag === null) delete nextTags[statement];
      else nextTags[statement] = tag;
      await onSave({ ...overrides, contradictionTags: nextTags });
    } finally {
      inflightRef.current = false;
      setBusyStatement(null);
    }
  }

  const TAG_OPTIONS: { value: ContradictionTag; label: string }[] = [
    { value: 'context-shift', label: '這是不同情境的我' },
    { value: 'accepted', label: '我知道，這是我' },
    { value: 'growth-target', label: '我想改變這個' },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-500">矛盾之處</p>
      <ul className="space-y-3">
        {items.map((statement) => {
          const tag = overrides.contradictionTags[statement];
          const busy = busyStatement === statement;
          return (
            <li
              key={statement}
              className="space-y-2 rounded-md border border-neutral-200 bg-white p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm leading-relaxed text-neutral-800">
                  {statement}
                </p>
                <button
                  type="button"
                  onClick={() => onAskEvidence(statement)}
                  className="shrink-0 text-[10px] text-neutral-400 hover:text-neutral-900"
                  title="找出相似片段"
                >
                  依據 →
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TAG_OPTIONS.map((opt) => {
                  const active = tag === opt.value;
                  return (
                    <Button
                      key={opt.value}
                      loading={busy && active}
                      disabled={busyStatement !== null && busyStatement !== statement}
                      onClick={() =>
                        void setTag(statement, active ? null : opt.value)
                      }
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] transition disabled:opacity-50 ${
                        active
                          ? opt.value === 'growth-target'
                            ? 'border-amber-600 bg-amber-50 text-amber-800'
                            : 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-300 text-neutral-600 hover:border-neutral-700 hover:text-neutral-900'
                      }`}
                    >
                      {opt.label}
                    </Button>
                  );
                })}
                {tag === 'growth-target' ? (
                  <span className="font-mono text-[10px] text-amber-700">
                    Cookie 對話中會溫和反映
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * T-111：迴避主題候選——純統計，模型不參與。
 * 「別人經常提起、自己很少接話」的主題，可能是被刻意（或無意）迴避的話題。
 * 這只是候選，不是診斷；使用者可以自己對照「父親 / 失敗 / 自己的長處 …」這類經典迴避題。
 */
function AvoidanceBlock({
  data,
  onAskEvidence,
}: {
  data: import('@/server/persona/avoidance').AvoidanceResult;
  onAskEvidence: (q: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-neutral-500">
        別人提到 ÷ 自己提到 — 數字愈大愈像迴避（不是診斷，是觀察起點）
      </p>
      <ul className="space-y-1.5">
        {data.topics.map((t) => (
          <li
            key={t.topic}
            className="flex items-baseline justify-between gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2"
          >
            <button
              type="button"
              onClick={() => onAskEvidence(t.topic)}
              className="text-left text-sm text-neutral-800 hover:text-neutral-950 hover:underline"
              title="找出包含此主題的對話片段"
            >
              {t.topic}
            </button>
            <span className="font-mono text-[11px] text-neutral-500">
              他 {t.otherMentions} ÷ 你 {t.selfMentions} ={' '}
              <span className="text-neutral-900">
                {t.avoidanceScore.toFixed(1)}×
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * T-108：語言指紋——純統計，模型不參與。
 * 句長 / 常用語頻率 / 絕對化用語 / code-switching 比例都是直接從訊息資料算出來。
 */
function FootprintBlock({
  footprint,
}: {
  footprint: import('@/server/persona/footprint').Footprint;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-xs">
        <Stat
          label="平均句長"
          value={`${footprint.avgSentenceLength.toFixed(1)} 字（華語常模 ${footprint.chineseNormAvgSentenceLength}）`}
        />
        <Stat
          label="樣本"
          value={`${footprint.totalMessages.toLocaleString()} 則 / ${footprint.totalSentences.toLocaleString()} 句`}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs text-neutral-500">句長分佈</p>
        <ul className="space-y-1">
          {footprint.sentenceLengthHistogram.map((bin) => {
            const pct =
              footprint.totalSentences > 0
                ? (bin.count / footprint.totalSentences) * 100
                : 0;
            return (
              <li
                key={bin.range}
                className="flex items-center gap-2 font-mono text-[10px] text-neutral-500"
              >
                <span className="w-12 text-right">{bin.range}</span>
                <div className="flex-1">
                  <div className="h-1 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full bg-neutral-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="w-16 text-right tabular-nums">
                  {bin.count.toLocaleString()} ({pct.toFixed(0)}%)
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {footprint.topPhrases.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-neutral-500">常用語（CJK n-gram top 15）</p>
          <ul className="flex flex-wrap gap-1.5">
            {footprint.topPhrases.map((p) => (
              <li
                key={p.phrase}
                className="rounded-full border border-neutral-300 px-2.5 py-0.5 text-xs text-neutral-700"
              >
                「{p.phrase}」
                <span className="ml-1 font-mono text-[10px] text-neutral-400">
                  ×{p.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs text-neutral-500">
          絕對化用語頻率（每千字 {footprint.absoluteWordsPerThousand.toFixed(2)} 次）
        </p>
        {footprint.absoluteWords.length === 0 ? (
          <p className="text-xs text-neutral-400">
            幾乎不用絕對化詞——你說話傾向保留彈性
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {footprint.absoluteWords.map((w) => (
              <li
                key={w.word}
                className="rounded-full border border-neutral-300 px-2.5 py-0.5 text-xs text-neutral-700"
              >
                {w.word}
                <span className="ml-1 font-mono text-[10px] text-neutral-400">
                  ×{w.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <Stat
          label="英中切換"
          value={`${(footprint.englishTokenRatio * 100).toFixed(1)}%`}
        />
        <Stat
          label="英文 token"
          value={footprint.englishTokenCount.toLocaleString()}
        />
      </div>
    </div>
  );
}

/**
 * T-105：persona 是日常 home，chat 是亮點高潮。
 * 這個 CTA 是 persona 頁的主視覺之一——明亮、佔位、不收斂，
 * 因為「跟鏡子的我說話」就是 Cookie 的差異化體驗。
 */
function ChatCTA() {
  return (
    <Link
      href="/chat"
      className="group flex items-center justify-between gap-4 rounded-lg border border-neutral-900 bg-neutral-950 px-5 py-4 text-white transition hover:bg-black"
    >
      <div className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-400">
          mirror · awake
        </p>
        <p className="text-base tracking-tight">
          它已經醒著。要跟它說話嗎？
        </p>
      </div>
      <span className="font-mono text-xs text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-white">
        進入對話 →
      </span>
    </Link>
  );
}
