export type FactStatus =
  | "VERIFIED"
  | "USER_CONFIRMED"
  | "SUPPORTED"
  | "NEEDS_VERIFICATION"
  | "CONFLICTED"
  | "REJECTED";

export type EvidenceFact = {
  id: string;
  claim: string;
  sourceIds: string[];
  status: FactStatus;
  confidence: number;
  verificationQuestion?: string;
};

export type JobRequirement = { id: string; label: string; importance: number };

export type ExperienceEvidence = {
  experienceId: string;
  requirementId: string;
  strength: number;
  factIds: string[];
};

export type PlannedQuestion = {
  id: string;
  prompt: string;
  targetFactId?: string;
  expectedGain: number;
  burden: number;
  sensitive: boolean;
};

export type InterpretationStatus =
  | "DIRECT"
  | "SUPPORTED"
  | "PROPOSED"
  | "CONFIRMED"
  | "REJECTED";

export type InterpretationCandidate = {
  id: string;
  sourceFactIds: string[];
  statement: string;
  status: InterpretationStatus;
  addsNewEvent: boolean;
  addsNewMetric: boolean;
  isFirstPersonInnerState: boolean;
};
