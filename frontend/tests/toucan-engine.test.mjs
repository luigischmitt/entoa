import assert from "node:assert/strict";
import test from "node:test";

import {
  analyseSamples, BEAK_POSES, beakTargetAt, BeakPoser, clamp, createClockInterpolator, createToucanEngine, genericBeakTarget, HeadPoser, JAW, JawModel,
  mouthWedgePath, NodScheduler, PhraseListener, sat, Spring, toucanStateFor, valueNoise,
} from "../src/components/interview/toucan/toucan-engine.mjs";

const SR = 22_050;
const seeded = (seed = 1) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

/** 0.5 s silence, 0.4 s vowel-like 200 Hz tone, 0.3 s silence, 0.3 s hiss (white noise), 0.3 s silence. */
function syntheticSpeech() {
  const rng = seeded(7);
  const out = new Float32Array(Math.round(SR * 1.8));
  for (let i = 0; i < out.length; i += 1) {
    const t = i / SR;
    if (t >= 0.5 && t < 0.9) out[i] = 0.5 * Math.sin(2 * Math.PI * 200 * t);
    else if (t >= 1.2 && t < 1.5) out[i] = (rng() * 2 - 1) * 0.5;
  }
  return out;
}

test("envelope: voiced segments open the beak, silence closes it, hiss is damped by the zero-crossing proxy", () => {
  const f = analyseSamples(syntheticSpeech(), SR, seeded(3));
  const at = (sec) => Math.floor(sec / f.hopT);
  assert.ok(f.env[at(0.2)] < 0.05, "silence");
  assert.ok(f.env[at(0.7)] > 0.8, "vowel");
  assert.ok(f.cons[at(0.7)] < 0.05, "a 200 Hz tone has no hiss");
  assert.ok(f.cons[at(1.35)] > 0.9, "white noise is a fricative");
  const vowel = beakTargetAt(f, 0.7, 0).target;
  const hiss = beakTargetAt(f, 1.35, 0).target;
  assert.ok(vowel > 0.7 && vowel <= 1.05);
  assert.ok(hiss < vowel * 0.5, `consonants open less (${hiss} vs ${vowel})`);
  assert.ok(beakTargetAt(f, 0.2, 0).target < 0.05);
  // positions outside the buffer are clamped, never NaN
  assert.ok(Number.isFinite(beakTargetAt(f, 99, 0).target) && Number.isFinite(beakTargetAt(f, -1, 0).target));
});

test("syllables, stress onsets and pauses are found; per-syllable gain stays in 0.78..1.14", () => {
  const f = analyseSamples(syntheticSpeech(), SR, seeded(3));
  assert.equal(f.events.length, 2);
  assert.ok(Math.abs(f.events[0].t - 0.5) < 0.05);
  assert.ok(f.pauses.some((p) => p.t0 > 0.85 && p.t1 < 1.3), "the gap between the syllables is a pause");
  for (const g of f.gain) assert.ok(g >= 0.78 - 1e-6 && g <= 1.14 + 1e-6);
  assert.ok(Math.abs(f.dur - 1.8) < 1e-6);
  // chatter is tiny and only on sustained vowels
  const loud = beakTargetAt(f, 0.7, 0.03);
  assert.ok(Math.abs(loud.chatter) <= JAW.chatter);
  assert.equal(beakTargetAt(f, 0.2, 0.03).chatter, 0);
});

test("jaw spring stays within 0..1.15 for any input, opens fast, releases slower and closes completely", () => {
  const jaw = new JawModel();
  let peak = 0;
  for (let i = 0; i < 60; i += 1) { peak = Math.max(peak, jaw.step(1 / 60, 1.05, 0.025)); assert.ok(jaw.mouth >= 0 && jaw.mouth <= 1.15); }
  assert.ok(peak > 0.9);
  let frames = 0;
  while (jaw.mouth > 0 && frames < 600) { jaw.step(1 / 60, 0); assert.ok(jaw.mouth >= 0 && jaw.mouth <= 1.15); frames += 1; }
  assert.equal(jaw.mouth, 0, "closed completely");
  assert.ok(frames > 5 && frames < 60, `release takes a few frames (${frames})`);
  // a huge frame (tab restored) cannot blow the spring up
  const wild = new JawModel();
  for (const dt of [0.05, 0.05, 0.05]) assert.ok(wild.step(dt, 1.05) <= 1.15);
  const early = new JawModel();
  early.step(1 / 60, 1);
  assert.ok(early.mouth < 0.5, "attack takes ~35 ms, it is not instant");
});

