import { Queue, type JobsOptions } from "bullmq";
import IORedis from "ioredis";
import { QUEUE_NAME, type JobName } from "@vidyut/types";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Same producer-side interface as apps/api's core/jobs.ts, duplicated here
// rather than shared — this is the first case of a processor itself needing
// to enqueue a follow-up job (context/feature-specs/14-fee-reminders.md's
// scan -> per-guardian send fan-out), and apps/worker doesn't depend on apps/api.
const connection = new IORedis(requireEnv("REDIS_URL"), { maxRetriesPerRequest: null });
const queue = new Queue(QUEUE_NAME, { connection });

export async function enqueue(name: JobName, payload: unknown, opts?: JobsOptions): Promise<string> {
  const job = await queue.add(name, payload, opts);
  if (!job.id) {
    throw new Error("BullMQ did not assign a job id");
  }
  return job.id;
}
