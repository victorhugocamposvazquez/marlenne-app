/** 24 kHz (Edge) → WAV 44,1 kHz. Safari decodifica el WAV; el MP3 MPEG-2 a veces no. */

function resample(mono: Float32Array, from: number, to: number) {
  if (from === to) return mono;
  const outLen = Math.max(1, Math.round(mono.length * (to / from)));
  const out = new Float32Array(outLen);
  const ratio = from / to;
  for (let i = 0; i < outLen; i++) {
    const x = i * ratio;
    const i0 = Math.floor(x);
    const frac = x - i0;
    const a = mono[i0] ?? 0;
    const b = mono[Math.min(i0 + 1, mono.length - 1)] ?? 0;
    out[i] = a + (b - a) * frac;
  }
  return out;
}

function encodeWav(mono: Float32Array, sampleRate: number) {
  const samples = mono.length;
  const buf = Buffer.alloc(44 + samples * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) {
    const s = Math.max(-1, Math.min(1, mono[i] ?? 0));
    buf.writeInt16LE(s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff), 44 + i * 2);
  }
  return buf;
}

export async function mp3ToSafariWav(mp3: Buffer): Promise<Buffer | null> {
  try {
    const { MPEGDecoder } = await import('mpg123-decoder');
    const decoder = new MPEGDecoder();
    await decoder.ready;
    const decoded = decoder.decode(new Uint8Array(mp3));
    decoder.free();
    const ch = decoded.channelData?.[0];
    if (!ch?.length) return null;
    const rate = decoded.sampleRate || 24000;
    const mono = resample(ch, rate, 44100);
    return encodeWav(mono, 44100);
  } catch {
    return null;
  }
}