test("beak poser: only named poses, holds of 55 ms (30 ms to close), and silence reaches closed within 0.1 s", () => {
  const rng = seeded(31);
  const p = new BeakPoser();
  const named = new Set(Object.values(BEAK_POSES));
  let run = { pose: 0, t0: -9 };
  for (let i = 0; i < 60 * 30; i += 1) {
    const t = i / 60;
    const pose = p.pick(t, rng() * 1.05, rng());
    assert.ok(named.has(pose), `pose ${pose}`);
    if (pose !== run.pose) {
      const hold = t - run.t0;
      assert.ok(hold >= (pose === BEAK_POSES.closed ? 0.03 : 0.055) - 1e-9, `hold ${hold.toFixed(3)} s before ${pose}`);
      run = { pose, t0: t };
    }
  }
  const t0 = 30;
  for (let i = 0; i < 6; i += 1) p.pick(t0 + i / 60, 0.8, 0);
  assert.equal(p.pose, BEAK_POSES.open);
  let closedAt = null;
  for (let i = 6; i < 30 && closedAt === null; i += 1) if (p.pick(t0 + i / 60, 0, 0) === BEAK_POSES.closed) closedAt = (i - 6) / 60;
  assert.ok(closedAt !== null && closedAt <= 0.1 + 1e-9, `closed after ${closedAt} s of silence`);
});

test("spring: critically damped does not overshoot; retargeting keeps velocity", () => {
  const s = new Spring(0, 6.5); s.t = 1;
  let max = 0;
  for (let i = 0; i < 240; i += 1) { s.step(1 / 60); max = Math.max(max, s.x); }
  assert.ok(max <= 1.0001 && s.x > 0.99);
  const r = new Spring(0, 10); r.t = 1;
  for (let i = 0; i < 6; i += 1) r.step(1 / 60);
  const v = r.v; r.t = 0.2;
  assert.equal(r.v, v);
});

test("limiter: output is bounded by the limit, monotonic and ~linear near zero", () => {
  for (const L of [1.2, 2.5, 3.7, 10]) {
    for (const x of [-1e6, -50, -3, -0.5, 0, 0.5, 3, 50, 1e6]) assert.ok(Math.abs(sat(x, L)) <= L);
    assert.ok(Math.abs(sat(0.01, L) - 0.01) < 1e-4);
    assert.ok(sat(1, L) < sat(2, L));
  }
  assert.equal(sat(123, 1e9), 123);
  assert.ok(Math.abs(valueNoise(3.7, 1)) <= 1);
});

test("nod scheduler: down 260 ms then up 360 ms for a single nod; double nod is two smaller nods 600 ms apart", () => {
  const n = new NodScheduler();
  n.add(10, "single");
  assert.equal(n.rotation(9.9), 0);
  assert.ok(Math.abs(n.rotation(10.26) - 7) < 1e-6, "peak after 260 ms");
  assert.ok(n.rotation(10.13) > 0 && n.rotation(10.13) < 7);
  assert.ok(Math.abs(n.rotation(10.62)) < 0.3, "back up after 260 + 360 ms");
  assert.ok(n.rotation(10.4) > 0.5 && n.rotation(10.4) < 7, "returning");
  assert.equal(n.count, 1);
  const d = new NodScheduler();
  d.add(0, "double");
  assert.ok(Math.abs(d.rotation(0.22) - 6) < 1e-6);
  assert.ok(d.rotation(0.55) < 0.1, "head is back between the two nods");
  assert.ok(Math.abs(d.rotation(0.6 + 0.2) - 4) < 1e-6);
  let max = 0;
  for (let t = 0; t < 2; t += 0.01) max = Math.max(max, Math.abs(d.rotation(t)));
  assert.ok(max <= 6 + 1e-6, "a nod never exceeds a few degrees");
  assert.equal(d.rotation(5), 0);
});

