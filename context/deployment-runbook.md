# Staging → Production Runbook (Vidyut)

**Status: written, NOT yet executed for real.** No AWS account exists yet — `prerequisites.md` §3's AWS setup checklist is entirely unchecked (⬜) as of this unit. This runbook is the followable path for when that account exists; it has not been run against a real staging environment, and that gap is disclosed explicitly here rather than claimed as done. Follow it once a real AWS account + the items in `prerequisites.md` §3 are in place, then update this file's status line.

Target architecture (locked, `architecture-context.md` §1, `AGENTS.md` §3): ECS/Fargate (always-on containers) behind an ALB, RDS Postgres, ElastiCache Redis, S3, SES — region **ap-south-1 (Mumbai)**. No serverless.

## 0. One-time account setup (per `prerequisites.md` §3)

1. AWS account + billing alerts + IAM users (no root usage), MFA enabled.
2. Confirm region: **ap-south-1 (Mumbai)**.
3. VPC with public (ALB) and private (ECS tasks, RDS, ElastiCache) subnets.
4. ECR repositories: `vidyut-api`, `vidyut-worker`.
5. RDS Postgres instance (16.x, matching `docker-compose.yml`'s `postgres:16-alpine`), private subnet, automated backups enabled (this is what `scripts/backup-restore-drill.sh`'s manual drill stands in for pre-launch — real automated snapshots are RDS's job, not this repo's).
6. ElastiCache Redis instance, private subnet.
7. S3 bucket for object storage (Unit 04's `storage.ts` already targets any S3-compatible endpoint — just point it at the real bucket).
8. SES verified sending domain (for transactional email, once Unit C1's email channel is built for real).
9. Secrets Manager (or SSM Parameter Store) entries for every value `apps/api/src/core/config.ts`'s `requireEnv()` calls require, plus `SENTRY_DSN` (Unit 35), `RAZORPAY_*`, `MSG91`/`Gupshup` credentials once those are real.

## 1. Build & push images

```bash
docker build -t vidyut-api -f apps/api/Dockerfile .
docker build -t vidyut-worker -f apps/worker/Dockerfile .

aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-south-1.amazonaws.com

docker tag vidyut-api <account-id>.dkr.ecr.ap-south-1.amazonaws.com/vidyut-api:<git-sha>
docker tag vidyut-worker <account-id>.dkr.ecr.ap-south-1.amazonaws.com/vidyut-worker:<git-sha>
docker push <account-id>.dkr.ecr.ap-south-1.amazonaws.com/vidyut-api:<git-sha>
docker push <account-id>.dkr.ecr.ap-south-1.amazonaws.com/vidyut-worker:<git-sha>
```

## 2. Run migrations against the target database

Never run `prisma migrate dev` against staging/prod — only `migrate deploy`, from a one-off ECS task (or a CI job with network access to the RDS instance), never from a developer laptop:

```bash
DATABASE_URL=<rds-connection-string> pnpm --filter @vidyut/db exec prisma migrate deploy --schema prisma/schema
```

Confirm RLS policies are present post-migration (same check `scripts/backup-restore-drill.sh` does): `SELECT count(*) FROM pg_policies;` should be non-zero.

## 3. Deploy to staging

1. Update the staging ECS task definitions to the new image tags (`vidyut-api:<git-sha>`, `vidyut-worker:<git-sha>`).
2. `aws ecs update-service --cluster vidyut-staging --service vidyut-api --force-new-deployment` (repeat for `vidyut-worker`).
3. Watch ECS service events until tasks reach `RUNNING` and the ALB target group reports `healthy` (health check hits `GET /health`, Unit 04's existing endpoint — no changes needed there).
4. Smoke test staging: log in as the seeded demo tenant (`pnpm run db:seed` against the staging DB once, per Unit 35's rich demo data), walk the same manual checklist as `progress-tracker.md`'s Unit 35 launch checklist below.

## 4. Promote staging → production

Only after staging smoke tests pass:

1. Re-tag the same image (`<git-sha>`) for the production ECR repos — **never rebuild** between staging and prod; the exact bytes tested in staging are what ships.
2. Run `migrate deploy` against the production RDS instance (same command as §2, different `DATABASE_URL`).
3. Update the production ECS services to the new image tag, same `force-new-deployment` pattern as §3.
4. Watch ALB target health + Sentry (Unit 35) for a spike in errors during rollout; ECS's own rolling deployment (min healthy percent) avoids a hard cutover.

## 5. Rollback

ECS rolling deployments keep the previous task definition revision — rolling back is `aws ecs update-service --task-definition <previous-revision>`, no rebuild needed. A migration that must be rolled back requires a hand-written down-migration (this repo's migrations are hand-authored SQL per `apps/api`'s established pattern — write the reverse SQL, don't rely on `prisma migrate reset`, which is destructive).

## 6. Post-deploy verification checklist

- [ ] `GET /health` and `GET /ready` (Unit 04) return 200 on both api and worker's health surface.
- [ ] A real login against the seeded demo tenant succeeds.
- [ ] A deliberately-triggered error appears in Sentry within a few minutes (Unit 35 — confirms `SENTRY_DSN` is actually wired in the deployed environment, not just locally).
- [ ] CloudWatch Logs show the structured JSON log lines (Unit 35's `structuredLogging` middleware) with real `requestId`/`tenantId` values.
