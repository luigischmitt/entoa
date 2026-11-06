export type MicrophoneAccessResult = { ok: true } | { ok: false; reason: "denied" | "unsupported" | "unavailable" };
export function requestMicrophoneAccess(options?: { deviceId?: string | null; nav?: Partial<Navigator> }): Promise<MicrophoneAccessResult>;
