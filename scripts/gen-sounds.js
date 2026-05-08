// ~/luma/scripts/gen-sounds.js
// Генерує WAV-файли звукових сигналів для практик

const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "assets", "sounds");

function writeWAV(filename, samples, sampleRate = 22050) {
  const numSamples = samples.length;
  const dataBytes  = numSamples * 2;          // 16-bit = 2 байти на семпл
  const buf        = Buffer.alloc(44 + dataBytes);

  // RIFF header
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);           // chunk size
  buf.writeUInt16LE(1,  20);           // PCM
  buf.writeUInt16LE(1,  22);           // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byteRate
  buf.writeUInt16LE(2,  32);           // blockAlign
  buf.writeUInt16LE(16, 34);           // bitsPerSample
  buf.write("data", 36);
  buf.writeUInt32LE(dataBytes, 40);

  // PCM data
  for (let i = 0; i < numSamples; i++) {
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  }

  fs.writeFileSync(path.join(OUT, filename), buf);
  console.log(`  ${filename}  (${(buf.length / 1024).toFixed(1)} KB)`);
}

function sine(freq, t) { return Math.sin(2 * Math.PI * freq * t); }

// Огинаюча: плавний вхід + вихід
function env(t, total, attack = 0.02, release = 0.08) {
  if (t < attack)          return t / attack;
  if (t > total - release) return (total - t) / release;
  return 1;
}

const SR = 22050;

// ── 1. Старт — короткий дзинь вгору (660 → 880 Hz) ──────────────────
{
  const dur = 0.18;
  const n   = Math.floor(SR * dur);
  const samples = Array.from({ length: n }, (_, i) => {
    const t = i / SR;
    const e = env(t, dur, 0.005, 0.12);
    const f = 660 + (880 - 660) * (t / dur);   // плавний підйом частоти
    return e * 0.45 * sine(f, t);
  });
  writeWAV("start.wav", samples);
}

// ── 2. Пауза — короткий приглушений дзинь вниз (660 → 440 Hz) ───────
{
  const dur = 0.16;
  const n   = Math.floor(SR * dur);
  const samples = Array.from({ length: n }, (_, i) => {
    const t = i / SR;
    const e = env(t, dur, 0.005, 0.12);
    const f = 660 - (660 - 440) * (t / dur);   // плавне зниження
    return e * 0.32 * sine(f, t);
  });
  writeWAV("pause.wav", samples);
}

// ── 3. Завершення — два дзинь: нижній + верхній (523 + 784 Hz) ───────
{
  const dur = 0.5;
  const n   = Math.floor(SR * dur);
  const samples = Array.from({ length: n }, (_, i) => {
    const t  = i / SR;
    // Перший дзинь: 0..0.2s @ 523 Hz
    const e1 = t < 0.2  ? env(t,       0.2,  0.005, 0.1) : 0;
    // Другий дзинь: 0.2..0.5s @ 784 Hz
    const e2 = t >= 0.2 ? env(t - 0.2, 0.3,  0.005, 0.15) : 0;
    return e1 * 0.4 * sine(523, t) + e2 * 0.4 * sine(784, t - 0.2);
  });
  writeWAV("complete.wav", samples);
}

console.log("Done.");
