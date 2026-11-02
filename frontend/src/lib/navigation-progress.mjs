import { useSyncExternalStore } from "react";

/**
 * Tiny external store for the global navigation bar. Anything that starts a route or view change calls
 * startNavigation(); the bar finishes on a route change, on pageshow, on the end of a view transition, or after
 * the safety timeout, so a stuck navigation can never leave the bar on screen.
 */

export const NAVIGATION_SAFETY_TIMEOUT_MS = 10_000;

let active = false;
let safetyTimer = null;
const listeners = new Set();

function notify() {
  for (const listener of listeners) listener();
}

function clearSafetyTimer() {
  if (safetyTimer === null) return;
  clearTimeout(safetyTimer);
  safetyTimer = null;
}

export function startNavigation() {
  // Each start re-arms the safety timer, so a second start never shortens a navigation that is still running.
  clearSafetyTimer();
  safetyTimer = setTimeout(finishNavigation, NAVIGATION_SAFETY_TIMEOUT_MS);
  if (active) return;
  active = true;
  notify();
}

export function finishNavigation() {
  clearSafetyTimer();
  if (!active) return;
  active = false;
  notify();
}

export function subscribeNavigation(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getNavigationActive() {
  return active;
}

export function getServerNavigationActive() {
  return false;
}

export function useNavigationActive() {
  return useSyncExternalStore(subscribeNavigation, getNavigationActive, getServerNavigationActive);
}
