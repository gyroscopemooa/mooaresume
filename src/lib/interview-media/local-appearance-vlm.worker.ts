/// <reference lib="webworker" />

import { AutoModelForVision2Seq, AutoProcessor, load_image, TextStreamer } from "@huggingface/transformers";

const MODEL_ID = "HuggingFaceTB/SmolVLM-256M-Instruct";
let processorPromise: ReturnType<typeof AutoProcessor.from_pretrained> | null = null;
let modelPromise: ReturnType<typeof AutoModelForVision2Seq.from_pretrained> | null = null;

function load(progress_callback: (progress: unknown) => void) {
  processorPromise ??= AutoProcessor.from_pretrained(MODEL_ID, { progress_callback });
  modelPromise ??= AutoModelForVision2Seq.from_pretrained(MODEL_ID, {
    device: "webgpu",
    dtype: "q4",
    progress_callback,
  });
  return Promise.all([processorPromise, modelPromise]);
}

self.addEventListener("message", async (event: MessageEvent<{ id: string; image: string }>) => {
  const { id, image } = event.data;
  try {
    const progress = (value: unknown) => self.postMessage({ id, type: "progress", value });
    const [processor, model] = await load(progress);
    const messages = [{
      role: "user",
      content: [
        { type: "image", image },
        { type: "text", text: "In one short literal sentence, describe only what is clearly visible about: hair covering the eyes, face occlusion, shirt collar, and whether image quality permits those observations. If an item is not clearly visible, say it is unclear. Do not infer attractiveness, personality, emotion, gender, ethnicity, age, health, or hiring outcome." },
      ],
    }];
    const prompt = processor.apply_chat_template(messages, { add_generation_prompt: true });
    const inputs = await processor(prompt, [await load_image(image)], { do_image_splitting: false });
    let generatedText = "";
    const streamer = new TextStreamer(processor.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (chunk) => { generatedText += chunk; },
    });
    await model.generate({ ...inputs, do_sample: false, max_new_tokens: 80, repetition_penalty: 1.05, min_new_tokens: 8, streamer });
    self.postMessage({ id, type: "complete", output: generatedText.trim() });
  } catch (error) {
    self.postMessage({ id, type: "error", error: error instanceof Error ? error.message : String(error) });
  }
});
