import type { MiniPersona } from '@/types/persona';

export const MINI_PERSONA_SYSTEM = `你是一位專業的人格分析師。你的任務是根據一批使用者的對話片段，歸納出該使用者在這個特定情境（如工作、家庭、技術討論等）下的人格切面。

重要原則：
1. **只能基於證據說話**——所有結論必須能在對話中找到直接或間接支持
2. **避免刻板印象**——不要因為使用者是工程師就預設「理性、邏輯導向」，要看實際對話
3. **保留矛盾**——人是複雜的，如果觀察到不一致就明確記錄，不要強行調和
4. **用使用者的語氣描述使用者**——盡量還原他自己會怎麼說
5. **不要過度詮釋**——如果某些面向證據不足，就明確標註「資料不足」

請以 JSON 格式回應，不要任何 markdown code block 或前後說明。`;

export interface AnnotatedSummary {
  summary: string;
  yourPosition?: string;
  topics: string[];
}

export const miniPersonaUserPrompt = (
  chatType: string,
  yourName: string,
  annotatedChunks: AnnotatedSummary[]
) => `以下是 ${yourName} 在【${chatType}】類型對話中的 ${annotatedChunks.length} 段對話摘要：

${annotatedChunks
  .map(
    (c, i) =>
      `[${i + 1}] ${c.summary}${
        c.yourPosition ? ` // 立場：${c.yourPosition}` : ''
      } // 主題：${c.topics.join(', ')}`
  )
  .join('\n')}

請輸出 JSON：
{
  "context": "${chatType}",
  "observations": {
    "communicationPatterns": string[],
    "recurringThemes": string[],
    "valueSignals": string[],
    "blindspots": string[],
    "verbatimQuotes": string[]
  },
  "confidence": number
}`;

export const FINAL_PERSONA_SYSTEM = `你是一位專業的人格分析師。你會收到該使用者在不同情境下的「mini-persona」分析結果，你的任務是整合這些切面成為一份完整的 Persona Profile。

整合原則：
1. **跨情境一致性 vs 情境特殊性**——找出哪些特質貫穿所有情境（核心人格），哪些只在特定情境出現（角色面具）
2. **量化拿捏要保守**——formalityLevel、depth、enthusiasm 這些數值要有依據
3. **保留矛盾不要強行統一**——把矛盾寫進 selfAwareness.contradictions
4. **redLines 要保守**——只在有明確證據支持時才列出，不要根據刻板印象推測
5. **用第三人稱描述，但語氣要還原使用者的特質**

回應必須是合法 JSON，符合提供的 schema，不要任何 markdown 或說明。`;

export const PERSONA_SCHEMA_DESCRIPTION = `{
  "coreIdentity": {
    "selfDescription": string,
    "coreValues": string[],
    "lifePhilosophy": string
  },
  "thinkingPatterns": {
    "decisionFramework": string[],
    "problemSolvingStyle": string,
    "biases": string[],
    "commonMentalModels": string[]
  },
  "communicationStyle": {
    "overallTone": string,
    "formalityLevel": number (0-10),
    "humorType": string | null,
    "commonPhrases": string[],
    "commonEmojis": string[],
    "pacing": string,
    "languageMix": {
      "primary": string,
      "mixesEnglish": boolean,
      "codeswitchPatterns": string[] (optional)
    }
  },
  "knowledgeDomains": [
    { "domain": string, "depth": number (1-10), "enthusiasm": number (1-10) }
  ],
  "emotionalProfile": {
    "baseline": string,
    "triggers": [
      { "situation": string, "typicalReaction": string }
    ],
    "copingPatterns": string[],
    "expressivenessLevel": number (0-10)
  },
  "relationships": {
    "socialOrientation": string,
    "boundaryStyle": string,
    "rolesAndIdentities": string[]
  },
  "selfAwareness": {
    "strengths": string[],
    "weaknessesAdmitted": string[],
    "growthAreas": string[],
    "contradictions": string[]
  },
  "redLines": string[]
}`;

export const finalPersonaUserPrompt = (
  yourName: string,
  miniPersonas: MiniPersona[]
) => `使用者：${yourName}
分析對象：基於 ${miniPersonas.length} 個情境切面的綜合人格畫像

各情境切面：

${miniPersonas
  .map(
    (p, i) => `=== 切面 ${i + 1}: ${p.context} ===
${JSON.stringify(p.observations, null, 2)}
信心度：${p.confidence}
`
  )
  .join('\n')}

請輸出符合以下 schema 的 JSON（嚴格遵守欄位名稱與型別）：

${PERSONA_SCHEMA_DESCRIPTION}`;
