export type AgentId = 'exerciseSelection' | 'safetyReview' | 'patientInstructions';

export const AGENT_LABELS: Record<AgentId, string> = {
  exerciseSelection: 'Exercise Selection',
  safetyReview: 'Safety Review',
  patientInstructions: 'Patient Instructions',
};

export type AgentStatus = 'pending' | 'running' | 'done' | 'error';

export interface AgentProgress {
  agent: AgentId;
  status: AgentStatus;
  error?: string;
}

export type CareSetting = 'home-health' | 'outpatient' | 'skilled-nursing' | 'inpatient-rehab';

export const CARE_SETTING_LABELS: Record<CareSetting, string> = {
  'home-health': 'Home health',
  outpatient: 'Outpatient',
  'skilled-nursing': 'Skilled nursing',
  'inpatient-rehab': 'Inpatient rehab',
};

/**
 * Deliberately has NO diagnosis/condition-label field, and no diagnostic
 * autocomplete anywhere in the UI that fills one in. `presentation` is a
 * functional/descriptive account of what the patient presents with (e.g.
 * "reduced grip strength and coordination, right hand"), not a diagnosis
 * name or ICD-style code. `precautions` is likewise functionally framed
 * (e.g. "limited weight-bearing, right leg"), never a diagnosis-driven
 * preset. This is a deliberate framing choice, not an oversight — see
 * skills/README.md.
 */
export interface CaseProfile {
  presentation: string;
  precautions: string;
  shortTermGoals: string;
  longTermGoals: string;
  cognitiveLevel: string;
  physicalLevel: string;
  setting: CareSetting;
  caregiverAvailable: boolean;
}

export interface DraftExercise {
  id: string;
  name: string;
  targetGoal: string;
  setsReps: string;
  rationale: string;
  instructions: string;
  /** Always phrased "Flag for clinician review against: ..." — never a directive. */
  safetyFlags: string[];
  /** Every exercise starts unaccepted; the clinician must explicitly opt each one in. */
  accepted: boolean;
}

export interface HandoutDraft {
  id: string;
  createdAt: string;
  caseProfile: CaseProfile;
  exercises: DraftExercise[];
  /** Safety flags the reviewer couldn't tie to one specific exercise. */
  generalSafetyNotes: string[];
  signedOff: boolean;
  signedOffAt: string | null;
}

/** Renderer -> main -> renderer event names, kept in one place so both sides stay in sync. */
export const IPC = {
  hasApiKey: 'carryover:hasApiKey',
  setApiKey: 'carryover:setApiKey',
  clearApiKey: 'carryover:clearApiKey',
  draftHandout: 'carryover:draftHandout',
  agentProgress: 'carryover:agentProgress',
  history: 'carryover:history',
  clearHistory: 'carryover:clearHistory',
  signOff: 'carryover:signOff',
} as const;
