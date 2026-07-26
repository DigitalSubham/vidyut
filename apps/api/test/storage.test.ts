import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { getDownloadUrl, getUploadUrl } from "../src/core/storage";

describe("object storage (S3-compatible, local MinIO)", () => {
  it("round-trips an object through signed upload + download URLs", async () => {
    const key = `test/${randomUUID()}.txt`;
    const body = `hello from vidyut ${randomUUID()}`;

    const uploadUrl = await getUploadUrl(key, "text/plain");
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body,
    });
    expect(putRes.status).toBe(200);

    const downloadUrl = await getDownloadUrl(key);
    const getRes = await fetch(downloadUrl);
    expect(getRes.status).toBe(200);
    const downloaded = await getRes.text();
    expect(downloaded).toBe(body);
  });
});
