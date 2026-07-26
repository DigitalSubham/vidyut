import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { QUEUE_NAME, type JobName } from "@vidyut/types";
import { processDemoPing } from "./processors/demo-ping";
import { processAppBuildStub } from "./processors/appbuild-stub";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const processors: Record<JobName, (job: Job) => Promise<unknown>> = {
  "demo.ping": processDemoPing,
  "appbuild.stub": processAppBuildStub,
};

export function startWorker(): Worker {
  const connection = new IORedis(requireEnv("REDIS_URL"), { maxRetriesPerRequest: null });

  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const processor = processors[job.name as JobName];
      if (!processor) {
        throw new Error(`No processor registered for job "${job.name}"`);
      }
      return processor(job);
    },
    { connection }
  );

  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(`[worker] job ${job?.id} (${job?.name}) failed:`, err);
  });

  return worker;
}

if (require.main === module) {
  startWorker();
  // eslint-disable-next-line no-console
  console.log(`[worker] listening on queue "${QUEUE_NAME}"`);
}
