# VOD Platform — AI Feature Specification

**Project:** VOD (Netflix-style portfolio platform)
**Stack:** Next.js (App Router, TS) · FastAPI · PostgreSQL · Redis · MinIO · Docker Compose
**Status:** Planning — features deferred for later implementation
**Author:** Suman Pokhrel
**Purpose:** Position the VOD project as a credible AI engineering portfolio piece by adding a vertical slice that demonstrates LLM integration, data pipelines, and production-grade observability.

---

## 1. Strategic Rationale

The base VOD app demonstrates full-stack engineering but does not yet demonstrate AI capability. The three features below — **Auto-Metadata Pipeline (D)**, **Semantic Search (A)**, and **Eval & Ops Dashboard (F)** — form a vertical slice covering the day-to-day responsibilities of an AI engineer:

| Responsibility               | Covered by   |
| ---------------------------- | ------------ |
| RAG / LLM-powered features   | A            |
| Data pipelines & retrieval   | D, A         |
| Deployment & monitoring      | F            |
| Inference optimization       | F (informs)  |
| Production debugging         | F            |
| Prompts, tool-calling        | D            |
| Evaluation & metrics         | F            |

The features are designed to compose: D produces the data, A consumes it, F observes both.

---

## 2. Feature D — Auto-Metadata Pipeline

### 2.1 Purpose
On admin video upload, automatically generate transcript, structured metadata (title, summary, tags, chapters, content warnings), and embeddings — replacing manual data entry and producing the inputs needed for Feature A.

### 2.2 User-Facing Surface
- **Admin upload page (existing):** After file upload completes, a "Processing" panel shows live multi-stage progress (UPLOADING → TRANSCRIBING → EXTRACTING → EMBEDDING → INDEXED).
- **Admin video edit page:** Auto-generated fields are shown as pre-filled, editable form values. Admin can accept, edit, or regenerate any field.
- **Per-field "regenerate with prompt tweak"** action for showcasing prompt iteration.

### 2.3 Pipeline Stages
1. **Upload** → MinIO object storage (existing).
2. **Transcription** → Whisper (local `faster-whisper` or OpenAI API). Output: timestamped transcript.
3. **Metadata extraction** → LLM call with structured output (JSON schema or function calling). Output: title, 1-paragraph summary, 5–10 tags, genre classification, chapter markers with timestamps, content warnings.
4. **Embeddings** → Embed transcript chunks (~500 tokens, 100 overlap) + metadata blob. Store vectors in pgvector.
5. **Indexing** → Update Postgres rows; mark video as `READY`.

### 2.4 Components to Add
- Celery worker (or FastAPI BackgroundTasks initially) for async pipeline orchestration.
- Whisper service (containerized).
- LLM client wrapper with retry, timeout, structured-output validation.
- Embedding service wrapper.
- pgvector extension on Postgres.
- New tables: `transcripts`, `video_chapters`, `video_embeddings`, `pipeline_jobs`.

### 2.5 Tech Choices (default picks)
- Transcription: `faster-whisper` (medium model) — runs on RTX 3060.
- LLM: Claude Haiku via API for cost; Sonnet for quality-sensitive fields. Or local via Ollama (Qwen 2.5, Llama 3.1) if cost-sensitive.
- Embeddings: `bge-small-en-v1.5` (local) or `text-embedding-3-small` (API).
- Structured output: Pydantic schema + `instructor` library or native function-calling.

### 2.6 Output Schema (illustrative)
```json
{
  "title": "string",
  "summary": "string (1-2 paragraphs)",
  "tags": ["string"],
  "genre": "enum",
  "chapters": [{"timestamp": "00:12:34", "title": "string"}],
  "content_warnings": ["string"],
  "language": "iso-code",
  "confidence_scores": {"title": 0.0, "tags": 0.0}
}
```

### 2.7 Success Criteria
- ≥80% of auto-generated titles accepted by admin without edit (measured manually on seeded test set).
- p95 end-to-end pipeline time under target (e.g. <2× video duration).
- Structured-output validation pass rate ≥99%.
- Zero pipeline failures uncaught by retry/error handling.

---

## 3. Feature A — Semantic Search

### 3.1 Purpose
Allow users to find videos via natural-language queries beyond keyword matching ("slow-paced sci-fi about memory," "videos where someone explains transformers"). Demonstrates classic RAG retrieval mechanics with proper engineering rigor.

### 3.2 User-Facing Surface
- **Search bar on home page:** Single input, debounced.
- **Results page:** Ranked video cards with relevance score, matched chapter snippet, and timestamp deep-link.
- **"Why this result?"** expandable section showing the matched transcript chunk (transparency / debugging surface).

### 3.3 Retrieval Architecture
1. **Hybrid retrieval:** BM25 (Postgres full-text) + vector similarity (pgvector cosine), candidates merged via Reciprocal Rank Fusion.
2. **Reranking:** Top 50 candidates passed through cross-encoder (`bge-reranker-base` or Cohere Rerank) to produce top 10.
3. **Optional query rewriting:** LLM rewrites ambiguous queries before retrieval (toggleable via flag — useful for A/B in Feature F).

### 3.4 Components to Add
- Search endpoint: `GET /api/search?q=...`
- Query embedding cache (Redis) keyed by query hash.
- Reranker service (containerized) or API call.
- Frontend search components (input, results, snippet expansion).

