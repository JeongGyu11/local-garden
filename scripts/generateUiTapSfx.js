const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const seconds = 0.13;
const totalSamples = Math.floor(sampleRate * seconds);
const outDir = path.join(__dirname, '..', 'assets', 'audio');
const outPath = path.join(outDir, 'ui-tap.wav');

function writeString(buffer, offset, value) {
  for (let i = 0; i < value.length; i++) buffer.writeUInt8(value.charCodeAt(i), offset + i);
}

function envelope(t) {
  const attack = 0.006;
  const releaseStart = 0.025;
  if (t < attack) return t / attack;
  if (t < releaseStart) return 1;
  return Math.max(0, 1 - (t - releaseStart) / (seconds - releaseStart));
}

const dataSize = totalSamples * 2;
const buffer = Buffer.alloc(44 + dataSize);

writeString(buffer, 0, 'RIFF');
buffer.writeUInt32LE(36 + dataSize, 4);
writeString(buffer, 8, 'WAVE');
writeString(buffer, 12, 'fmt ');
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
writeString(buffer, 36, 'data');
buffer.writeUInt32LE(dataSize, 40);

for (let i = 0; i < totalSamples; i++) {
  const t = i / sampleRate;
  const pitchSlide = 760 + 260 * Math.exp(-26 * t);
  const sparkle = Math.sin(2 * Math.PI * pitchSlide * t);
  const wood = Math.sin(2 * Math.PI * 240 * t) * Math.exp(-24 * t);
  const value = (sparkle * 0.45 + wood * 0.35) * envelope(t) * 0.55;
  buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), 44 + i * 2);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, buffer);
console.log(outPath);
