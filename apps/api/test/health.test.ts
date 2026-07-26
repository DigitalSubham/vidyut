import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const app = createApp();

describe("health/ready", () => {
  it("GET /health is always ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
  });

  it("GET /ready reports DB + Redis reachability", async () => {
    const res = await request(app).get("/ready");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ready");
    expect(res.body.data.db).toBe(true);
    expect(res.body.data.redis).toBe(true);
  });
});
