<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Quant Terminal & n8n Operational Playbook

Before planning or executing any tasks involving n8n workflows, Telegram bots, Supabase databases, or market trading desks in this repository:
- You **MUST** read [N8N_QUANT_ENGINE_PLAYBOOK.md](file:///c:/Users/balgi/OneDrive/Desktop/antidote/antidote/N8N_QUANT_ENGINE_PLAYBOOK.md).
- Adhere strictly to the 6 core architectural invariants:
  1. Strict Cron triggers (`0,15,30,45 * * * *` instead of rolling intervals to eliminate schedule drift).
  2. Single-item payload aggregation to avoid the n8n fan-out multiplier trap.
  3. Decoupled functional branches (never let a gate on one branch halt an unrelated branch).
  4. Mandatory LLM node retries (`retryOnFail: true`, `maxTries: 3`, `continueOnFail: true`).
  5. RAG cold-start verification and threshold tuning (0.30 - 0.45).
  6. Docker container hot-reload protocol (`docker restart n8n-app` after publishing).
