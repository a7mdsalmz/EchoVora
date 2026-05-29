export async function elevenLabsTts(args: {
  apiKey?: string;
  voiceId: string;
  text: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
}): Promise<Uint8Array | null> {
  if (!args.apiKey) return null;

  const maxAttempts = 4;
  let lastStatus = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 20_000);
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(args.voiceId)}`, {
        method: "POST",
        signal: ac.signal,
        headers: {
          "xi-api-key": args.apiKey,
          "content-type": "application/json",
          accept: "audio/mpeg"
        },
        body: JSON.stringify({
          text: args.text,
          model_id: args.modelId ?? "eleven_multilingual_v2",
          voice_settings: {
            stability: args.stability ?? 0.4,
            similarity_boost: args.similarityBoost ?? 0.8,
            style: args.style ?? 0.2,
            use_speaker_boost: true
          }
        })
      });

      if (res.ok) {
        const ab = await res.arrayBuffer();
        return new Uint8Array(ab);
      }

      lastStatus = res.status;
      const retryAfter = Number(res.headers.get("retry-after") ?? "");
      const shouldRetry = res.status === 429 || res.status >= 500;
      if (!shouldRetry || attempt === maxAttempts) return null;
      const base = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 400 * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, Math.min(8000, base)));
    } catch {
      if (attempt === maxAttempts) return null;
      await new Promise((r) => setTimeout(r, Math.min(8000, 400 * 2 ** (attempt - 1))));
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastStatus) return null;
  return null;
}

