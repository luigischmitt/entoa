/** Fixed, content-free category of an upstream transcription failure. Never derived from provider response text. */
export type TranscriptionFailureCategory = "5xx" | "429" | "rejected" | "timeout" | "network" | "aborted" | "invalid_response" | "empty";

export type TranscriptionUnavailableErrorOptions = ErrorOptions & {
  providerStatus?: TranscriptionFailureCategory;
  /** HTTP attempts made before giving up. */
  attempts?: number;
  /** Numeric HTTP status of the upstream response, when one was received. Content-free. */
  httpStatus?: number;
};

export class TranscriptionUnavailableError extends Error {
  readonly providerStatus?: TranscriptionFailureCategory;
  readonly attempts?: number;
  readonly httpStatus?: number;

  constructor(message: string, options?: TranscriptionUnavailableErrorOptions) {
    super(message, options);
    this.name = "TranscriptionUnavailableError";
    this.providerStatus = options?.providerStatus;
    this.attempts = options?.attempts;
    this.httpStatus = options?.httpStatus;
  }
}