test("head poser: holds one pose between changes, anticipates each change, zeros when reduced, stays in each state's range", () => {
  const RANGE = { idle: { r: [-5, 5], x: [-3, 3], y: [-1.5, 1.5] }, listening: { r: [-3, 4], x: [0, 2.5], y: [-1, 1] }, speaking: { r: [-3.5, 3.5], x: [-2, 2], y: [-1.2, 1.2] }, thinking: { r: [-2, 2], x: [-1, 1], y: [-1, 0] } };
  for (const state of Object.keys(RANGE)) {
    const p = new HeadPoser(seeded(4));
    const runs = [];
    let last = null;
    for (let i = 0; i < 60 * 40; i += 1) {
      const q = p.update(i / 60, state, false);
      const key = `${q.r} ${q.x} ${q.y}`;
      if (last && last.key === key) last.frames += 1;
      else { last = { key, frames: 1, pose: q }; runs.push(last); }
    }
    // Runs longer than the 0.07 s anticipation are holds: constant between changes, inside the state's range.
    const holds = runs.filter((r) => r.frames > 5);
    assert.ok(holds.length > 5, `${state}: changes happen (${holds.length})`);
    for (const h of holds) {
      const secs = h.frames / 60;
      // The anticipation (about 0.07 s) is part of the hold, so a speaking hold of 0.8 s leaves about 0.73 s of rest pose.
      assert.ok(secs >= (state === "speaking" ? 0.72 : 0.8), `${state}: holds ${secs.toFixed(2)} s`);
      for (const k of ["r", "x", "y"]) assert.ok(h.pose[k] >= RANGE[state][k][0] - 1e-9 && h.pose[k] <= RANGE[state][k][1] + 1e-9, `${state} ${k} ${h.pose[k]}`);
    }
  }
  const still = new HeadPoser(seeded(9));
  for (let i = 0; i < 600; i += 1) assert.deepEqual(still.update(i / 60, "idle", true), { r: 0, x: 0, y: 0 });
});

test("phrase listener nods only after a phrase of 1.6 s or more ends, 350 ms after the voice drops, and only while listening", () => {
  const run = (talk, rolls) => {
    const l = new PhraseListener(() => rolls.shift() ?? 0.99);
    let reaction = null;
    for (let t = 0; t < talk + 1; t += 0.05) {
      const r = l.update(t, t < talk ? 0.6 : 0, true);
      if (r) { assert.equal(reaction, null); reaction = { ...r, t }; }
    }
    return reaction;
  };
  const single = run(2, [0.1, 0.1]);
  assert.equal(single.kind, "single");
  assert.ok(single.t >= 2.35 && single.t <= 2.45, `fires 350 ms after the phrase (${single.t})`);
  assert.ok(Math.abs(single.at - (single.t + 0.1)) < 1e-9, "lands just after");
  assert.equal(run(2, [0.1, 0.6]).kind, "double");
  const tilt = run(2, [0.1, 0.95, 0.2]);
  assert.equal(tilt.kind, "tilt");
  assert.equal(Math.abs(tilt.a), 3.6);
  assert.equal(run(1.2, [0.1, 0.1]), null, "a short utterance is not nodded at");
  assert.equal(run(2, [0.95, 0.1]), null, "10% of the time it stays still");
  const quiet = new PhraseListener(() => 0.1);
  for (let t = 0; t < 4; t += 0.05) assert.equal(quiet.update(t, t < 2 ? 0.6 : 0, false), null);
});

test("state mapping: speaking, listening, thinking (also for clarification decisions), idle", () => {
  assert.equal(toucanStateFor({ phase: "introducing" }), "speaking");
  assert.equal(toucanStateFor({ phase: "speaking" }), "speaking");
  assert.equal(toucanStateFor({ phase: "closing" }), "speaking");
  assert.equal(toucanStateFor({ phase: "speaking", audioPlaying: false }), "idle");
  assert.equal(toucanStateFor({ phase: "answering" }), "listening");
  assert.equal(toucanStateFor({ phase: "advancing" }), "thinking");
  assert.equal(toucanStateFor({ phase: "ending" }), "idle");
  assert.equal(toucanStateFor({ phase: "whatever" }), "idle");
});

test("clock interpolation smooths coarse media clocks and resyncs on every new reading", () => {
  const c = createClockInterpolator(0.1);
  assert.equal(c(1.0, 10), 1.0);
  assert.ok(Math.abs(c(1.0, 10.05) - 1.05) < 1e-9);
  assert.ok(Math.abs(c(1.0, 11) - 1.1) < 1e-9, "never runs more than 100 ms ahead of a stalled clock");
  assert.equal(c(1.2, 11.1), 1.2);
  assert.equal(c(Number.NaN, 12), 0);
});

