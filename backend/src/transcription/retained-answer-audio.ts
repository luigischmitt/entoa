import { randomUUID } from "node:crypto";

export type RetainedAnswerAudioEntry = { wav: Buffer; question: string | null; durationMs: number };

type StoredEntry = RetainedAnswerAudioEntry & { userId: string; expiresAt: number };

export type RetainedAnswerAudioOptions = { ttlMs?: number; maxEntries?: number; now?: () => number };

/**
 * Failed answers' audio, kept in memory for a short retry window (single Cloud Run instance with session affinity).
 * Entries are zero-filled when they are deleted, expire, or are evicted. Nothing here is logged.
 */
export class RetainedAnswerAudio {
  private readonly entries = new Map<string, StoredEntry>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor(options: RetainedAnswerAudioOptions = {}) {
    this.ttlMs = options.ttlMs ?? 180_000;
    this.maxEntries = options.maxEntries ?? 50;
    this.now = options.now ?? Date.now;
  }

  put(userId: string, entry: RetainedAnswerAudioEntry): string {
    this.sweep();
    const token = randomUUID();
    this.entries.set(token, { wav: entry.wav, question: entry.question, durationMs: entry.durationMs, userId, expiresAt: this.now() + this.ttlMs });
    // Map iteration follows insertion order, so the first key is the oldest entry.
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.delete(oldest);
    }
    return token;
  }

  /** Returns the entry only for the same user and before expiry. Does not delete it: a failed retry keeps the audio. */
  take(userId: string, token: string): RetainedAnswerAudioEntry | null {
    this.sweep();
    const entry = this.entries.get(token);
    if (!entry || entry.userId !== userId) return null;
    return { wav: entry.wav, question: entry.question, durationMs: entry.durationMs };
  }

  delete(token: string): void {
    const entry = this.entries.get(token);
    if (!entry) return;
    entry.wav.fill(0);
    this.entries.delete(token);
  }

  private sweep(): void {
    const now = this.now();
    for (const [token, entry] of this.entries) {
      if (entry.expiresAt <= now) this.delete(token);
    }
  }
}

/** Shared instance: the websocket retains failed answers here and the HTTP retry route reads from the same store. */
export const defaultRetainedAnswerAudio = new RetainedAnswerAudio();
