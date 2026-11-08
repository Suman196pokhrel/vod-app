// Plate 3's extra events on the shared model: a direct arrival and a stale lock release.
import { LADDER, log, send, hex, dispatch, startNextIfIdle } from "./model.mjs";

// What post-finish does for an upload that is already complete: a queued row, then the queue.
export function arrive(s, { height = 1080, duration = 300, fault = null } = {}) {
  const vid = hex(s.seq++);
  s.videos.push({ id: vid, height, duration, fault, status: "queued", created: s.t, error: null, public: false, rungs: LADDER.map((r) => ({ ...r, state: "waiting", p: 0 })), stage: "queued", segs: Math.ceil(duration / 6), sheets: Math.ceil(Math.floor(duration / 5 + 1) / 100), done: 0 });
  send(s, "api", "postgres", "INSERT videos (queued)", vid);
  log(s, `post-finish: Video ${vid} row created as queued (created_at ${s.t.toFixed(1)} s)`, "videoRow", "", vid);
  if (s.cfg.lock) startNextIfIdle(s);
  else dispatch(s, s.videos[s.videos.length - 1], "pre-fix: chain dispatched straight away, no lock");
  return vid;
}

// A late, duplicate callback from a video that already finished: the Lua script compares
// the lock's value with its own id first, so it can never free the current holder's slot.
export function staleRelease(s) {
  const old = [...s.videos].reverse().find((v) => (v.status === "completed" || v.status === "failed") && v.id !== s.lock && !v.seed);
  if (!old || !s.lock) return false;
  send(s, "worker", "redis", "EVAL release-if-owner", old.id);
  const owned = s.lock === old.id;
  if (owned) s.lock = null;
  log(s, `late duplicate callback from ${old.id}: EVAL release-if-owner → GET returns ${s.lock || "nil"}, not ${old.id}, so DEL is skipped (returns 0)`, "luaRelease", "warn", old.id);
  return true;
}
