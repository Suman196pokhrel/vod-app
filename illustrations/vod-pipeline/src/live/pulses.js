// Pulses on single cables: each pulse is a lit dash that runs a cable's length, drawn as a
// dash pattern on the cable chunks' centrelines (in user units, so zoom keeps them aligned).
function cableIndex(stage) {
  const cables = {};
  for (const el of stage.querySelectorAll(".pulse")) {
    (cables[el.dataset.pulse] ||= []).push({ el, from: +el.dataset.from, to: +el.dataset.to, total: +el.dataset.total, len: el.getTotalLength() });
  }
  return cables;
}

function dashesFor(pc, at, half) {
  const k = pc.len / Math.max(1e-6, pc.to - pc.from);
  const spans = at.map((s) => [Math.max(pc.from, s - half), Math.min(pc.to, s + half)]).filter(([a, b]) => b > a).map(([a, b]) => [(a - pc.from) * k, (b - pc.from) * k]).sort((x, y) => x[0] - y[0]);
  if (!spans.length) return "0 100000";
  const arr = [0];
  let cursor = 0;
  for (const [a, b] of spans) { arr.push(Math.max(0, a - cursor), b - Math.max(a, cursor)); cursor = b; }
  arr.push(pc.len + 100);
  return arr.map((v) => v.toFixed(2)).join(" ");
}

function cablePulser(stage, { speed = 160, half = 6 } = {}) {
  const cables = cableIndex(stage);
  const live = [];
  return {
    send(id, dir = 1) { if (cables[id]) live.push({ id, dir, at: 0, total: cables[id][0].total }); },
    draw(dt) {
      const on = {};
      for (const p of live) { p.at += dt * speed; (on[p.id] ||= []).push(p.dir > 0 ? p.at : p.total - p.at); }
      for (let i = live.length - 1; i >= 0; i--) if (live[i].at > live[i].total + half) live.splice(i, 1);
      for (const [id, pieces] of Object.entries(cables)) for (const pc of pieces) pc.el.style.strokeDasharray = dashesFor(pc, on[id] || [], half);
    },
    clear() { live.length = 0; },
  };
}