### 3.5 Tech Choices (default picks)
- Vector DB: pgvector (already in stack, no new infra).
- BM25: Postgres `tsvector` + GIN index.
- Reranker: `bge-reranker-base` via local inference or Cohere API.
- Frontend: TanStack Query for debounced fetching, suspense-based loading.

### 3.6 Success Criteria & Metrics
- Recall@10 ≥ baseline keyword search on a curated 50-query golden set.
- MRR (Mean Reciprocal Rank) tracked across query categories.
- p95 latency <800ms end-to-end including rerank.
- Cache hit rate on repeat queries.

### 3.7 Demoable Edge Cases (worth seeding)
- Synonym query (e.g. "AI ethics" matches video tagged "responsible AI").
- Long descriptive query (paragraph-style intent).
- Queries that hit BM25 but not vector, and vice versa — show fusion working.

---

## 4. Feature F — Eval & Ops Dashboard

### 4.1 Purpose
Treat AI features as production systems with measurable quality, cost, and reliability. This is the strongest signal differentiating a portfolio from "wired up an LLM API." Two distinct surfaces: **offline evaluation** (CI-runnable) and **runtime monitoring** (live dashboard).

### 4.2 Offline Evaluation Harness

**What it does:** Runs golden datasets through Features D and A, compares outputs to expected results, produces a scorecard. Triggered manually, in CI, or on prompt/model change.

**Datasets to maintain:**
- `metadata_eval.jsonl` — 30–50 sample videos with hand-curated expected metadata.
- `search_eval.jsonl` — 50+ queries with relevant video IDs marked.
- `hallucination_eval.jsonl` — adversarial inputs designed to trip the metadata LLM (rambling/empty/misleading transcripts).

**Metrics:**
- Metadata: field-level accuracy, schema validation rate, semantic similarity to gold (via embedding distance), LLM-as-judge score.
- Search: Recall@k, MRR, NDCG@10.
- Hallucination: rate of unsupported claims (LLM-as-judge with rubric).

**Implementation:** Python CLI (`pnpm eval` or `make eval`), outputs HTML/JSON report, optional GitHub Action.

### 4.3 Runtime Monitoring Dashboard

**What it does:** Admin-only `/admin/ai-ops` page showing real-time and historical operational metrics for all AI features.

**Metrics tracked:**
- **Latency:** p50/p95/p99 per feature, per pipeline stage.
- **Cost:** $ per request, $ per video processed, daily/monthly burn rate.
- **Token usage:** input/output tokens per call.
- **Reliability:** error rate, retry rate, structured-output validation failures.
- **Quality signals:** admin edit rate per metadata field (proxy for hallucination), search result CTR, "regenerate" button click rate.
- **Drift indicators:** rolling distribution of embedding norms, query length histograms, cost-per-request trend.

**Architecture:**
- Each LLM/embedding call goes through a wrapper that emits a structured event (Postgres `ai_events` table or Redis Stream → consumer → Postgres).
- Dashboard reads aggregations via FastAPI endpoints; frontend uses Recharts.
- Optional: Prometheus + Grafana for the same data if going full ops-stack.

### 4.4 Prompt Registry (Lightweight)
- All prompts stored as versioned files in `/prompts/*.md` with a YAML header (id, version, model, parameters).
- Loader function reads at startup; current version logged with every call.
- Enables clean rollback and A/B comparison via the eval harness.

### 4.5 Success Criteria
- Eval harness runs end-to-end in CI in under 5 minutes.
- Dashboard surfaces a regression (induced manually) within one query.
- Cost-per-video metric correct to within 5% of actual API billing.

---

## 5. Suggested Build Order

| Phase | Scope | Why                                              |
| ----- | ----- | ------------------------------------------------ |
| 1     | D     | Produces the data everything else depends on.    |
| 2     | A     | Consumes D's outputs; quickest visible win.      |
| 3     | F (offline eval) | Establish quality baseline before scaling. |
| 4     | F (runtime dashboard) | Operationalize for demo storytelling. |

Each phase is independently shippable and demoable.

---

## 6. Risks & Open Questions

- **Cost ceiling:** Local models (Whisper, Ollama, bge) keep API spend near zero but require GPU time. Decide budget envelope before starting Phase 1.
- **Cold-start eval data:** Need ~30 seeded videos with hand-curated metadata to bootstrap eval. Plan a half-day data prep session.
- **Demo hosting:** Same constraint as MetroMap — multi-container AI stack will not run cheaply on a remote host. Cloudflare Tunnel + DEMO_MODE fallback strategy likely applies.
- **Scope discipline:** Each feature has stretch surfaces (multi-language, voice search, agentic browsing). Resist until vertical slice is complete and observable.

---

## 7. Portfolio Narrative Hooks

When presenting the project, lead with these talking points:

- "Built a multi-stage async ML pipeline that processes uploads through ASR, structured LLM extraction, and embedding indexing — orchestrated with Celery, observable end-to-end."
- "Implemented hybrid retrieval (BM25 + vector + cross-encoder rerank) with measured Recall@10 of X on a curated eval set."
- "Shipped an evaluation harness and runtime ops dashboard tracking latency, cost, and hallucination rate — caught a regression when switching from Sonnet to Haiku and rolled back via prompt registry."

The third point is the one most portfolios cannot make.

---

*End of specification. Treat as living document — update as decisions are made or scope shifts.*
