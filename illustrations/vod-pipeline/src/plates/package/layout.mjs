// World plan of Plate 5, "Package & play": a segment rack with one lane per rendition, the
// master-playlist printer, MinIO's vod-processed cubbies, Caddy's /storage gate and the player.
export const W = 1680;
export const AZIMUTH = 62, ELEVATION = 32;
export const BENCH = { x: 0, y: 0, w: 1000, d: 300, r: 12 };

export const RACK = { x: 20, y: 150, w: 350, d: 124, r: 4 };
export const RACK_H = 8;
export const LANE_Y = Array.from({ length: 7 }, (_, i) => 166 + i * 15);
export const SRC_X = 40, SLOT_X0 = 74, SLOT_PITCH = 14.4;
export const SAW_X = 60;
export const PRINTER = { x: 392, y: 160, w: 150, d: 104, r: 4 };
export const PRINTER_H = 20;
export const CARD = { x: 402, y: 172, w: 124, d: 82 };
export const GATEHOUSE = { x: 566, y: 166, w: 54, d: 90, r: 3 };
export const GATE_H = 46;
export const DESK = { x: 644, y: 150, w: 336, d: 124, r: 4 };
export const DESK_H = 8;
export const SCREEN = { x: 660, y: 156, w: 230, d: 9, r: 1.5 };
export const SCREEN_Z = 16, SCREEN_H = 112;

export const BACK_Y = 20, BACK_D = 46, BACK_H = 92;
export const FACE_Y = BACK_Y + BACK_D;
export const MINIO = { x: 20, y: BACK_Y, w: 350, d: BACK_D, r: 3 };
export const PG = { x: 392, y: BACK_Y, w: 150, d: BACK_D, r: 3 };

export const STATIONS = [
  { id: "rack", n: 1, name: "segment_videos · the rack", role: "One lane per rendition. ffmpeg -c copy -f hls -hls_time 6 cuts each .mp4 into ~6-second .ts segments plus a playlist.m3u8, without re-encoding, one rendition after another. With -c copy it can only cut at keyframes, so 6 s is a target." },
  { id: "printer", n: 2, name: "create_manifest · master.m3u8", role: "Writes the master playlist line by line: #EXTM3U, #EXT-X-VERSION:3, then one #EXT-X-STREAM-INF (BANDWIDTH = the rung's target video bitrate, RESOLUTION) and its relative playlist path per rendition, highest first. Skipped rungs simply aren't listed." },
  { id: "minio", n: 3, name: "MinIO · vod-processed", role: "upload_to_minio writes master.m3u8 first, then each rendition's playlist and segments under <id>/segments/<quality>/. Only object names are stored in PostgreSQL, so the endpoint can change without a migration." },
  { id: "postgres", n: 4, name: "PostgreSQL · finalize", role: "finalize_processing sets status completed, manifest_url and available_qualities, clears celery_task_id and deletes the work dir. The player only ever needs manifest_url." },
  { id: "caddy", n: 5, name: "Caddy · /storage", role: "handle_path /storage/* strips the prefix and proxies to MinIO, so the browser fetches playlists and segments from the same origin as the app." },
  { id: "player", n: 6, name: "The player · hls.js", role: "@videojs/react's HlsJsVideo: hls.js keeps an EWMA estimate of throughput (starting from a 1 Mbps guess), picks the best rendition it can carry, caps it to the player's size in device pixels, keeps up to 60 s buffered and can abandon a fragment that would arrive too late. Scrubbing previews come from storyboard.vtt." },
];
