# 12 — AI Features

The frontend has a full set of AI-powered feature components — scene analysis, mood detection, smart recommendations, watch time predictions, and more. They were originally designed and placed exactly where they should appear in the UI. That's no longer true of their current state: during the dark/cyan design-system migration, every one of these components' imports and JSX usage was deliberately removed from both the home page and the watch page ("real surfaces polished over fake surfaces themed" was the literal rule applied — see [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) §3.5). At that point the component files were left in place rather than deleted, orphaned but still on disk.

That changed for the watch-page components specifically during the 2026-07-27 watch-page minimalist redesign: the user's explicit instruction that pass ("remove the code or files for whatever things we're not using on the watch page, I don't want any dead code or mock items") superseded the earlier "leave orphaned" policy for that directory. All five watch-page AI mock files — Scene Timeline, Mood Analysis, Smart Recommendations, Watch Party, Content Warnings — were **deleted outright**, not just unlinked. The browse-page one (`AIWatchTimeBanner.tsx`, home feed) was out of scope for that pass and remains on disk, orphaned, same as before.

No model was ever running for any of these, no API was being called, and every data point was hardcoded. This document now serves as the historical record of what existed and the vision behind it — useful if these are ever rebuilt, but understand going in that rebuilding the watch-page ones means writing new files, not resurrecting old ones.

---

## What Exists Today (Coded, Styled, but Orphaned From Every Page)

Paths below reflect where these files lived before the 2026-07-27 deletion pass — kept for reference since the descriptions and extension points below are still the vision, even though the watch-page files no longer exist on disk.

### Scene Timeline — file no longer exists (deleted 2026-07-27)

Was **`app/(public)/(browse)/watch/[video_id]/_components/AISceneTimeline.tsx`**.

An interactive timeline below the video player that shows detected scene boundaries with labels. The UI shows a scrollable timeline with color-coded scene markers and labels like "Action sequence", "Dialogue", "Exterior shot".

**Former state:** Hardcoded array of fake scenes with static timestamps and labels. The component rendered beautifully but nothing changed when you seek the video.

**What it needs:** A backend model that analyzes the video and returns scene boundaries with timestamps and categories. This would run as an additional Celery task after transcoding completes, storing results in the database.

### Mood Analysis — file no longer exists (deleted 2026-07-27)

Was **`app/(public)/(browse)/watch/[video_id]/_components/AIMoodAnalysis.tsx`**.

A sidebar panel showing the detected emotional tone of the video — action, drama, comedy, thriller — as percentages with a visual bar chart. Also shows recommended similar videos based on "mood matching."

**Former state:** Completely hardcoded percentages and recommendations. The numbers didn't change between videos.

**What it needs:** A content analysis model (genre classification, sentiment analysis) that outputs a mood profile per video. Results stored as a JSON column on the Video model.

### Watch Time Banner — still orphaned, not deleted

**`app/(public)/(browse)/_components/AIWatchTimeBanner.tsx`** (this one lives with the browse feed's components, not the watch page's — the name is a slight misnomer)

A banner at the top of the watch page that says something context-aware — like "Good evening! Great choice for winding down." The component branches on `new Date().getHours()` for the time-of-day greeting, so that part is actually dynamic. But the "AI recommendation" message below it is still hardcoded.

