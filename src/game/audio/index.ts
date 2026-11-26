// Audio API contract (docs/VERTICAL_SLICE_PLAN.md §4.7).
// STUB: the AUDIO workstream replaces the implementation; keep these exports.

export interface MusicOptions {
  fadeMs?: number
  restart?: boolean
}

export interface AudioApi {
  unlock(): void
  playMusic(id: string, opts?: MusicOptions): void
  stopMusic(fadeMs?: number): void
  sfx(id: string): void
  setVolume(music: number, sfx: number): void
}

export const audio: AudioApi = {
  unlock() {},
  playMusic() {},
  stopMusic() {},
  sfx() {},
  setVolume() {},
}
