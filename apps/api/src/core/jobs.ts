import { Queue, type JobsOptions } from "bullmq";
import IORedis from "ioredis";
import { QUEUE_NAME, type JobName, type JobState, type JobStatus } from "@vidyut/types";
import { config } from "./config";

// BullMQ needs its own connection (not the shared app `redis` client) —
// Workers/Queues issue blocking commands that shouldn't share a connection
// with regular request-path Redis use, and BullMQ requires
// maxRetriesPerRequest: null on the connections it manages.
const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });

const queue = new Queue(QUEUE_NAME, { connection });

/** Callers never import the queue directly (context/code-standards.md) — always go through here. */
export async function enqueue(
  name: JobName,
  payload: unknown,
  opts?: JobsOptions
): Promise<string> {
  const job = await queue.add(name, payload, opts);
  if (!job.id) {
    throw new Error("BullMQ did not assign a job id");
  }
  return job.id;
}

/** Unit 55 — lets a caller (currently just the test suite) confirm a repeatable job was registered with the right cron pattern, without waiting for it to actually fire. */
export async function getRepeatableJobs() {
  return queue.getRepeatableJobs();
}

/** Unit 56 — real BullMQ queue depth for the super-admin health summary (Open Question 3's own recommendation, "already inspectable via the existing jobs status endpoint"). */
export async function getQueueCounts() {
  return queue.getJobCounts("waiting", "active", "failed", "delayed");
}

export async function getJobStatus(jobId: string): Promise<JobStatus | null> {
  const job = await queue.getJob(jobId);
  if (!job) {
    return null;
  }

  const state = (await job.getState()) as JobState;
  return {
    id: job.id ?? jobId,
    name: job.name,
    state,
    returnValue: job.returnvalue,
    failedReason: job.failedReason,
  };
}
