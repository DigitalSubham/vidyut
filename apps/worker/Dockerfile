# Built from the monorepo root: docker build -f apps/worker/Dockerfile .
FROM node:22-alpine

RUN corepack enable

WORKDIR /repo

COPY . .

RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm install --frozen-lockfile --store-dir=/pnpm-store
RUN pnpm --filter @vidyut/db exec prisma generate

WORKDIR /repo/apps/worker
CMD ["pnpm", "start"]
