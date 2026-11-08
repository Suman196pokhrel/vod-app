// Shared page runtime: theme, tabs (hash routed), mounting one plate at a time, and a
// visibility-aware frame loop. Plates register themselves in PLATES[id] = { mount }.
const PLATES = {};
const stillQuery = matchMedia("(prefers-reduced-motion: reduce)");

const params = new URLSearchParams(location.search);
const EMBED = params.has("embed");

// Embedded in the docs site: theme comes from the URL and follows the parent's messages,
// and the page reports its height so the iframe can size itself without a scrollbar.
// The root's color-scheme must match the theme: an iframe whose scheme differs from its
// parent page gets an opaque backdrop instead of a transparent one.
function setTheme(theme) {
  document.body.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem("vod-anatomy-theme"); } catch {}
  const prefers = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  const forced = ["light", "dark"].includes(params.get("theme")) ? params.get("theme") : null;
  setTheme(forced || saved || prefers);
  document.querySelector("[data-theme-toggle]").addEventListener("click", () => {
    const next = document.body.dataset.theme === "light" ? "dark" : "light";
    setTheme(next);
    try { localStorage.setItem("vod-anatomy-theme", next); } catch {}
  });
  if (!EMBED) return;
  document.body.toggleAttribute("data-embed", true);
  // The parent sizes the frame, so an inner scrollbar would only flash in while it catches up.
  document.documentElement.style.overflow = "hidden";
  addEventListener("message", (e) => {
    if (e.data?.type === "anatomy:theme" && ["light", "dark"].includes(e.data.theme)) setTheme(e.data.theme);
  });
  let last = 0;
  const report = () => {
    const height = Math.ceil(document.body.getBoundingClientRect().height);
    if (Math.abs(height - last) < 2) return;
    last = height;
    parent.postMessage({ type: "anatomy:height", height }, "*");
  };
  new ResizeObserver(report).observe(document.body);
  report();
}

let current = null;
function openTab(id) {
  const tpl = document.getElementById(`tpl-${id}`);
  if (!tpl) return;
  if (current?.id === id) return;
  current?.instance?.unmount?.();
  const mount = document.querySelector("[data-mount]");
  mount.replaceChildren(tpl.content.cloneNode(true));
  for (const tab of document.querySelectorAll(".tab")) tab.setAttribute("aria-selected", String(tab.dataset.tab === id));
  const root = mount.querySelector(".plate");
  current = { id, instance: PLATES[id]?.mount(root) };
}

function initTabs() {
  for (const tab of document.querySelectorAll(".tab:not(:disabled)")) {
    tab.addEventListener("click", () => { location.hash = tab.dataset.tab; });
  }
  const route = () => openTab(location.hash.slice(1) || document.querySelector(".tab:not(:disabled)").dataset.tab);
  addEventListener("hashchange", route);
  route();
}

// A frame loop that pauses offscreen and clamps dt so a background tab never jumps.
function frameLoop(stage, tick) {
  let frame = 0, last = 0, visible = true, alive = true;
  const run = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    tick(dt, stillQuery.matches);
    frame = alive && visible ? requestAnimationFrame(run) : 0;
  };
  const io = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible && !frame && alive) { last = 0; frame = requestAnimationFrame(run); }
  }, { rootMargin: "120px 0px" });
  io.observe(stage);
  frame = requestAnimationFrame(run);
  return () => { alive = false; cancelAnimationFrame(frame); io.disconnect(); };
}

