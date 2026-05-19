import { z } from 'zod';

export const PersonaProfileSchema = z.object({
  version: z.number().int().positive(),
  generatedAt: z.string().datetime(),
  basedOnMessages: z.number().int(),

  coreIdentity: z.object({
    selfDescription: z.string(),
    coreValues: z.array(z.string()),
    lifePhilosophy: z.string(),
  }),

  thinkingPatterns: z.object({
    decisionFramework: z.array(z.string()),
    problemSolvingStyle: z.string(),
    biases: z.array(z.string()),
    commonMentalModels: z.array(z.string()),
  }),

  communicationStyle: z.object({
    overallTone: z.string(),
    formalityLevel: z.number().min(0).max(10),
    humorType: z.string().nullable(),
    commonPhrases: z.array(z.string()),
    commonEmojis: z.array(z.string()),
    pacing: z.string(),
    languageMix: z.object({
      primary: z.string(),
      mixesEnglish: z.boolean(),
      codeswitchPatterns: z.array(z.string()).optional(),
    }),
  }),

  knowledgeDomains: z.array(
    z.object({
      domain: z.string(),
      depth: z.number().min(1).max(10),
      enthusiasm: z.number().min(1).max(10),
    })
  ),

  emotionalProfile: z.object({
    baseline: z.string(),
    triggers: z.array(
      z.object({
        situation: z.string(),
        typicalReaction: z.string(),
      })
    ),
    copingPatterns: z.array(z.string()),
    expressivenessLevel: z.number().min(0).max(10),
  }),

  relationships: z.object({
    socialOrientation: z.string(),
    boundaryStyle: z.string(),
    rolesAndIdentities: z.array(z.string()),
  }),

  selfAwareness: z.object({
    strengths: z.array(z.string()),
    weaknessesAdmitted: z.array(z.string()),
    growthAreas: z.array(z.string()),
    contradictions: z.array(z.string()),
  }),

  redLines: z.array(z.string()),
});

export type PersonaProfile = z.infer<typeof PersonaProfileSchema>;

export interface MiniPersona {
  context: string;
  observations: {
    communicationPatterns: string[];
    recurringThemes: string[];
    valueSignals: string[];
    blindspots: string[];
    verbatimQuotes: string[];
  };
  confidence: number;
}
