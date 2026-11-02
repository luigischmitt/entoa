import test from "node:test";
import assert from "node:assert/strict";
import { finishNavigation, getNavigationActive, NAVIGATION_SAFETY_TIMEOUT_MS, startNavigation, subscribeNavigation } from "../src/lib/navigation-progress.mjs";

function recordChanges() {
  const changes = [];
  const unsubscribe = subscribeNavigation(() => changes.push(getNavigationActive()));
  return { changes, unsubscribe };
}

test("start turns the bar on once and finish turns it off", () => {
  finishNavigation();
  const { changes, unsubscribe } = recordChanges();
  startNavigation();
  assert.equal(getNavigationActive(), true);
  finishNavigation();
  assert.equal(getNavigationActive(), false);
  assert.deepEqual(changes, [true, false]);
  unsubscribe();
});

test("calling start twice is safe and notifies only once", () => {
  finishNavigation();
  const { changes, unsubscribe } = recordChanges();
  startNavigation();
  startNavigation();
  assert.equal(getNavigationActive(), true);
  finishNavigation();
  assert.deepEqual(changes, [true, false]);
  unsubscribe();
});

test("finish without an active navigation is a no-op", () => {
  finishNavigation();
  const { changes, unsubscribe } = recordChanges();
  finishNavigation();
  assert.equal(getNavigationActive(), false);
  assert.deepEqual(changes, []);
  unsubscribe();
});

test("the safety timeout finishes a navigation that never completes", (t) => {
  finishNavigation();
  t.mock.timers.enable({ apis: ["setTimeout"] });
  startNavigation();
  t.mock.timers.tick(NAVIGATION_SAFETY_TIMEOUT_MS - 1);
  assert.equal(getNavigationActive(), true);
  t.mock.timers.tick(1);
  assert.equal(getNavigationActive(), false);
  t.mock.timers.reset();
});

test("a second start re-arms the timeout instead of shortening the navigation", (t) => {
  finishNavigation();
  t.mock.timers.enable({ apis: ["setTimeout"] });
  startNavigation();
  t.mock.timers.tick(NAVIGATION_SAFETY_TIMEOUT_MS - 1000);
  startNavigation();
  t.mock.timers.tick(NAVIGATION_SAFETY_TIMEOUT_MS - 1);
  assert.equal(getNavigationActive(), true);
  t.mock.timers.tick(1);
  assert.equal(getNavigationActive(), false);
  t.mock.timers.reset();
});

test("an explicit finish clears the pending timeout", (t) => {
  finishNavigation();
  t.mock.timers.enable({ apis: ["setTimeout"] });
  startNavigation();
  finishNavigation();
  startNavigation();
  t.mock.timers.tick(NAVIGATION_SAFETY_TIMEOUT_MS - 1);
  assert.equal(getNavigationActive(), true);
  finishNavigation();
  t.mock.timers.reset();
});
