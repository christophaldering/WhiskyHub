export type WizardJobStatus = "running" | "done" | "error";

export type WizardJobStep = {
  key: string;
  label: string;
  status: "pending" | "running" | "done" | "skipped" | "error";
};

export type WizardJobState = {
  jobId: string;
  tastingId: string;
  participantId: string;
  status: WizardJobStatus;
  currentStepKey: string | null;
  steps: WizardJobStep[];
  startedAt: number;
  finishedAt: number | null;
  error: string | null;
  blocks: Array<{ id: string; type: string; payload: Record<string, unknown>; hidden?: boolean; locked?: boolean; editedByHost?: boolean }> | null;
};

const JOBS = new Map<string, WizardJobState>();
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

function gc() {
  const now = Date.now();
  for (const [id, job] of Array.from(JOBS.entries())) {
    const finished = job.finishedAt ?? 0;
    if (job.status !== "running" && now - finished > MAX_AGE_MS) {
      JOBS.delete(id);
    } else if (job.status === "running" && now - job.startedAt > MAX_AGE_MS) {
      JOBS.delete(id);
    }
  }
}

function makeJobId(): string {
  return "wj_" + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

export function createWizardJob(args: {
  tastingId: string;
  participantId: string;
  initialSteps: Array<Pick<WizardJobStep, "key" | "label">>;
}): WizardJobState {
  gc();
  const job: WizardJobState = {
    jobId: makeJobId(),
    tastingId: args.tastingId,
    participantId: args.participantId,
    status: "running",
    currentStepKey: null,
    steps: args.initialSteps.map((s) => ({ ...s, status: "pending" })),
    startedAt: Date.now(),
    finishedAt: null,
    error: null,
    blocks: null,
  };
  JOBS.set(job.jobId, job);
  return job;
}

export function getWizardJob(jobId: string): WizardJobState | undefined {
  return JOBS.get(jobId);
}

export function startStep(jobId: string, key: string): void {
  const job = JOBS.get(jobId);
  if (!job) return;
  job.currentStepKey = key;
  for (const s of job.steps) {
    if (s.key === key && s.status === "pending") s.status = "running";
  }
}

export function completeStep(jobId: string, key: string, status: "done" | "skipped" | "error" = "done"): void {
  const job = JOBS.get(jobId);
  if (!job) return;
  for (const s of job.steps) {
    if (s.key === key) s.status = status;
  }
}

export function finishJob(
  jobId: string,
  result: { status: "done" | "error"; blocks?: WizardJobState["blocks"]; error?: string | null },
): void {
  const job = JOBS.get(jobId);
  if (!job) return;
  job.status = result.status;
  job.finishedAt = Date.now();
  job.currentStepKey = null;
  if (result.blocks !== undefined) job.blocks = result.blocks;
  if (result.error !== undefined) job.error = result.error ?? null;
  if (result.status === "done") {
    for (const s of job.steps) {
      if (s.status === "running" || s.status === "pending") s.status = "done";
    }
  }
}
