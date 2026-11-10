# N8N QUANT ENGINE & TELEGRAM SAAS PLAYBOOK
## Canonical Planning & Execution Guide for Future Agents

This document is the standard reference and agent instructions for developing, planning, deploying, and debugging the n8n Quant Engine, Supabase RAG storage, and Telegram SaaS bridge.

---

## 1. Pre-Planning Verification Checklist

Before creating an `implementation_plan.md` or touching workflow nodes, run these diagnostic checks:

```powershell
# Check Docker containers
docker ps --filter "name=n8n"

# Verify active status in PostgreSQL
docker exec -i n8n-postgres psql -U n8n -d n8n -c "SELECT id, name, active FROM workflow_entity;"

# Inspect container startup logs for active schedule listeners
docker logs n8n-app --tail 30
```

---

## 2. Hard-Won Production Traps (The 6 Critical Invariants)

### 1. Strict Cron vs. Rolling Interval (Zero Drift)
* **The Problem**: n8n rolling intervals (`minutes: 15`) calculate `now() + 15m` from the end of each run or container start. Latency accumulates into multi-minute drift over time.
* **The Solution**: **Strictly forbid rolling intervals**. Always use a strict Cron expression:
  ```json
  "parameters": {
    "rule": {
      "interval": [
        {
          "field": "cronExpression",
          "expression": "0,15,30,45 * * * *"
        }
      ]
    }
  }
  ```
  Locks executions to exact clock quarters (`:00`, `:15`, `:30`, `:45`).

### 2. Fan-Out Multiplication Trap
* **The Problem**: A node returning an array of symbols (e.g. Binance 4 symbols) outputs 4 items. Downstream nodes loop 4 times consecutively, causing spam or 429 rate limits.
* **The Solution**: Collapse multi-item payloads into a single structured object using a Code node set to **"Run Once for All Items"** before feeding downstream nodes.

### 3. Decouple Independent Branches (Single Blast Radius)
* **The Problem**: Chaining balance updates downstream of news consensus caused balance updates to halt whenever news feeds had no matching headlines.
* **The Solution**: Isolate independent pipeline branches completely. Never let an optional content filter on one branch abort an unrelated execution path.

### 4. External AI (Gemini) Node Resilience
* **The Problem**: Unhandled HTTP node failures immediately abort the entire n8n execution cycle.
* **The Solution**: Always configure HTTP nodes calling LLMs with:
  - `retryOnFail: true`
  - `maxTries: 3`
  - `waitBetweenTries: 1000`
  - `continueOnFail: true`
  - Stable model identifiers: `models/gemini-2.5-flash` or `models/gemini-3.6-flash`.
  - Defensive downstream parsing in Code nodes (`if (!res?.candidates?.[0]?.content) return [];`).

### 5. RAG Vector Search Cold-Start
* **The Problem**: Vector search (`match_rag_memory`) returns `[]` if the table is empty.
* **The Solution**: Always verify knowledge base presence. Run `rag_ingestion_pipeline.json` or `scripts/ingest_rag_documents.py` to seed embeddings beforehand, and maintain similarity thresholds between `0.30` and `0.45`.

### 6. n8n Container Hot-Reload Protocol
* **The Problem**: Updating JSON files or running `import:workflow` leaves the workflow inactive or unreflected in memory.
* **The Solution**: Mandatory 5-step sequence:
  1. `docker cp workflow.json n8n-app:/tmp/workflow.json`
  2. `docker exec n8n-app n8n import:workflow --input=/tmp/workflow.json`
  3. `docker exec n8n-app n8n publish:workflow --id=<WORKFLOW_ID>`
  4. `docker restart n8n-app`
  5. Check startup log: `docker logs n8n-app --tail 25` to confirm `Activated workflow ...`.

---

## 3. Security Invariant: Zero Client Authority

* Clients cannot manipulate balances via DevTools DOM editing.
* All state transitions execute on the server under Supabase Row-Level Security bound to `auth.uid()`.
* Secrets (`SUPABASE_SERVICE_ROLE_KEY`) are kept on the server only.

---

## 4. Git Dual-Branch Rule

Always commit and push to both `main` and `master`:
```powershell
git push origin main
git push origin main:master
```
