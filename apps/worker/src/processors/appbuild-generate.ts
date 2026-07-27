import type { Job } from "bullmq";
import { prisma } from "@vidyut/db";
import type { AppBuildGeneratePayload } from "@vidyut/types";

/**
 * Replaces Unit 05's appbuild.stub no-op (context/feature-specs/31-white-
 * label-app-pipeline.md). Real EAS Build/Submit needs a real Apple/Google
 * developer account per context/prerequisites.md — as of this unit that
 * checklist is not done (Google Play pending verification, Apple not
 * started). Rather than fake a "LIVE" result with no real build behind it,
 * this processor is honest about that: it only calls the real EAS API when
 * EAS_ROBOT_ACCESS_TOKEN is actually configured (the credential EAS's own
 * managed-credentials flow issues — never stored raw in Postgres, only this
 * env var, per the spec's Open Question 2), and otherwise fails the
 * AppBuild clearly with a documented reason so nobody mistakes "no-op" for
 * "done."
 *
 * ponytail: the EAS-configured branch below calls Expo's EAS Build REST API
 * shape but has never run against a real token in this environment — treat
 * it as unverified until a pilot tenant's credentials exist to test against.
 */
export async function processAppBuildGenerate(job: Job<AppBuildGeneratePayload>) {
  const { tenantId, appBuildId } = job.data;
  const token = process.env.EAS_ROBOT_ACCESS_TOKEN;
  const projectId = process.env.EAS_PROJECT_ID;

  if (!token || !projectId) {
    await prisma.appBuild.update({
      where: { id: appBuildId },
      data: { storeStatus: "FAILED" },
    });
    // eslint-disable-next-line no-console
    console.warn(
      `[worker] appbuild.generate: tenant ${tenantId}, build ${appBuildId} — EAS_ROBOT_ACCESS_TOKEN/EAS_PROJECT_ID not configured (context/prerequisites.md: developer account setup not complete). Marked FAILED, not silently skipped.`
    );
    return { tenantId, appBuildId, status: "FAILED", reason: "eas_credentials_not_configured" };
  }

  await prisma.appBuild.update({ where: { id: appBuildId }, data: { storeStatus: "BUILDING" } });

  const build = await prisma.appBuild.findUniqueOrThrow({ where: { id: appBuildId } });
  const response = await fetch(`https://api.expo.dev/v2/projects/${projectId}/builds`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ platform: build.platform.toLowerCase(), profile: "dedicated" }),
  });

  if (!response.ok) {
    await prisma.appBuild.update({ where: { id: appBuildId }, data: { storeStatus: "FAILED" } });
    return { tenantId, appBuildId, status: "FAILED", reason: `eas_api_error_${response.status}` };
  }

  const body = (await response.json()) as { id?: string };
  await prisma.appBuild.update({
    where: { id: appBuildId },
    data: { storeStatus: "SUBMITTED", buildRef: body.id ?? null },
  });

  return { tenantId, appBuildId, status: "SUBMITTED", buildRef: body.id };
}
