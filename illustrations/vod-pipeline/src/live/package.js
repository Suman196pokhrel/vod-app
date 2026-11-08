// Plate 5 controller: packaging, then playback under different networks and players.
const PACKAGE_SCENARIOS = {
  good: { label: "1080p source · good connection", sourceH: 1080, profile: "steady", why: "Six renditions (1440p was never encoded) are cut into segments and listed in master.m3u8. The player starts from a cautious 1 Mbps estimate, so the first segments come from a low rendition; once it has measured the link, it climbs to 1080p." },
  drop: { label: "Bandwidth drops mid-play", sourceH: 1080, profile: "drop", why: "The link falls to about 1 Mbps. The 60-second buffer rides out the first part of the dip; when new fetches come in slow, hls.js steps down to a rendition the link can carry, then climbs back as the link recovers. No stall." },
  sd: { label: "480p source · slow link", sourceH: 480, profile: "slow", why: "Only four variants exist, and the link is about 2.4 Mbps: hls.js settles on 480p, the best this source has. A smaller ladder means fewer, cheaper segments to store." },
  small: { label: "Small player (640 px wide)", sourceH: 1080, profile: "steady", playerWidth: 640, why: "capLevelToPlayerSize: true. Even on a fast link, hls.js won't fetch more pixels than the player can show: it stops at the smallest rendition at least as large as the player in device pixels: 640 px on a 1× screen is 360p (on a 2× screen it would be 720p)." },
  scrub: { label: "Scrub the timeline", sourceH: 1080, profile: "steady", scrub: true, why: "Scrubbing previews don't touch the video: the player reads storyboard.vtt from vod-thumbnails and, for the time under the cursor, shows the cue's tile of the sprite sheet (#xywh=x,y,w,h)." },
};
const PACKAGE_TOUR = ["good", "drop", "small", "scrub", "sd"];

function packageStory(s) {
  switch (s.phase) {
    case "segment": return `segment_videos copies ${s.rungs[s.cur].q} into ~6-second .ts segments (no re-encode): ${Math.floor(s.rungs[s.cur].segs)} of ${SEGS}. Renditions go one after another in a single task.`;
    case "manifest": return "create_manifest writes master.m3u8: one #EXT-X-STREAM-INF line per rendition, with its bandwidth and resolution, pointing at that rendition's own playlist.";
    case "upload": return `upload_to_minio: master.m3u8 first, then each folder of playlist + segments into vod-processed (${s.avail[Math.min(s.cur, s.avail.length - 1)]?.q}).`;
    case "finalize": return "finalize_processing marks the video completed, saves manifest_url and available_qualities, and deletes the work dir.";
    case "play": {
      const p = s.play;
      return p.level ? `Playing ${p.level.q}. hls.js estimates ${p.est.toFixed(1)} Mbps and has ${Math.round(p.buffered)} s buffered; each fetch is one ${p.level.q}/segment_NNNN.ts through /storage.` : "The player loads master.m3u8 through Caddy's /storage route.";
    }
    case "ended": return `Played to the end with ${s.play.switches} rendition switch(es) and ${s.play.stalls} stall(s).`;
    default: return "";
  }
}

PLATES.package = {
  mount(root) {
    const D = PACKAGE;
    const stage = root.querySelector(".stage");
    const R = packageRenderer(stage, D);
    const $ = (sel) => root.querySelector(sel);
    let s, seen = -1, touring = !stillQuery.matches, tourIdx = 0, idle = 0, storyAt = 0, speed = 1.5;
    const start = (id) => {
      const sc = PACKAGE_SCENARIOS[id];
      s = createPackage({ refs: REFS, sourceH: sc.sourceH, profile: sc.profile, playerWidth: sc.playerWidth ?? 1920, scrub: !!sc.scrub });
      R.reset();
      seen = -1;
      $("[data-log]").replaceChildren();
      delete $("[data-log]").dataset.n;
      $("[data-why]").textContent = sc.why;
      $("[data-live]").textContent = `Scenario: ${sc.label}`;
      for (const b of root.querySelectorAll("[data-run]")) b.setAttribute("aria-pressed", String(b.dataset.run === id));
    };
    root.querySelectorAll("[data-run]").forEach((b) => b.addEventListener("click", () => { touring = false; start(b.dataset.run); }));
    root.querySelectorAll("[data-set]").forEach((b) => b.addEventListener("click", () => {
      touring = false;
      speed = Number(b.dataset.set.split(":")[1]);
      for (const o of root.querySelectorAll('[data-set^="speed:"]')) o.setAttribute("aria-pressed", String(o === b));
    }));
    focusing(root, D.stations);
    const zoom = zooming(root, D.stations);
    start("good");
    const stop = frameLoop(stage, (dt, calm) => {
      if (window.__freeze) return;
      const k = s.phase === "play" ? 4 : 1;
      for (let i = 0; i < 4; i++) stepPackage(s, (dt * speed * k) / 4);
      for (const ev of s.traffic) if (ev.n > seen) { R.traffic(ev, calm); seen = ev.n; }
      R.render(s, dt, calm);
      renderLog($("[data-log]"), s.log);
      idle = s.phase === "ended" ? idle + dt : 0;
      if (touring && idle > 4) start(PACKAGE_TOUR[++tourIdx % PACKAGE_TOUR.length]);
      storyAt -= dt;
      if (storyAt <= 0) {
        storyAt = 0.3;
        $("[data-story]").textContent = packageStory(s);
        const p = s.play;
        root.querySelector("[data-readout]").textContent = `${s.phase} · ${s.avail.length} variants · ${p.level ? `${p.level.q} · est ${p.est.toFixed(1)} Mbps · buffer ${Math.round(p.buffered)} s` : "not playing"}`;
        $("[data-stats]").innerHTML = [["variants", s.avail.length], ["segments", s.avail.length * SEGS], ["switches", p.switches], ["stalls", p.stalls]].map(([l, n]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("");
      }
    });
    return { unmount: () => { stop(); zoom.stop(); } };
  },
};