test("mouth wedge is empty when closed and a valid path when open; generic fallback stays gentle", () => {
  assert.equal(mouthWedgePath(0), "");
  assert.match(mouthWedgePath(0.5), /^M[\d. -]+C.*Z$/);
  for (let t = 0; t < 30; t += 0.05) { const g = genericBeakTarget(t); assert.ok(g >= 0 && g <= 0.7); }
  assert.equal(clamp(5, 0, 1), 1);
});

// A DOM-free fake of the SVG: every element records the attributes written to it.
function fakeRoot() {
  const nodes = new Map();
  return {
    nodes,
    querySelector(selector) {
      const name = /data-tc="(\w+)"/.exec(selector)?.[1];
      if (!nodes.has(name)) nodes.set(name, { attrs: {}, writes: 0, setAttribute(k, v) { this.attrs[k] = v; this.writes += 1; } });
      return nodes.get(name);
    },
  };
}

test("engine: frames only write SVG attributes, stay finite, and reduced motion keeps the head still", () => {
  for (const reduced of [false, true]) {
    const root = fakeRoot();
    const engine = createToucanEngine({ root, rng: seeded(11), reducedMotion: () => reduced });
    engine.setState("speaking", 0);
    let maxRot = 0;
    for (let i = 0; i < 600; i += 1) {
      engine.frame(i / 60);
      const rot = Number(/rotate\((-?[\d.]+)/.exec(root.nodes.get("head").attrs.transform)[1]);
      assert.ok(Number.isFinite(rot));
      maxRot = Math.max(maxRot, Math.abs(rot));
    }
    for (const name of ["head", "body", "tail", "skin", "bib", "beak", "upper", "lower", "pup", "lid"]) assert.ok(root.nodes.get(name).writes > 0, name);
    if (reduced) assert.ok(maxRot < 1e-6, `reduced motion: head rotation ${maxRot}`);
    else assert.ok(maxRot > 0.05 && maxRot <= 10, `head rotation ${maxRot}`);
    assert.equal(root.nodes.get("lid").attrs.transform.includes("NaN"), false);
  }
});

test("engine: real audio drives the beak (position + lookahead), nods follow the candidate level, playing audio forces speaking", () => {
  const f = analyseSamples(syntheticSpeech(), SR, seeded(3));
  const root = fakeRoot();
  const engine = createToucanEngine({ root, rng: seeded(5) });
  let playing = true; let pos = 0;
  engine.setFeed({ sample: () => (playing ? { id: 1, features: f, failed: false, pos, endsWithQuestion: false } : null) });
  engine.setState("idle", 0);
  const openAt = (p, t0) => { pos = p; for (let i = 0; i < 20; i += 1) engine.frame(t0 + i / 60); return root.nodes.get("lower").attrs.transform; };
  assert.equal(engine.state, "idle");
  const closed = openAt(0.2, 0);
  assert.equal(engine.state, "speaking", "audio playing -> speaking pose even if the room says idle");
  assert.match(closed, /rotate\(0\.0/);
  const opened = openAt(0.7, 1);
  assert.ok(Number(/rotate\(([\d.]+)/.exec(opened)[1]) > 6, `beak open on the vowel: ${opened}`);
  playing = false;
  for (let i = 0; i < 60; i += 1) engine.frame(2 + i / 60);
  assert.equal(engine.state, "idle");
  assert.equal(root.nodes.get("wedge").attrs.d, "", "beak closed in silence");

  // Listening: a 2.5 s phrase from the microphone ends -> exactly one yes-nod (rng 0.1 = "nod, single").
  const listener = createToucanEngine({ root: fakeRoot(), rng: () => 0.1 });
  listener.setState("listening", 0);
  for (let t = 0; t < 8; t += 1 / 60) { listener.setCandidateLevel(t > 1 && t < 3.5 ? 0.7 : 0); listener.frame(t); }
  assert.equal(listener.state, "listening");
  assert.equal(listener.nodCount, 1);
  // Not listening: the same voice level never nods.
  const idle = createToucanEngine({ root: fakeRoot(), rng: () => 0.1 });
  idle.setState("idle", 0);
  for (let t = 0; t < 8; t += 1 / 60) { idle.setCandidateLevel(t > 1 && t < 3.5 ? 0.7 : 0); idle.frame(t); }
  assert.equal(idle.nodCount, 0);
});

test("engine: breathing is irregular and state changes blend smoothly (no pose snap)", () => {
  const root = fakeRoot();
  const engine = createToucanEngine({ root, rng: seeded(21) });
  engine.setState("idle", 0);
  const ys = []; let prevRot = null; let maxStep = 0;
  for (let i = 0; i < 60 * 40; i += 1) {
    const t = i / 60;
    if (i === 60 * 15) engine.setState("thinking", t);
    if (i === 60 * 25) engine.setState("listening", t);
    engine.frame(t);
    const body = root.nodes.get("body").attrs.transform;
    ys.push(Number(/scale\(([\d.]+) ([\d.]+)\)/.exec(body)[2]));
    const rot = Number(/rotate\((-?[\d.]+)/.exec(root.nodes.get("head").attrs.transform)[1]);
    if (prevRot !== null) maxStep = Math.max(maxStep, Math.abs(rot - prevRot));
    prevRot = rot;
  }
  const peaks = [];
  for (let i = 1; i < ys.length - 1; i += 1) if (ys[i] > ys[i - 1] && ys[i] >= ys[i + 1] && ys[i] > 1.004) peaks.push(i / 60);
  assert.ok(peaks.length >= 4, `breaths ${peaks.length}`);
  const gaps = peaks.slice(1).map((p, i) => p - peaks[i]);
  assert.ok(Math.max(...gaps) - Math.min(...gaps) > 0.2, "breath intervals vary");
  assert.ok(maxStep < 0.7, `head rotation changes smoothly (${maxStep})`);
});

test("engine: thinking turns the head at least 4.5 degrees (the limiter no longer crushes it to 2.5)", () => {
  const root = fakeRoot();
  const engine = createToucanEngine({ root, rng: seeded(13) });
  engine.setState("thinking", 0);
  let maxRot = 0;
  for (let i = 0; i < 60 * 4; i += 1) {
    engine.frame(i / 60);
    maxRot = Math.max(maxRot, Math.abs(Number(/rotate\((-?[\d.]+)/.exec(root.nodes.get("head").attrs.transform)[1])));
  }
  assert.ok(maxRot >= 4.5, `thinking head rotation ${maxRot}`);
});

test("engine: crest, wing, feet and tail tip write finite transforms over 10 s; reduced motion keeps the crest still", () => {
  const root = fakeRoot();
  const engine = createToucanEngine({ root, rng: seeded(23) });
  engine.setState("idle", 0);
  for (let i = 0; i < 60 * 10; i += 1) engine.frame(i / 60);
  for (const name of ["tuft0", "wing", "footL", "tailtip"]) {
    const nums = root.nodes.get(name).attrs.transform.match(/-?[\d.]+/g).map(Number);
    assert.ok(nums.length > 0 && nums.every(Number.isFinite), `${name} ${root.nodes.get(name).attrs.transform}`);
  }
  const stillRoot = fakeRoot();
  const still = createToucanEngine({ root: stillRoot, rng: seeded(23), reducedMotion: () => true });
  still.setState("idle", 0);
  let maxCrest = 0;
  for (let i = 0; i < 60 * 10; i += 1) {
    still.frame(i / 60);
    maxCrest = Math.max(maxCrest, Math.abs(Number(/rotate\((-?[\d.]+)/.exec(stillRoot.nodes.get("tuft0").attrs.transform)[1])));
  }
  assert.ok(maxCrest < 0.05, `reduced motion: crest rotation ${maxCrest}`);
});

test("engine: lower lid and glint write finite transforms; the upper lid stays within its travel", () => {
  const root = fakeRoot();
  const engine = createToucanEngine({ root, rng: seeded(17) });
  engine.setState("listening", 0);
  for (let i = 0; i < 300; i += 1) {
    engine.frame(i / 60);
    const lowlid = root.nodes.get("lowlid").attrs.transform;
    const glint = root.nodes.get("glint").attrs.transform;
    const lowY = Number(/translate\(0 (-?[\d.]+)\)/.exec(lowlid)[1]);
    const [gx, gy] = /translate\((-?[\d.]+) (-?[\d.]+)\)/.exec(glint).slice(1).map(Number);
    const lid = Number(/translate\(0 (-?[\d.]+)\)/.exec(root.nodes.get("lid").attrs.transform)[1]);
    assert.ok(Number.isFinite(lowY), `lowlid ${lowlid}`);
    assert.ok(Number.isFinite(gx) && Number.isFinite(gy), `glint ${glint}`);
    assert.ok(lid >= -11 - 1e-9 && lid <= 11 + 1e-9, `lid travel ${lid}`);
  }
});
