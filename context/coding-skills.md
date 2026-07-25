# Coding Skills (external) — Vidyut

External agent skills/plugins the **coding agent must use** when building this repo. These are installed into the **Claude Code / dev environment** (not this planning chat) and committed to the repo so every coding session has them.

> These apply during the **build phase** (Claude Code / AI agents writing code in the repo). This planning workspace's skills are separate and fixed.

## Required skills

| Skill | Source | Apply to |
|---|---|---|
| **frontend-design** | Claude Code plugin | Any UI / frontend design work (web + mobile visuals) |
| **react-native-best-practices** | `callstackincubator/agent-skills` (Callstack) | `apps/mobile` (React Native + Expo) |
| **vercel-react-best-practices** | `vercel-labs/agent-skills` (via `skilz`) | `apps/web-app`, `apps/web-site` (Next.js / React) |

## Install (run in your dev environment, at repo root `~/Downloads/myApps/schoolErp`)

**Claude Code plugins** — inside the `claude` CLI:
```
/plugin marketplace add callstackincubator/agent-skills
/plugin install react-native-best-practices@callstack-agent-skills
/plugins install frontend-design
```
**skilz skill** — in a normal terminal:
```
pip install skilz
skilz install vercel-labs/agent-skills/vercel-react-best-practices
```

Then **commit** the resulting `.claude/` config + installed skills to the repo so all agents/sessions share them.

## Usage rule (for the coding agent)
- Writing **React Native/Expo** code → follow **react-native-best-practices**.
- Writing **Next.js/React** code → follow **vercel-react-best-practices**.
- Doing **UI/design** (components, layout, visual polish) → follow **frontend-design**.
- These complement (do not override) `code-standards.md`, `ui-context.md`, and the Vidyut design tokens.

## Notes
- Verify each source before installing (third-party = trusted code). Sources: Callstack (RN experts), Vercel, Anthropic ecosystem.
- Pin versions where the tools allow, for reproducible builds.
- Tracked in `prerequisites.md` (DevOps setup).
