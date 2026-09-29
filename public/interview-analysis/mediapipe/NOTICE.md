# Local MediaPipe assets

- Runtime: Google MediaPipe Tasks Vision **0.10.32**, from the official `@mediapipe/tasks-vision` npm package (Apache-2.0).
- Source: https://github.com/google-ai-edge/mediapipe
- Model: Face Landmarker float16, version 1, unmodified.
- Download: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
- Model SHA256: `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`
- Model card and license: https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf (Apache License 2.0).
- License text: `LICENSE.txt` alongside this notice.

- Additional model: Pose Landmarker Lite float16, version 1, unmodified.
- Download: https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task
- SHA256: `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`
- Official documentation: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js

Prepared with `npm run prepare:interview-media`. These are public model/runtime assets, never user recordings. No CDN is used during analysis. The selected runtime is pinned following a local source audit; upgrading requires a new network/privacy review. Version 1.0.1 was not adopted because its runtime contains automatic third-party diagnostic logging.
