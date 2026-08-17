import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'node:crypto';
import type { CaseProfile, DraftExercise } from '@shared/types';
import {
  loadExerciseSelectionSkill,
  loadOrchestratorSkill,
  loadPatientInstructionsSkill,
  loadSafetyReviewSkill,
} from './skills';
import { resolveApiKey } from './keystore';

const MODEL = 'claude-sonnet-4-5';

let client: Anthropic | null = null;
let cachedKey: string | null = null;

/** Re-checks the resolved key each call (cheap) so a key entered mid-session takes effect without a restart. */
async function getClient(): Promise<Anthropic> {
  const apiKey = await resolveApiKey();
  if (!apiKey) throw new Error("No Anthropic API key set. Add one in Carryover's settings.");
  if (!client || apiKey !== cachedKey) {
    client = new Anthropic({ apiKey });
    cachedKey = apiKey;
  }
  return client;
}

async function callTool<T>(system: string, userContent: string, tool: Anthropic.Tool): Promise<T> {
  const anthropic = await getClient();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    tools: [tool],
    tool_choice: { type: 'tool', name: tool.name },
    messages: [{ role: 'user', content: userContent }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
  );
  if (!toolUse) throw new Error(`${tool.name} did not return a structured response.`);
  return toolUse.input as T;
}

/** Renders the case profile as prompt text. Never includes a diagnosis field — there isn't one. */
function formatCaseProfile(profile: CaseProfile): string {
  return [
    `Functional presentation: ${profile.presentation}`,
    `Functional precautions: ${profile.precautions.trim() || 'none stated'}`,
    `Short-term goals: ${profile.shortTermGoals}`,
    `Long-term goals: ${profile.longTermGoals.trim() || 'none stated'}`,
    `Cognitive level: ${profile.cognitiveLevel}`,
    `Physical/mobility level: ${profile.physicalLevel}`,
    `Setting: ${profile.setting}`,
    `Caregiver available: ${profile.caregiverAvailable ? 'yes' : 'no'}`,
  ].join('\n');
}

// ---- exercise selection ----

export interface RawExercise {
  name: string;
  targetGoal: string;
  setsReps: string;
  rationale: string;
}

const EXERCISE_TOOL: Anthropic.Tool = {
  name: 'suggest_exercises',
  description: 'Propose a candidate list of suggested exercises for the draft HEP.',
  input_schema: {
    type: 'object',
    properties: {
      exercises: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            targetGoal: { type: 'string', description: 'Which stated functional goal this addresses.' },
            setsReps: { type: 'string', description: 'e.g. "2 sets x 10 reps, daily"' },
            rationale: { type: 'string' },
          },
          required: ['name', 'targetGoal', 'setsReps', 'rationale'],
        },
      },
    },
    required: ['exercises'],
  },
};

export async function runExerciseSelection(profile: CaseProfile): Promise<RawExercise[]> {
  const skill = await loadExerciseSelectionSkill();
  const out = await callTool<{ exercises: RawExercise[] }>(
    skill,
    `Case profile:\n\n${formatCaseProfile(profile)}`,
    EXERCISE_TOOL,
  );
  return out.exercises ?? [];
}

// ---- safety review ----

export interface RawFlag {
  exerciseName: string | null;
  flag: string;
}

const SAFETY_TOOL: Anthropic.Tool = {
  name: 'flag_precautions',
  description: 'Flag exercises for clinician review against the stated functional precautions.',
  input_schema: {
    type: 'object',
    properties: {
      flags: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            exerciseName: {
              type: ['string', 'null'],
              description: 'Matching candidate exercise name, or null for a general flag.',
            },
            flag: {
              type: 'string',
              description: 'Phrased exactly as "Flag for clinician review against: ..."',
            },
          },
          required: ['exerciseName', 'flag'],
        },
      },
    },
    required: ['flags'],
  },
};

export async function runSafetyReview(profile: CaseProfile, exercises: RawExercise[]): Promise<RawFlag[]> {
  const skill = await loadSafetyReviewSkill();
  const list = exercises.map((e) => `- ${e.name} (${e.setsReps})`).join('\n');
  const out = await callTool<{ flags: RawFlag[] }>(
    skill,
    `Case profile:\n\n${formatCaseProfile(profile)}\n\nCandidate exercises:\n${list}`,
    SAFETY_TOOL,
  );
  return out.flags ?? [];
}

// ---- patient instructions ----

export interface RawInstruction {
  exerciseName: string;
  text: string;
}

const INSTRUCTIONS_TOOL: Anthropic.Tool = {
  name: 'write_instructions',
  description: 'Write plain-language patient instructions per exercise.',
  input_schema: {
    type: 'object',
    properties: {
      instructions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            exerciseName: { type: 'string' },
            text: { type: 'string' },
          },
          required: ['exerciseName', 'text'],
        },
      },
    },
    required: ['instructions'],
  },
};

export async function runPatientInstructions(
  profile: CaseProfile,
  exercises: RawExercise[],
): Promise<RawInstruction[]> {
  const skill = await loadPatientInstructionsSkill();
  const list = exercises.map((e) => `- ${e.name}: ${e.setsReps}`).join('\n');
  const out = await callTool<{ instructions: RawInstruction[] }>(
    skill,
    `Case profile:\n\n${formatCaseProfile(profile)}\n\nCandidate exercises:\n${list}`,
    INSTRUCTIONS_TOOL,
  );
  return out.instructions ?? [];
}

// ---- orchestrator ----

const ORCHESTRATOR_TOOL: Anthropic.Tool = {
  name: 'merge_handout_draft',
  description: 'Merge the three specialist outputs into one draft HEP handout.',
  input_schema: {
    type: 'object',
    properties: {
      exercises: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            targetGoal: { type: 'string' },
            setsReps: { type: 'string' },
            rationale: { type: 'string' },
            instructions: { type: 'string' },
            safetyFlags: { type: 'array', items: { type: 'string' } },
          },
          required: ['name', 'targetGoal', 'setsReps', 'rationale', 'instructions', 'safetyFlags'],
        },
      },
      generalSafetyNotes: { type: 'array', items: { type: 'string' } },
    },
    required: ['exercises', 'generalSafetyNotes'],
  },
};

interface RawMerged {
  exercises: Array<Omit<DraftExercise, 'id' | 'accepted'>>;
  generalSafetyNotes: string[];
}

/** Merges the three specialists' raw output into one draft handout via a fourth orchestrator call. */
export async function runOrchestrator(
  exercises: RawExercise[],
  flags: RawFlag[],
  instructions: RawInstruction[],
): Promise<{ exercises: DraftExercise[]; generalSafetyNotes: string[] }> {
  const skill = await loadOrchestratorSkill();
  const payload = JSON.stringify({ exercises, flags, instructions }, null, 2);
  const merged = await callTool<RawMerged>(
    skill,
    `Specialist outputs to merge:\n\n${payload}`,
    ORCHESTRATOR_TOOL,
  );
  return {
    exercises: merged.exercises.map((e) => ({
      id: randomUUID(),
      ...e,
      accepted: false,
    })),
    generalSafetyNotes: merged.generalSafetyNotes ?? [],
  };
}