// Hover, focus and legend keys all select one station; everything else steps down a tone.
function focusing(root, stations, onFocus) {
  const stage = root.querySelector(".stage");
  const items = [...stage.querySelectorAll(".it")];
  const text = root.querySelector("[data-focus-text]");
  const keys = [...root.querySelectorAll("[data-key]")];
  let on = null;
  const set = (id) => {
    if (id === on) return;
    on = id;
    if (id) stage.dataset.focus = id; else delete stage.dataset.focus;
    for (const it of items) {
      const mine = it.dataset.st === id;
      it.classList.toggle("on", !!id && mine);
      it.classList.toggle("dim", !!id && !mine);
    }
    for (const key of keys) key.toggleAttribute("data-on", key.dataset.key === id);
    const s = stations.find((x) => x.id === id);
    text.innerHTML = s ? `<b>${String(s.n).padStart(2, "0")} · ${s.name}</b><br>${s.role}` : "Hover any machine, or a number below, to see what it is.";
    onFocus?.(id);
  };
  stage.addEventListener("pointermove", (e) => {
    const st = e.target.closest?.(".it")?.dataset.st;
    set(stations.some((x) => x.id === st) ? st : null);
  });
  stage.addEventListener("pointerleave", () => set(null));
  for (const key of keys) {
    key.addEventListener("pointerenter", () => set(key.dataset.key));
    key.addEventListener("pointerleave", () => set(null));
    key.addEventListener("focus", () => set(key.dataset.key));
    key.addEventListener("blur", () => set(null));
  }
  return set;
}

const fmtT = (t) => `${t.toFixed(1)}s`;
function renderLog(list, log, max = 60) {
  const last = list.dataset.n ? Number(list.dataset.n) : -1;
  const fresh = log.filter((e) => e.n > last);
  if (!fresh.length) return;
  for (const e of fresh) {
    const li = document.createElement("li");
    if (e.tone) li.dataset.tone = e.tone;
    li.innerHTML = `<span class="t">${fmtT(e.t)}</span><span>${e.text}${e.ref ? `<span class="ref">${e.ref}</span>` : ""}</span>`;
    list.prepend(li);
  }
  while (list.children.length > max) list.lastChild.remove();
  list.dataset.n = String(log[log.length - 1].n);
}

// Click a machine (or its legend number) to glide the camera in on it; click again or Esc to return.
function zooming(root, stations, onZoom) {
  const stage = root.querySelector(".stage");
  const plate = root.querySelector(".iso-plate");
  const svg = stage.querySelector("svg");
  const home = svg.getAttribute("viewBox").split(/\s+/).map(Number);
  let view = [...home], from = [...home], to = [...home], t = 1, raf = 0, on = null;
  const boxOf = (id) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const el of stage.querySelectorAll(`.it[data-st="${id}"]`)) {
      if (el.hasAttribute("data-hide")) continue;
      const b = el.getBBox();
      if (!b.width && !b.height) continue;
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
    }
    const pad = 0.09 * Math.max(x1 - x0, y1 - y0);
    let [x, y, w, h] = [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad];
    const aspect = home[2] / home[3];
    if (w / h < aspect) { const nw = h * aspect; x -= (nw - w) / 2; w = nw; } else { const nh = w / aspect; y -= (nh - h) / 2; h = nh; }
    return [x, y, w, h];
  };
  const ease = (u) => 1 - Math.pow(1 - u, 3);
  const frame = () => {
    t = Math.min(1, t + 1 / 33);
    view = from.map((v, i) => v + (to[i] - v) * ease(t));
    svg.setAttribute("viewBox", view.map((v) => v.toFixed(2)).join(" "));
    raf = t < 1 ? requestAnimationFrame(frame) : 0;
  };
  const go = (id) => {
    on = id;
    from = [...view];
    to = id ? boxOf(id) : [...home];
    t = stillQuery.matches ? 0.999 : 0;
    stage.toggleAttribute("data-zoomed", !!id);
    plate.toggleAttribute("data-zoomed", !!id);
    if (!raf) raf = requestAnimationFrame(frame);
    onZoom?.(id);
  };
  stage.addEventListener("click", (e) => {
    const st = e.target.closest?.(".it")?.dataset.st;
    if (on) return go(null);
    if (stations.some((x) => x.id === st)) go(st);
  });
  for (const key of root.querySelectorAll("[data-key]")) key.addEventListener("click", () => go(on === key.dataset.key ? null : key.dataset.key));
  root.querySelector("[data-zoom-out]")?.addEventListener("click", () => go(null));
  const esc = (e) => { if (e.key === "Escape" && on) go(null); };
  addEventListener("keydown", esc);
  return { go, stop: () => { cancelAnimationFrame(raf); removeEventListener("keydown", esc); } };
}
