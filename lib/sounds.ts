// ~/naelo-app/lib/sounds.ts
// Короткі дзинь-сигнали для практик: старт, пауза, кінець

import { Audio } from "expo-av";

Audio.setAudioModeAsync({
  playsInSilentModeIOS: true,
  allowsRecordingIOS:   false,
}).catch(() => {});

type SoundName = "start" | "pause" | "complete";

const SOURCES: Record<SoundName, any> = {
  start:    require("../assets/sounds/start.wav"),
  pause:    require("../assets/sounds/pause.wav"),
  complete: require("../assets/sounds/complete.wav"),
};

const cache: Partial<Record<SoundName, Audio.Sound>> = {};

async function get(name: SoundName): Promise<Audio.Sound> {
  if (!cache[name]) {
    const { sound } = await Audio.Sound.createAsync(SOURCES[name]);
    cache[name] = sound;
  }
  return cache[name]!;
}

export async function playSound(name: SoundName): Promise<void> {
  try {
    const s = await get(name);
    await s.setPositionAsync(0);
    await s.playAsync();
  } catch {}
}

export async function unloadSounds(): Promise<void> {
  for (const k of Object.keys(cache) as SoundName[]) {
    try { await cache[k]!.unloadAsync(); } catch {}
    delete cache[k];
  }
}
