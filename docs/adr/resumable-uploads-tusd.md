# ADR 0001: Resumable Large File Uploads with tusd

- Status: Accepted
- Date: 2026-07-26
- Author: Suman
- Area: Upload and ingest pipeline (VOD platform)

## 1. Context

The VOD platform currently accepts video and image uploads through a standard
HTTP multipart form request. The browser streams the entire file to the FastAPI
backend, which then forwards it to MinIO.

This approach has three problems that block further growth:

1. It is blocking. Every byte passes through the application server, so a large
   upload occupies backend resources for its full duration and can stall the
   server for other requests.
2. It is not resilient. If a connection breaks mid-upload, there is no way to
   resume. The whole file must be sent again from the start.
3. It does not scale to the target. Single files up to 50 GB are required, and
   the platform must serve multiple users uploading at the same time.

### Requirements

- Support single files up to 50 GB.
- Support multiple concurrent uploads.
- Resume cleanly after a network interruption, without re-sending completed data.
- Keep file bytes off the application server so uploads do not degrade the API.
- Remain self-hosted, using the existing MinIO object store.

### Existing stack

Next.js frontend, FastAPI backend, PostgreSQL, Redis, MinIO, Celery, Docker,
with Caddy as the reverse proxy.

## 2. Decision

Adopt the tus protocol, an open HTTP-based standard for resumable uploads, using
tusd (the reference server) as a dedicated ingest service, with Uppy as the
client library on the Next.js frontend.

The design separates the data plane from the control plane:

- Data plane: The browser (Uppy) sends the file in chunks to tusd. tusd runs as
  its own container and uses its S3 store backend to write directly to MinIO. It
  never routes bytes through FastAPI.
- Control plane: FastAPI is involved only through tusd hooks. It authorizes
  uploads and reacts to completion. It never touches file bytes.

### Component roles

- Uppy (Next.js): chunking, retries, pause, resume, and upload progress UI.
- tusd (container): accepts resumable uploads and streams parts to MinIO. Under
  the hood, each tus upload maps to one S3 multipart upload against MinIO.
- FastAPI (control plane): validates uploads via the pre-create hook and records
  results plus enqueues processing via the post-finish hook.
- MinIO: object storage for the assembled file and per-upload metadata.
- Celery, Redis, PostgreSQL: post-upload processing queue, worker coordination,
  and metadata.
- Caddy: TLS termination, reverse proxy, and load balancing.

### Upload flow

1. The browser authenticates with FastAPI and receives a token.
2. Uppy asks tusd to create an upload, carrying the token and file metadata.
3. tusd calls the FastAPI pre-create hook. FastAPI checks the token, quota, file
   size, and type, and allows or rejects the upload before any bytes move.
4. Uppy sends the file to tusd chunk by chunk. Bytes flow browser to tusd only.
5. tusd buffers each part briefly to local disk, then pushes it to MinIO as one
   part of the multipart upload.
6. On a network drop, the client sends a HEAD request, tusd returns the current
   byte offset, and the upload resumes from there. Only the broken chunk is re-sent.
7. When all bytes are received, tusd completes the multipart upload and MinIO
   assembles the parts into one final object.
8. tusd calls the FastAPI post-finish hook. FastAPI writes a database row and
   enqueues a Celery job.
9. A Celery worker reads the final file from MinIO and processes it (transcode to
   HLS or DASH, thumbnails), writing outputs back to MinIO.

## 3. Alternatives Considered

### A. Backend-proxied streaming, made asynchronous

Keep streaming through FastAPI, but use async streaming to avoid buffering the
whole file in memory.

- Pros: Simplest change. Backend sees every byte, so validation is trivial. No
  new service, no CORS setup.
- Cons: Every byte still crosses the application server, which is the root cause
  of the current stalling. Resume must be built by hand. Does not solve the
  stated problem.
- Rejected: Does not remove the bottleneck or provide resume.

### B. Presigned single PUT (direct to storage, one request)

FastAPI issues a presigned URL and the client uploads in one PUT to MinIO.

- Pros: Very simple. Bytes bypass the backend entirely.
- Cons: No resume at all. A single PUT is capped at 5 GB, so it cannot handle
  50 GB files.
- Rejected: Fails the 50 GB requirement outright. Retained only as a possible
  path for small images and thumbnails.

### C. Presigned S3 multipart (Uppy plus a signing endpoint)

The browser uploads parts directly to MinIO using presigned part URLs, with
FastAPI orchestrating initiate, sign, and complete.

- Pros: Bytes bypass the application server. Scales well. Native to MinIO, so no
  extra service. Handles 50 GB.
- Cons: Resume is coarser (retry a failed part, not a byte offset). More
  orchestration to build. Requires MinIO CORS, exposing MinIO to the browser.
- Rejected for now: Viable and lower on infrastructure, but gives a weaker resume
  experience and keeps MinIO reachable from the browser. Kept as the primary
  fallback if tusd becomes operationally heavy.

### D. Managed video service (for example Cloudflare Stream, Mux, api.video)

Offload ingest, transcoding, storage, and delivery to a third party. Several of
these use the tus protocol themselves.

- Pros: Replaces tusd, the Celery transcode pipeline, and MinIO. Very little to
  build or run.
