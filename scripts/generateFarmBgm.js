const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const bpm = 92;
const beatsPerBar = 4;
const bars = 8;
const seconds = (60 / bpm) * beatsPerBar * bars;
const totalSamples = Math.floor(sampleRate * seconds);

const outDir = path.join(__dirname, '..', 'assets', 'audio');
const outPath = path.join(outDir, 'farm-bgm.wav');

const notes = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
};

const chords = [
  ['C4', 'E4', 'G4'],
  ['A4', 'C5', 'E5'],
  ['F4', 'A4', 'C5'],
  ['G4', 'B4', 'D5'],
  ['C4', 'E4', 'G4'],
  ['F4', 'A4', 'C5'],
  ['D4', 'F4', 'A4'],
  ['G4', 'B4', 'D5'],
];

const melody = [
  ['E5', 0], ['G5', 0.5], ['E5', 1], ['D5', 1.5],
  ['C5', 2], ['D5', 2.5], ['E5', 3],
  ['A4', 4], ['C5', 4.5], ['E5', 5], ['C5', 5.5],
  ['A4', 6], ['C5', 6.5], ['D5', 7],
  ['F4', 8], ['A4', 8.5], ['C5', 9], ['A4', 9.5],
  ['G4', 10], ['A4', 10.5], ['C5', 11],
  ['G4', 12], ['B4', 12.5], ['D5', 13], ['B4', 13.5],
  ['G4', 14], ['D5', 14.5], ['C5', 15],
  ['E5', 16], ['G5', 16.5], ['E5', 17], ['C5', 17.5],
  ['D5', 18], ['E5', 18.5], ['G5', 19],
  ['F5', 20], ['E5', 20.5], ['C5', 21], ['A4', 21.5],
  ['C5', 22], ['D5', 22.5], ['E5', 23],
  ['D5', 24], ['F5', 24.5], ['D5', 25], ['A4', 25.5],
  ['C5', 26], ['D5', 26.5], ['F5', 27],
  ['G4', 28], ['B4', 28.5], ['D5', 29], ['B4', 29.5],
  ['G4', 30], ['D5', 30.5], ['E5', 31],
].map(([name, beat]) => [name, Number(beat)]);

notes.F5 = 698.46;
notes.G5 = 783.99;

function envelope(t, duration, attack = 0.02, release = 0.28) {
  if (t < 0 || t > duration) return 0;
  const a = Math.min(1, t / attack);
  const r = Math.min(1, (duration - t) / release);
  return Math.max(0, Math.min(a, r));
}

function softTone(freq, t) {
  const base = Math.sin(2 * Math.PI * freq * t);
  const shine = 0.35 * Math.sin(2 * Math.PI * freq * 2 * t);
  const warmth = 0.2 * Math.sin(2 * Math.PI * freq * 0.5 * t);
  return (base + shine + warmth) / 1.55;
}

function pluck(freq, t) {
  return Math.sin(2 * Math.PI * freq * t) * Math.exp(-4.2 * t);
}

function writeString(buffer, offset, value) {
  for (let i = 0; i < value.length; i++) buffer.writeUInt8(value.charCodeAt(i), offset + i);
}

const beatSeconds = 60 / bpm;
const samples = new Float32Array(totalSamples);

for (let i = 0; i < totalSamples; i++) {
  const time = i / sampleRate;
  const beat = time / beatSeconds;
  const barIndex = Math.floor(beat / beatsPerBar) % chords.length;
  const barBeat = beat % beatsPerBar;
  let value = 0;

  for (const note of chords[barIndex]) {
    const freq = notes[note];
    const chordEnv = envelope(barBeat * beatSeconds, beatsPerBar * beatSeconds, 0.08, 0.85);
    value += softTone(freq, time) * chordEnv * 0.09;
  }

  const pluckBeat = Math.floor(beat * 2) / 2;
  const pluckTime = (beat - pluckBeat) * beatSeconds;
  const pluckNote = chords[barIndex][Math.floor(pluckBeat * 2) % chords[barIndex].length];
  value += pluck(notes[pluckNote] * 2, pluckTime) * 0.11;

  for (const [name, startBeat] of melody) {
    const start = startBeat * beatSeconds;
    const t = time - start;
    const duration = beatSeconds * 0.72;
    if (t >= 0 && t <= duration) {
      value += softTone(notes[name], t) * envelope(t, duration, 0.015, 0.18) * 0.16;
    }
  }

  const fadeLength = sampleRate * 0.35;
  const fadeIn = Math.min(1, i / fadeLength);
  const fadeOut = Math.min(1, (totalSamples - i) / fadeLength);
  samples[i] = Math.max(-0.92, Math.min(0.92, value * fadeIn * fadeOut));
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
  buffer.writeInt16LE(Math.round(samples[i] * 32767), 44 + i * 2);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, buffer);
console.log(outPath);
