import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Explicit developer command only: no install hook, no user media, no credentials.
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const runtime = dirname(require.resolve("@mediapipe/tasks-vision"));
const metadata = JSON.parse(await readFile(join(runtime, "package.json"), "utf8"));
if (metadata.version !== "0.10.32") throw new Error("Runtime changed: re-audit network behavior before preparing assets.");
const target = join(root, "public/interview-analysis/mediapipe");
await mkdir(join(target, "wasm"), { recursive: true });
for (const name of ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"]) {
  await copyFile(join(runtime, "wasm", name), join(target, "wasm", name));
}
const vadTarget = join(root, "public/interview-analysis/vad");
await mkdir(vadTarget, { recursive: true });
const vadAssets = {
  "silero_vad_legacy.onnx": "a35ebf52fd3ce5f1469b2a36158dba761bc47b973ea3382b3186ca15b1f5af28",
  "ort-wasm-simd-threaded.wasm": "3398c10d07d229bd91b364548e130e0e51a8e5704b88c7c083ebbeb78842dee2",
};
await copyFile(join(root, "node_modules/@ricky0123/vad-web/dist/silero_vad_legacy.onnx"), join(vadTarget, "silero_vad_legacy.onnx"));
for (const name of ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"]) {
  await copyFile(join(root, "node_modules/onnxruntime-web/dist", name), join(vadTarget, name));
}
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
for (const [name, sha256] of Object.entries(vadAssets)) {
  if (hash(await readFile(join(vadTarget, name))) !== sha256) throw new Error(`VAD asset checksum mismatch: ${name}`);
}
const models = [
  { name: "face_landmarker.task", sha256: "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff", url: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" },
  { name: "pose_landmarker_lite.task", sha256: "59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a", url: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task" },
];
for (const { name, sha256, url } of models) {
const modelPath = join(target, name);
let model;
try { model = await readFile(modelPath); } catch (error) { if (error.code !== "ENOENT") throw error; }
if (!model) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000), redirect: "error" });
  if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
  model = Buffer.from(await response.arrayBuffer());
  if (hash(model) !== sha256) throw new Error("Model checksum mismatch; file was not written.");
  await writeFile(modelPath, model, { flag: "wx" });
}
if (hash(model) !== sha256) throw new Error("Existing model checksum mismatch; it was not overwritten. Review the file before replacing it.");
}
console.log("Local media assets ready: MediaPipe 0.10.32 Face/Pose and Silero VAD/ORT; SHA256 verified.");