- Cons: Recurring per-GB cost and vendor lock-in. Some services cap file size
  below 50 GB (for example, Cloudflare Stream is limited to 30 GB per video).
  Removes most of the system-design work this project is meant to demonstrate.
- Rejected: Conflicts with the self-hosted goal, the 50 GB target, and the aim of
  building the pipeline directly.

### E. Python tus server embedded in FastAPI

Use a Python tus implementation inside the FastAPI app instead of a separate Go
container.

- Pros: No separate service or language. Hooks become in-process function calls.
- Cons: Python tus servers are far less battle-tested than tusd for large files
  under real concurrency, which is exactly where hardening matters most.
- Rejected: The maturity risk on 50 GB files outweighs the convenience. The
  separate-service design also makes the control-plane and data-plane split
  clearer.

## 4. Consequences

### Positive

- Uploads are resumable through an open standard, so interruptions cost one
  chunk, not the whole file.
- File bytes never cross FastAPI, so uploads no longer stall the API.
- tusd writes directly to MinIO using S3 multipart, so we get both the resumable
  protocol and efficient object storage in one component.
- The browser talks only to tusd, so MinIO stays private and CORS is configured
  on tusd rather than exposing the object store.
- The control-plane and data-plane split is clean and easy to reason about.

### Negative and trade-offs

- tusd is an additional stateful service that needs a disk volume for temporary
  part buffering. Scratch space scales with part size, buffered parts, and
  concurrent uploads.
- Every byte makes a double hop (browser to tusd, then tusd to MinIO), so the
  ingest host is a bandwidth chokepoint at high load.
- tusd locks are per-instance and held in memory. There is no built-in
  distributed lock yet, so scaling to multiple tusd instances requires sticky
  sessions to keep each upload pinned to one instance.
- A stale lock from a dropped connection can briefly block a resume until tusd
  releases it, which depends on correct timeout settings at tusd and at Caddy.
- The post-finish hook must be idempotent, since hooks can be retried.
- The pre-create hook is availability-critical, because uploads cannot start if
  it is slow or down.
- Upload tokens must outlive long uploads, or the client must refresh them on
  resume.
- Incomplete multipart uploads and per-upload metadata objects accumulate in
  MinIO and need a cleanup policy.

### Follow-up decisions to settle during design

- Part size versus the multipart part-count limit. For 50 GB, choose a part size
  (for example, 16 MB to 64 MB) that stays well under the 10,000 part ceiling.
- Admission control. Cap concurrent uploads at what the host can serve. Enforce
  it in the pre-create hook using a Redis counter, with a coarse connection limit
  at Caddy as an outer guard. Reject excess uploads fast with a 503 and a
  Retry-After header, and rely on resume to retry. Do not hold overflow
  connections open.
- Caddy configuration. Use generous timeouts so long chunk transfers are not cut
  off, and stream request bodies rather than buffering them.
- Download path. Serve finished files directly from MinIO or a static server, not
  through tusd, because tusd locks apply to reads as well.
- Cleanup. Add a MinIO lifecycle rule for abandoned multipart uploads and a
  periodic job to remove stale metadata objects.

## 5. Rollout Plan

The change follows the strangler fig pattern. The new path grows alongside the
old path, is proven, and only then replaces it. At every step, the main branch
stays deployable.

- Phase 0: This document. Record the decision, the alternatives, and the plan.
- Phase 1: Spike. In an isolated compose file, prove that tusd writes to MinIO,
  the pre-create hook fires and can reject, and a killed upload resumes. This code
  is disposable and is deleted afterward.
- Phase 2: Additive scaffolding. Define the hook API and add backward-compatible
  database changes as versioned migrations (new nullable columns or a new table,
  nothing altered or dropped). Add a feature flag, off by default.
- Phase 3: Parallel build behind the flag. Add the tusd service, implement the
  hook handlers, and add the Uppy uploader. The existing upload endpoint stays
  intact and remains the default. Each pull request is small and leaves the main
  branch working.
- Phase 4: Test the new path. Cover resume after a drop, concurrent uploads,
  admission control under load, and the lock behavior. Confirm that existing
  uploads and existing videos still work.
- Phase 5: Incremental cutover. Enable the flag for the author first, then make
  tus the default for new uploads while keeping the old endpoint available to
  drain in-flight and legacy uploads. Watch logs and metrics.
- Phase 6: Decommission. Once the new path is trusted and unused, remove the old
  upload code, routes, and tests in a dedicated cleanup pull request.

Cross-cutting practices: one logical change per pull request, additive and
reversible steps, observability (structured hook logs, upload metrics, a tusd
health check) in place before cutover, and a green main branch at all times.

## 6. Rollback Plan

- The feature flag is the primary rollback. Turning it off reverts to the
  existing multipart endpoint in one change, with no redeploy required.
- Database migrations are additive, so they can be reverted without data loss.
- Because the old path is untouched until Phase 6, there is a working fallback at
  every step before decommissioning.

## 7. References

- tus resumable upload protocol: https://tus.io
- tusd documentation: https://tus.github.io/tusd/
- tusd upload locks: https://tus.github.io/tusd/advanced-topics/locks/
- Uppy: https://uppy.io
- S3 multipart upload limits and behavior (AWS documentation)