// World plan of Plate 3, "The queue": a magazine of video cans in created_at order, the
// Redis lock as an escapement gate, the Celery broker as a chute of task chits, the worker's
// presses (one per --concurrency slot) and an outfeed for finished and failed videos.
export const W = 1680;
export const AZIMUTH = 62, ELEVATION = 33;
export const BENCH = { x: 0, y: 0, w: 930, d: 300, r: 12 };

export const LANE_Y = 186, CAN_R = 8, CAN_Z = 8, CAN_H = 18;
export const MAG = { x: 18, y: LANE_Y - 18, w: 268, d: 36, r: 3 };
export const MAG_SLOTS = 11, MAG_PITCH = 22, MAG_X0 = 268;
export const GATE_X = 300;
export const STAGE = { x: 334, y: LANE_Y - 22, w: 150, d: 44, r: 4 };
export const STAGE_SLOTS = [360, 392, 424, 456];
export const OUT = { x: 760, y: LANE_Y - 18, w: 150, d: 36, r: 3 };
export const OUT_SLOTS = 6, OUT_X0 = 780, OUT_PITCH = 22;
export const FAIL = { x: 760, y: 226, w: 150, d: 44, r: 3 };

export const CHIT_Y = 238, CHIT = { w: 12, d: 18, h: 2 };
export const BROKER = { x: 334, y: CHIT_Y - 14, w: 270, d: 46, r: 3 };
export const BROKER_SLOTS = 14, BROKER_HEAD = 586, BROKER_PITCH = 17.5;
export const PRESS_X = [636, 676, 716];
export const PRESS = { y: CHIT_Y - 22, d: 44 };

export const BACK_Y = 22, BACK_D = 44, BACK_H = 92;
export const FACE_Y = BACK_Y + BACK_D;
export const PG = { x: 18, y: BACK_Y, w: 268, d: BACK_D, r: 3 };
export const REDIS = { x: 320, y: BACK_Y, w: 240, d: BACK_D, r: 3 };
export const WORKER = { x: 600, y: BACK_Y, w: 300, d: BACK_D, r: 3 };

export const STATIONS = [
  { id: "postgres", n: 1, name: "PostgreSQL · the queue", role: "There is no queue table: the queue is simply the videos whose processing_status is still 'queued', oldest created_at first. The magazine holds them in that order; the screen is the SELECT start_next_video_if_idle() runs." },
  { id: "gate", n: 2, name: "The escapement · SET NX", role: "start_next_video_if_idle() tries SET video_processing:active_lock <id> NX EX 21600. NX means only if the key doesn't exist: the gate lifts for exactly one video, and every other call is a no-op while the tag hangs on the hook." },
  { id: "redis", n: 3, name: "Redis · lock, TTL and broker", role: "The hook holds the lock's value (the processing video's id); the dial is its 6-hour TTL, a dead-man's switch that only matters if nothing ever releases it. Release is a Lua script: delete only if the value is still my id." },
  { id: "broker", n: 4, name: "Celery broker list", role: "The chain's messages, oldest first. Each finished step appends the next one at the tail. With the lock, only one video's chits are ever here; before the fix, every video's chains shared this one list." },
  { id: "worker", n: 5, name: "Celery worker · presses", role: "One press per --concurrency slot (prod 1, local dev 3). A press takes the chit at the head of the list and runs it; the 7 transcodes of the chord are the only steps that can run side by side." },
  { id: "stage", n: 6, name: "Processing stage", role: "The video that holds the lock. With the lock off (history), every dispatched video sits here at once." },
  { id: "out", n: 7, name: "Outfeed", role: "Completed videos (top tray) and failed ones (bin). Either way the pipeline hands the lock back: on_pipeline_success as the chain's last step, or on_pipeline_failed as its link_error, then start_next_video_if_idle() again." },
];
