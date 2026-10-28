import { describe, expect, it } from "vitest";

import { RetainedAnswerAudio } from "./retained-answer-audio.js";

function clock(start = 1_000) {
  let current = start;
  return { now: () => current, advance: (ms: number) => { current += ms; } };
}

const entry = (text: string) => ({ wav: Buffer.from(text), question: "Tell me about yourself", durationMs: 4_000 });

describe("RetainedAnswerAudio", () => {
  it("returns a UUID token and gives the audio back to the same user", () => {
    const store = new RetainedAnswerAudio();
    const token = store.put("user-1", entry("audio"));

    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(store.take("user-1", token)).toEqual({ wav: Buffer.from("audio"), question: "Tell me about yourself", durationMs: 4_000 });
    // take does not delete: a retry that fails again can still use the entry.
    expect(store.take("user-1", token)).not.toBeNull();
  });

  it("refuses another user's token", () => {
    const store = new RetainedAnswerAudio();
    const token = store.put("user-1", entry("audio"));

    expect(store.take("user-2", token)).toBeNull();
    expect(store.take("user-1", token)).not.toBeNull();
  });

  it("expires entries after the ttl", () => {
    const time = clock();
    const store = new RetainedAnswerAudio({ ttlMs: 1_000, now: time.now });
    const token = store.put("user-1", entry("audio"));

    time.advance(999);
    expect(store.take("user-1", token)).not.toBeNull();
    time.advance(1);
    expect(store.take("user-1", token)).toBeNull();
  });

  it("zero-fills expired entries when they are swept", () => {
    const time = clock();
    const store = new RetainedAnswerAudio({ ttlMs: 1_000, now: time.now });
    const wav = Buffer.from("secret audio");
    store.put("user-1", { wav, question: null, durationMs: 1_000 });

    time.advance(1_000);
    store.put("user-1", entry("fresh"));

    expect(wav.every((byte) => byte === 0)).toBe(true);
  });

  it("drops and zero-fills the oldest entry above maxEntries", () => {
    const store = new RetainedAnswerAudio({ maxEntries: 2 });
    const oldestWav = Buffer.from("oldest");
    const oldest = store.put("user-1", { wav: oldestWav, question: null, durationMs: 1_000 });
    const middle = store.put("user-1", entry("middle"));
    const newest = store.put("user-1", entry("newest"));

    expect(store.take("user-1", oldest)).toBeNull();
    expect(oldestWav.every((byte) => byte === 0)).toBe(true);
    expect(store.take("user-1", middle)).not.toBeNull();
    expect(store.take("user-1", newest)).not.toBeNull();
  });

  it("delete zero-fills the audio and removes the entry", () => {
    const store = new RetainedAnswerAudio();
    const wav = Buffer.from("answer audio");
    const token = store.put("user-1", { wav, question: null, durationMs: 1_000 });

    store.delete(token);

    expect(wav.every((byte) => byte === 0)).toBe(true);
    expect(store.take("user-1", token)).toBeNull();
  });

  it("delete of an unknown token is a no-op", () => {
    const store = new RetainedAnswerAudio();
    expect(() => store.delete("00000000-0000-4000-8000-000000000000")).not.toThrow();
  });
});
