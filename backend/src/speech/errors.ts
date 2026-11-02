import type { SpeechDiagnostics } from "./types.js";

export class SpeechProviderUnavailableError extends Error {
  diagnostics?: SpeechDiagnostics;
  /** Upstream HTTP status, when the provider answered with an error. */
  status?: number;

  constructor(message: string, options?: ErrorOptions & { diagnostics?: SpeechDiagnostics; status?: number }) {
    super(message, options);
    this.name = "SpeechProviderUnavailableError";
    if (options?.diagnostics) this.diagnostics = options.diagnostics;
    if (options?.status !== undefined) this.status = options.status;
  }
}
