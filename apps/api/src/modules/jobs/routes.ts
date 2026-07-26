import { Router } from "express";
import { demoJobRequestSchema } from "@vidyut/validation";
import { asyncHandler, ok } from "../../core/envelope";
import { validateBody } from "../../core/guards/validate";
import { AppError } from "../../core/errors";
import { enqueue, getJobStatus } from "../../core/jobs";

export const jobsRouter = Router();

/**
 * Demo endpoint proving the enqueue -> process -> status round trip
 * (Unit 04 DoD). Real long-running endpoints follow this same
 * 202 + jobId / GET /jobs/:id shape once domain modules land.
 */
jobsRouter.post(
  "/demo",
  validateBody(demoJobRequestSchema),
  asyncHandler(async (req, res) => {
    const jobId = await enqueue("demo.ping", req.body);
    // 202 Accepted: the work is queued, not done — context/api-conventions.md "Async / long work".
    ok(res, { jobId }, 202);
  })
);

jobsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const status = id ? await getJobStatus(id) : null;
    if (!status) {
      throw new AppError("NOT_FOUND", "jobs.errors.notFound");
    }
    ok(res, status);
  })
);
