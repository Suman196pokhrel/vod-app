// World plan of Plate 4, "Transcode": a probe station, a storyboard contact-sheet printer
// and a seven-station ladder press whose dies are sized to each rung's frame.
import { RUNGS } from "../../transcode-model.mjs";

export const W = 1680;
export const AZIMUTH = 63, ELEVATION = 32;
export const BENCH = { x: 0, y: 0, w: 990, d: 300, r: 12 };

export const PROBE = { x: 20, y: 160, w: 130, d: 100, r: 4 };
export const PROBE_H = 22, CAN = { x: 70, y: 214, r: 11 };
export const PRINTER = { x: 168, y: 160, w: 134, d: 100, r: 4 };
export const PRINTER_H = 16;
export const SHEET = { x: 180, y: 170, w: 74, d: 64 };
export const BED = { x: 320, y: 160, w: 652, d: 110, r: 4 };
export const BED_H = 14, DIE_Y = 196, OUT_Y = 244;
export const STATION_X = RUNGS.map((_, i) => 362 + i * 94);
export const DIE = RUNGS.map((r) => ({ w: (64 * r.w) / 2560, d: (36 * r.h) / 1440 }));
export const BLOCK_H = RUNGS.map((r) => 4 + 20 * Math.sqrt(r.kbps / 10000));

export const BACK_Y = 20, BACK_D = 46, BACK_H = 92;
export const FACE_Y = BACK_Y + BACK_D;
export const MINIO = { x: 20, y: BACK_Y, w: 130, d: BACK_D, r: 3 };
export const FFMPEG = { x: 330, y: BACK_Y, w: 410, d: BACK_D, r: 3 };
export const REDIS = { x: 770, y: BACK_Y, w: 200, d: BACK_D, r: 3 };

export const STATIONS = [
  { id: "minio", n: 1, name: "MinIO · vod-videos and vod-thumbnails", role: "prepare_video streams the raw upload down to the worker's work dir in 8 MiB chunks; generate_storyboard uploads its sprite sheets and storyboard.vtt to vod-thumbnails/<id>/storyboard/." },
  { id: "probe", n: 2, name: "prepare_video · ffprobe", role: "Moves the row from queued to preparing (and refuses any other status), clears and recreates the work dir, downloads the file and runs ffprobe -show_format -show_streams. A file ffprobe can't read fails right here, with no retry." },
  { id: "printer", n: 3, name: "generate_storyboard", role: "One ffmpeg pass: fps=1/5, scale=160:-2, tile=10x10, so every 5 seconds of video becomes one tile and every 100 tiles one sprite sheet. It measures the real tile size, then writes a WebVTT cue per tile pointing at sprite_NNN.jpg#xywh=x,y,w,h. Best-effort: any failure is logged and swallowed." },
  { id: "ladder", n: 4, name: "transcode_quality × 7 (the chord)", role: "One task per rung, 1440p down to 144p: libx264, preset medium, crf 23, -threads 2, scaled to fit the rung's box with the aspect ratio kept, then padded to the exact size (letterbox or pillarbox), video at the rung's -b:v and AAC audio at 128k. A rung taller than the source returns 'skipped' straight away." },
  { id: "ffmpeg", n: 5, name: "The ffmpeg commands", role: "What each running press executes, exactly as transcode.py builds it (paths shortened)." },
  { id: "redis", n: 6, name: "Redis · the chord counter", role: "Celery keeps a chord's progress in its result backend (Redis here). When the last of the seven tasks reports in, it calls on_transcode_complete with all seven results; that callback drops the skipped and failed ones and moves the video to 'aggregating'." },
];
