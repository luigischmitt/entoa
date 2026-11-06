// Asks for the microphone while the person is still setting up, so the interview itself has nothing left to ask.
// The stream is released at once: the room opens its own when the interview starts (the permission stays granted for the page).

import { buildAudioConstraints, isDeviceUnavailableError } from "./mic-device.mjs";

/**
 * @returns {Promise<{ ok: true } | { ok: false, reason: "denied" | "unsupported" | "unavailable" }>}
 * "denied": the person or the browser refused; "unsupported": no getUserMedia (an old or insecure page);
 * "unavailable": no microphone could be opened (none connected, busy). Only "denied" is a reason to stop the setup.
 */
export async function requestMicrophoneAccess({ deviceId = null, nav = typeof navigator === "undefined" ? undefined : navigator } = {}) {
  if (!nav?.mediaDevices?.getUserMedia) return { ok: false, reason: "unsupported" };
  const state = await readPermissionState(nav);
  if (state === "granted") return { ok: true };
  if (state === "denied") return { ok: false, reason: "denied" };
  let stream = null;
  try {
    try {
      stream = await nav.mediaDevices.getUserMedia({ audio: buildAudioConstraints(deviceId) });
    } catch (error) {
      if (deviceId === null || !isDeviceUnavailableError(error)) throw error;
      stream = await nav.mediaDevices.getUserMedia({ audio: buildAudioConstraints(null) });
    }
    return { ok: true };
  } catch (error) {
    const name = error?.name;
    return { ok: false, reason: name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable" };
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
  }
}

/** "granted" | "denied" | "prompt", or null where the browser cannot say (Safari for the microphone, older versions). */
async function readPermissionState(nav) {
  try {
    const status = await nav.permissions?.query({ name: "microphone" });
    return status?.state === "granted" || status?.state === "denied" || status?.state === "prompt" ? status.state : null;
  } catch {
    return null;
  }
}
