// The page shell: a full-width, tabbed, client-side multi-plate document. Each plate's
// SVG lives in a <template> and is mounted only while its tab is open.
import { k } from "./scene.mjs";
import { PAGE_CSS } from "./shell-css.mjs";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function plateSection(p) {
  const legend = p.stations.map((s) => `<li><button class="key" data-key="${s.id}"><span class="num">${String(s.n).padStart(2, "0")}</span><span class="nm">${esc(s.name)}</span></button></li>`).join("");
  return `<template id="tpl-${p.id}">
<section class="plate" data-plate="${p.id}">
  <div class="fig-col">
    <figure class="iso-figure">
      <div class="iso-plate">
        <div class="iso-plate-corners" aria-hidden="true">
          <span class="iso-plate-corner" data-corner="fig">${esc(p.fig)}</span>
          <span class="iso-plate-corner" data-corner="title">${esc(p.title)}</span>
          <span class="iso-plate-corner" data-corner="hint">${esc(p.hint)}</span>
          <span class="iso-plate-corner" data-corner="readout" data-readout></span>
        </div>
        <div class="stage" tabindex="0" role="group" aria-label="${esc(p.aria)}">${p.svg}</div>
        <button class="btn zoom-out" data-zoom-out>Zoom out · Esc</button>
      </div>
    </figure>
    <ol class="legend">${legend}</ol>
    <p class="caption">${esc(p.caption)}</p>
  </div>
  <aside class="rail">
    <div class="panel"><h3>Scenario</h3><div class="scenarios">${p.controls}</div></div>
    <div class="panel now"><h3>What's happening</h3><p data-story></p><p class="why" data-why></p></div>
    <div class="panel focus"><h3>Part</h3><p data-focus-text>Hover any machine, or a number below, to see what it is.</p></div>
    <div class="panel stats" data-stats></div>
    <div class="panel log"><h3>Event log <span class="muted">· file:line in the repo</span></h3><ol data-log></ol></div>
    <div class="sr" aria-live="polite" data-live></div>
  </aside>
</section>
</template>`;
}

export function pageHtml({ plates, script, theme }) {
  const tabs = plates.map((p, i) => `<button class="tab" role="tab" data-tab="${p.id}"${p.ready ? "" : " disabled"}><span class="num">${String(i + 1).padStart(2, "0")}</span>${esc(p.tab)}${p.ready ? "" : '<span class="soon">next</span>'}</button>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>VOD Pipeline Anatomy</title><meta name="description" content="Interactive isometric anatomy of a video-on-demand platform: resumable uploads, a one-at-a-time Redis lock, Celery + FFmpeg transcoding to seven HLS renditions, and adaptive playback.">
<style>${k.ISO_CSS}${PAGE_CSS}</style></head>
<body class="iso" data-theme="${theme}">
<header class="top">
  <div class="brand"><span class="mark">VOD</span><div><h1>Pipeline anatomy</h1><p>How a video gets from an admin's laptop to a viewer's screen, as working machines. Every rule, cap and status below is the real one from the codebase; the clock is sped up.</p></div></div>
  <div class="tools"><button class="theme" data-theme-toggle aria-label="Switch light or dark theme">◐</button></div>
  <nav class="tabs" role="tablist">${tabs}</nav>
</header>
<main data-mount></main>
${plates.filter((p) => p.ready).map(plateSection).join("\n")}
<script type="module">${script.replace(/<\/(script)/gi, "<\\/$1")}</script>
</body></html>`;
}
