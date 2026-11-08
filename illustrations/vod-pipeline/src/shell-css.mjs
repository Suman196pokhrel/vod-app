// Page CSS on top of the kit's ISO_CSS tokens: full-bleed layout, rail, tabs, and the
// figure's own live states (lamps, tokens, pulses, focus dimming) for both themes.
export const PAGE_CSS = `
*{box-sizing:border-box}
html{color-scheme:dark}
body[data-theme="light"]{color-scheme:light}
body{margin:0;background:var(--anatomy-page);color:var(--anatomy-text);font:14px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.iso{--dim-hi:#5c5c5c;--dim-mid:#3a3a3a;--dim-lo:#2c2c2c;--on-mid:#d4d4d4;--lamp-on:#ffffff;--lamp-warn:#ff6b6b;--glass:#0c0d0e;--glass-line:#262626;--pic-sky:#1d2126;--pic-hill:#2d3239;--pulse:#ffffff;--bus-window:#0a0a0a}
.iso[data-theme="light"]{--dim-hi:#b4b4b8;--dim-mid:#cfcfd2;--dim-lo:#e0e0e2;--on-mid:#26262a;--lamp-on:#000000;--lamp-warn:#e5484d;--glass:#e9eaec;--glass-line:#c9c9cc;--pic-sky:#d9dde2;--pic-hill:#b9c0c8;--pulse:#000000;--bus-window:#e2e2df}
.top{display:grid;grid-template-columns:1fr auto;gap:14px 24px;align-items:end;padding:22px clamp(16px,2.2vw,36px) 0}
.brand{display:flex;gap:16px;align-items:flex-start}
.brand .mark{font:600 12px/1 var(--anatomy-mono);letter-spacing:.14em;color:var(--anatomy-strong);border:1px solid var(--anatomy-mid);padding:8px 9px;margin-top:3px}
.brand h1{margin:0;font-size:20px;font-weight:600;color:var(--anatomy-strong);letter-spacing:-.01em}
.brand p{margin:4px 0 0;max-width:820px;color:var(--anatomy-muted);font-size:13px}
.tools{display:flex;gap:8px}
.theme{background:none;border:1px solid var(--anatomy-lo);color:var(--anatomy-text);width:34px;height:34px;font-size:16px;cursor:pointer}
.tabs{grid-column:1/-1;display:flex;gap:2px;border-bottom:1px solid var(--anatomy-lo);overflow-x:auto;scrollbar-width:none}
.tab{background:none;border:0;border-bottom:2px solid transparent;color:var(--anatomy-muted);padding:10px 14px 9px;font:500 13px/1 ui-sans-serif,system-ui,sans-serif;cursor:pointer;white-space:nowrap;display:flex;gap:8px;align-items:center}
.tab .num{font-family:var(--anatomy-mono);font-size:11px;opacity:.7}
.tab[aria-selected="true"]{color:var(--anatomy-strong);border-bottom-color:var(--anatomy-strong)}
.tab:disabled{cursor:default;opacity:.55}
.tab .soon{font:10px/1 var(--anatomy-mono);text-transform:uppercase;letter-spacing:.08em;border:1px solid var(--anatomy-lo);padding:3px 5px}
main{padding:18px clamp(16px,2.2vw,36px) 48px}
.plate{display:grid;grid-template-columns:minmax(0,1fr);gap:18px}
@media (min-width:1360px){.plate{grid-template-columns:minmax(0,1fr) clamp(340px,24vw,460px)}}
.fig-col{min-width:0}
.iso-figure{margin:0}
.iso-plate{padding:40px 10px 40px}
.iso-plate .iso-svg{overflow:hidden;width:100%;height:auto;max-height:calc(100vh - 210px);min-height:240px}
.stage{outline:none;touch-action:pan-y;cursor:zoom-in}
.stage[data-zoomed]{cursor:zoom-out}
.zoom-out{position:absolute;right:20px;top:40px;z-index:2;display:none}
.stage[data-zoomed] + .zoom-out,.iso-plate[data-zoomed] .zoom-out{display:inline-block}
.stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.legend{list-style:none;padding:0;margin:14px 0 0;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px}
.key{width:100%;display:flex;gap:10px;align-items:center;text-align:left;background:var(--anatomy-card);border:1px solid var(--anatomy-faint);color:var(--anatomy-text);padding:8px 10px;font:13px/1.3 ui-sans-serif,system-ui,sans-serif;cursor:pointer}
.key .num{font:600 11px/1 var(--anatomy-mono);color:var(--anatomy-strong);border:1px solid var(--anatomy-lo);padding:4px 5px}
.key[data-on]{border-color:var(--anatomy-mid);color:var(--anatomy-strong)}
.caption{color:var(--anatomy-muted);font-size:13px;max-width:1100px;margin:12px 0 0}
.rail{display:flex;flex-direction:column;gap:10px;min-width:0}
@media (min-width:1360px){.rail{position:sticky;top:12px;max-height:calc(100vh - 24px);overflow:auto;scrollbar-width:thin}}
.panel{background:var(--anatomy-card);border:1px solid var(--anatomy-faint);padding:12px 14px}
.panel h3{margin:0 0 8px;font:600 10.5px/1 var(--anatomy-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--anatomy-muted)}
.panel p{margin:0;color:var(--anatomy-text)}
.panel .muted{text-transform:none;letter-spacing:0;font-weight:400}
.now p[data-story]{color:var(--anatomy-strong);font-size:14.5px}
.now .why{margin-top:8px;color:var(--anatomy-muted);font-size:13px}
.focus p{font-size:13.5px}
.focus b{color:var(--anatomy-strong);font-weight:600}
.scenarios{display:flex;flex-direction:column;gap:10px}
.btns{display:flex;flex-wrap:wrap;gap:6px}
.btn{background:none;border:1px solid var(--anatomy-lo);color:var(--anatomy-text);padding:6px 10px;font:12.5px/1.2 ui-sans-serif,system-ui,sans-serif;cursor:pointer}
.btn:hover{border-color:var(--anatomy-mid);color:var(--anatomy-strong)}
.btn[aria-pressed="true"]{border-color:var(--anatomy-strong);color:var(--anatomy-strong)}
.seg{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--anatomy-muted)}
.seg .lbl{min-width:96px}
.seg .btn{padding:4px 8px;font-size:12px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.stat b{display:block;font:600 18px/1.1 var(--anatomy-mono);color:var(--anatomy-strong);font-variant-numeric:tabular-nums}
.stat span{font-size:11px;color:var(--anatomy-muted)}
.log ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;max-height:340px;overflow:auto;font:11.5px/1.45 var(--anatomy-mono)}
.log li{display:grid;grid-template-columns:44px 1fr;gap:6px;color:var(--anatomy-text)}
.log li .t{color:var(--anatomy-muted)}
.log li .ref{display:block;color:var(--anatomy-muted)}
.log li[data-tone="lit"],.log li[data-tone="ok"]{color:var(--anatomy-strong)}
.log li[data-tone="warn"]{color:var(--lamp-warn)}
.log li[data-tone="dim"]{opacity:.7}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.lamp-glow{fill:var(--anatomy-faint);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}
[data-lamp][data-on] .lamp-glow{fill:var(--lamp-on);stroke:var(--lamp-on)}
[data-lamp][data-warn] .lamp-glow{fill:var(--lamp-warn);stroke:var(--lamp-warn)}
.bus-window{fill:var(--bus-window);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}
.iso-svg path.bus-pulse{fill:none;stroke:var(--pulse);stroke-width:3.4;stroke-linecap:round;vector-effect:none}
.iso-svg path.pulse{fill:none;stroke:var(--pulse);stroke-width:1.9;stroke-linecap:butt;stroke-dasharray:0 100000;vector-effect:none}
.screen-glass{fill:var(--glass);stroke:none}
.bar-track{fill:var(--glass-line)}
.bar-fill{fill:var(--anatomy-hi)}
.upbar[data-err] .bar-fill{fill:var(--lamp-warn)}
.pic-sky{fill:var(--pic-sky)}.pic-hill{fill:var(--pic-hill)}.pic-sun{fill:var(--anatomy-mid)}
.player .pip{fill:var(--glass-line)}.player .pip[data-on]{fill:var(--anatomy-lit)}
.scrub{fill:var(--glass-line)}.scrub-fill{fill:var(--anatomy-hi)}
.paused rect{fill:var(--glass);opacity:.85}.paused path{fill:var(--anatomy-hi)}
.gauge-track{fill:var(--bus-window)}.gauge-fill{fill:var(--anatomy-hi)}
.it[data-hide]{display:none}
.it{transition:none}
.tile-row{opacity:0}.tile-row[data-on]{opacity:1}
.it.on-lit .iso-edge{stroke:var(--anatomy-lit)}
.stage[data-focus] .it.dim{--anatomy-hi:var(--dim-hi);--anatomy-mid:var(--dim-mid);--anatomy-lo:var(--dim-lo)}
.stage[data-focus] .it.on{--anatomy-mid:var(--on-mid);--anatomy-hi:var(--anatomy-lit)}
@media (prefers-reduced-motion:reduce){.it{transition:none}}
@media (max-width:760px){.stage{overflow-x:auto;overscroll-behavior-x:contain}.iso-plate .iso-svg{width:920px;max-width:none;max-height:none}.legend{grid-template-columns:1fr 1fr}.key{padding:6px 8px;font-size:12px}.iso-plate{padding:40px 0 44px}.zoom-out{top:auto;bottom:44px;right:12px}}
`;
