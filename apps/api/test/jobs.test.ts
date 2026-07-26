import type { Worker } from "bullmq";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startWorker } from "@vidyut/worker";
import { createApp } from "../src/app";

const app = createApp();
let worker: Worker;

beforeAll(() => {
  worker = startWorker();
});

afterAll(async () => {
  await worker.close();
});

async function waitForJob(jobId: string, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await request(app).get(`/api/v1/jobs/${jobId}`);
    const state = res.body.data?.state;
    // Wait for returnValue too, not just state — BullMQ can briefly report
    // "completed" a tick before the return value is readable back.
    if (state === "failed" || (state === "completed" && res.body.data?.returnValue != null)) {
      return res.body.data;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Job ${jobId} did not settle within ${timeoutMs}ms`);
}

describe("jobs round trip (enqueue -> process -> status)", () => {
  it("enqueues, processes, and reports completion", async () => {
    const enqueueRes = await request(app)
      .post("/api/v1/jobs/demo")
      .send({ message: "hello worker" });

    expect(enqueueRes.status).toBe(202);
    const jobId = enqueueRes.body.data.jobId as string;
    expect(jobId).toBeTypeOf("string");

    const status = await waitForJob(jobId);
    expect(status.state).toBe("completed");
    expect(status.returnValue.echoed).toBe("hello worker");
  });

  it("404s an unknown job id", async () => {
    const res = await request(app).get("/api/v1/jobs/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