**Current state:** Partially real (time-of-day greeting), mostly fake (recommendation text). Out of scope for the 2026-07-27 watch-page cleanup pass (that pass was scoped to the watch page's own directory) — still on disk, still orphaned, unchanged.

**What it needs:** A user behavior model that can suggest content based on viewing history.

### Smart Recommendations — file no longer exists (deleted 2026-07-27)

Was **`app/(public)/(browse)/watch/[video_id]/_components/AIRecommendations.tsx`**.

A "You might also like" section with recommended videos. Shows thumbnail, title, and a "Match score" percentage.

**Former state:** Three hardcoded video objects with fake match scores.

**What it needs:** A recommendation model — collaborative filtering (what similar users watched), content-based filtering (videos with similar tags/category/mood), or a combination.

### Engagement Predictor — file no longer exists

`AIEngagementPredictor.tsx` (previously under the home feed's components — would have shown a "trending for you" badge on certain video cards) has been **deleted**, not merely orphaned. Unlike the rest of this document's components, there's no file left to resurrect; this one would need to be rebuilt from the concept described here.

### Auto-Generated Chapters — file no longer exists

`AIChapters.tsx` (previously under the watch page's components — would have shown clickable YouTube-style named sections jumping to a timestamp) is likewise **deleted**, not orphaned. Same situation: rebuild from scratch if wanted.

### Two more — also deleted 2026-07-27

Two additional AI-adjacent mock components weren't part of this document's original scope but lived in the same directory: **`AIWatchParty.tsx`** and **`AIContentWarnings.tsx`**, both formerly at `app/(public)/(browse)/watch/[video_id]/_components/`. They were unlinked from `page.tsx` during the design-system migration same as the others, then deleted outright in the same 2026-07-27 pass that removed the rest of the watch page's dead code.

---

## The Right Backend Extension Points

The good news: the existing codebase is well-positioned to add AI features without major surgery.

**The Video model already has the right structure.** It uses JSON columns for `tags`, `available_qualities`, and `processing_metadata`. Adding AI output fields follows the same pattern:

```python
# In backend/app/models/videos.py
scene_data = Column(JSON, nullable=True)        # scene boundaries + labels
mood_profile = Column(JSON, nullable=True)       # {action: 0.7, drama: 0.2, ...}
chapter_data = Column(JSON, nullable=True)       # [{title: "...", start_seconds: 0}, ...]
ai_metadata = Column(JSON, nullable=True)        # general-purpose AI output bucket
```

**The Celery pipeline already has the right shape.** AI analysis tasks can run in parallel with (or after) the existing transcoding workflow:

```python
# In workflows.py — extend the chain. generate_storyboard.s() is the real
# precedent for "extra stage that runs best-effort alongside the pipeline" —
# model new AI stages on it, not on the stages that can fail the workflow.
chain(
    prepare_video.s(video_id),
    generate_storyboard.s(),
    chord(
        group(transcode_quality.s(q) for q in QUALITIES),
        on_transcode_complete.s()
    ),
    segment_videos.s(),
    create_manifest.s(),
    upload_to_minio.s(),
    finalize_processing.s(),
    # New: AI analysis after transcoding
    analyze_scenes.s(video_id),
    generate_mood_profile.s(video_id),
    generate_chapters.s(video_id),
)
```

---

## Practical Starting Points

Rather than waiting to build everything, two AI features could be implemented quickly without introducing any new ML infrastructure:

**1. Transcript-based chapters using Whisper**

[OpenAI Whisper](https://github.com/openai/whisper) is a free, open-source speech recognition model that runs locally. A Celery task could run Whisper on the audio track of each video, produce a transcript with timestamps, and then use the transcript segments as rough "chapters." No API cost, no external service.

**2. Claude-based scene descriptions**

After transcription, call the Anthropic Claude API with the transcript and ask it to identify chapter titles and descriptions. This adds minimal cost per video and produces human-quality summaries. Store the result in `chapter_data`.

**3. Tag-based recommendations (no ML required)**

Before adding a recommendation model, start simple: recommend other videos with overlapping `tags`. The `tags` JSON column is already on the Video model. A SQL query using `&&` (array overlap) on a PostgreSQL JSON array can find related videos without any ML.

---

## Current AI Feature State: Quick Reference

| Component | Originally designed for | Status |
|-----------|--------------------------|--------|
| Scene Timeline | watch page | **Deleted** (2026-07-27) — no file remains, would need rebuilding |
| Mood Analysis | watch page | **Deleted** (2026-07-27) — no file remains, would need rebuilding |
| Watch Time Banner | browse feed | Still orphaned — time-of-day greeting logic was real, recommendation text was mocked; out of scope for the watch-page cleanup, unchanged |
| Smart Recommendations | watch page | **Deleted** (2026-07-27) — no file remains, would need rebuilding |
| Engagement Predictor | home feed | **Deleted** — no file remains, would need rebuilding |
| Auto Chapters | watch page | **Deleted** — no file remains, would need rebuilding |
| Watch Party | watch page | **Deleted** (2026-07-27) — no file remains, would need rebuilding |
| Content Warnings | watch page | **Deleted** (2026-07-27) — no file remains, would need rebuilding |

---

## Future Upgrade Path

A realistic progression for AI features:

**Phase 1 (no new infrastructure):**
- Tag-based related video recommendations using SQL
- Transcript generation with Whisper (runs in worker container)
- Claude API for chapter titles from transcript

**Phase 2 (simple ML):**
- Scene boundary detection with a vision model (PySceneDetect is lightweight)
- Genre/mood classification using a pre-trained text classifier on video metadata

**Phase 3 (full ML platform):**
- Collaborative filtering recommendation model (requires watch history data)
- Real-time personalization (requires per-user event tracking)
- A dedicated ML inference service separate from the Celery worker

The smart order: start with Phase 1. It delivers real, visible value (chapters, transcript search, related videos) with tools you can run in the same Docker environment. The watch history table is the prerequisite for Phase 3 — build that first.

---

## What's Next

Now that you understand what's built, what's mocked, and what's missing — let's look at the full list of known bugs and the prioritized roadmap for what to work on next.
