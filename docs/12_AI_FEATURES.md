# 12 — AI Features

The frontend has a full set of AI-powered feature components — scene analysis, mood detection, smart recommendations, watch time predictions, and more. They're beautifully designed and placed exactly where they should appear in the UI. But right now, every single one of them is a static mock. No model is running, no API is being called, and every data point you see is hardcoded.

This document explains what's there, what it's supposed to do, what the vision is, and what it would actually take to make it real.

---

## What Exists Today (All Mocked)

### Scene Timeline

**`app/(protected)/home/watch/[video_id]/_components/AISceneTimeline.tsx`**

An interactive timeline below the video player that shows detected scene boundaries with labels. The UI shows a scrollable timeline with color-coded scene markers and labels like "Action sequence", "Dialogue", "Exterior shot".

**Current state:** Hardcoded array of fake scenes with static timestamps and labels. The component renders beautifully but nothing changes when you seek the video.

**What it needs:** A backend model that analyzes the video and returns scene boundaries with timestamps and categories. This would run as an additional Celery task after transcoding completes, storing results in the database.

### Mood Analysis

**`app/(protected)/home/watch/[video_id]/_components/AIMoodAnalysis.tsx`**

A sidebar panel showing the detected emotional tone of the video — action, drama, comedy, thriller — as percentages with a visual bar chart. Also shows recommended similar videos based on "mood matching."

**Current state:** Completely hardcoded percentages and recommendations. The numbers don't change between videos.

**What it needs:** A content analysis model (genre classification, sentiment analysis) that outputs a mood profile per video. Results stored as a JSON column on the Video model.

### Watch Time Banner

**`app/(protected)/home/watch/[video_id]/_components/AIWatchTimeBanner.tsx`**

A banner at the top of the watch page that says something context-aware — like "Good evening! Great choice for winding down." The component branches on `new Date().getHours()` for the time-of-day greeting, so that part is actually dynamic. But the "AI recommendation" message below it is still hardcoded.

**Current state:** Partially real (time-of-day greeting), mostly fake (recommendation text).

**What it needs:** A user behavior model that can suggest content based on viewing history.

### Smart Recommendations

**`app/(protected)/home/watch/[video_id]/_components/AIRecommendations.tsx`**

A "You might also like" section with recommended videos. Shows thumbnail, title, and a "Match score" percentage.

**Current state:** Three hardcoded video objects with fake match scores.

**What it needs:** A recommendation model — collaborative filtering (what similar users watched), content-based filtering (videos with similar tags/category/mood), or a combination.

### Engagement Predictor

**`app/(protected)/home/_components/AIEngagementPredictor.tsx`**

On the home feed, shows a "trending for you" indicator on certain video cards. Currently just adds a badge to hardcoded video IDs.

**What it needs:** A model that predicts which videos a specific user is likely to engage with, based on their watch history.

### Auto-Generated Chapters

**`app/(protected)/home/watch/[video_id]/_components/AIChapters.tsx`**

Like YouTube chapters — clickable named sections that jump to a timestamp in the video. Currently shows hardcoded chapter names and timestamps.

**What it needs:** A transcript or scene analysis model that can produce meaningful chapter breaks.

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
# In workflows.py — extend the chain
chain(
    prepare_video.s(video_id),
    chord(
        group(transcode_1440p.s(), ..., transcode_144p.s()),
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

| Component | Location | Status |
|-----------|----------|--------|
| Scene Timeline | watch page | ❌ Fully mocked |
| Mood Analysis | watch page | ❌ Fully mocked |
| Watch Time Banner | watch page | ⚠️ Time-of-day real, recommendation mocked |
| Smart Recommendations | watch page | ❌ Fully mocked |
| Engagement Predictor | home feed | ❌ Fully mocked |
| Auto Chapters | watch page | ❌ Fully mocked |

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
