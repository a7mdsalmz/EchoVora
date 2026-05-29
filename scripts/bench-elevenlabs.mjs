import { performance } from "node:perf_hooks";
import { writeFile } from "node:fs/promises";

const apiKey = process.env.ELEVENLABS_API_KEY;
const voiceId = process.env.ELEVENLABS_VOICE_ID;
const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
const runs = Number(process.env.BENCH_RUNS || "10");

if (!apiKey || !voiceId) {
  process.stderr.write("Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID\n");
  process.exit(1);
}

async function tts(text) {
  const t0 = performance.now();
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true }
    })
  });
  const t1 = performance.now();
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`ElevenLabs failed ${res.status}: ${err.slice(0, 300)}`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  return { ms: t1 - t0, bytes: buf.byteLength, buf };
}

const results = [];
for (let i = 0; i < runs; i++) {
  const r = await tts(`EchoVora benchmark run ${i + 1}.`);
  results.push({ ms: r.ms, bytes: r.bytes });
  if (i === 0) await writeFile("elevenlabs-sample.mp3", Buffer.from(r.buf));
}

const ms = results.map((r) => r.ms).sort((a, b) => a - b);
const avg = ms.reduce((a, x) => a + x, 0) / ms.length;
const p95 = ms[Math.floor(ms.length * 0.95) - 1] ?? ms[ms.length - 1];

const out = { runs, avgMs: avg, p95Ms: p95, results };
await writeFile("elevenlabs-bench.json", JSON.stringify(out, null, 2));
process.stdout.write(JSON.stringify(out, null, 2) + "\n");

