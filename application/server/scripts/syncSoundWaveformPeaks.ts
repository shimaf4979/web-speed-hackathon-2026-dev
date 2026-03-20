import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { calculateSoundWaveformPeaks } from "@web-speed-hackathon-2026/server/src/utils/calculate_sound_waveform_peaks";
import type { SoundSeed } from "@web-speed-hackathon-2026/server/src/types/seed";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "..");
const seedsPath = path.resolve(serverRoot, "seeds/sounds.jsonl");
const publicSoundsDir = path.resolve(serverRoot, "../public/sounds");

const source = await fs.readFile(seedsPath, "utf8");
const sounds = source
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line !== "")
  .map((line) => JSON.parse(line) as SoundSeed);

const nextSounds: SoundSeed[] = [];
for (const sound of sounds) {
  const soundPath = path.resolve(publicSoundsDir, `${sound.id}.mp3`);
  const soundBuffer = await fs.readFile(soundPath);
  const waveformPeaks = await calculateSoundWaveformPeaks(soundBuffer);
  nextSounds.push({
    ...sound,
    waveformPeaks,
  });
}

await fs.writeFile(
  seedsPath,
  `${nextSounds.map((sound) => JSON.stringify(sound)).join("\n")}\n`,
  "utf8",
);
