import { afterEach, describe, expect, it, vi } from "vitest";
import { loadTranscriptionConfig } from "./config.js";
import { createTranscriptionService } from "./create-transcription-service.js";
import { TranscriptionUnavailableError } from "./errors.js";
import type { TranscriptionResult } from "./types.js";

const audio = Buffer.alloc(64);
const config = loadTranscriptionConfig({ OPENROUTER_API_KEY: "test-key" });
const okResult = (provider: TranscriptionResult["provider"], transcript = "hello"): TranscriptionResult => ({ provider, transcript });
const rejected = (httpStatus = 400) => new TranscriptionUnavailableError(`OpenRouter returned HTTP ${httpStatus}.`, { providerStatus: "rejected", attempts: 1, httpStatus });

function makeDeps() {
  const openRouter = {
    transcribe: vi.fn<(...args: unknown[]) => Promise<TranscriptionResult>>(),
    availableProviders: vi.fn(() => ["whisper-large-v3", "whisper-large-v3-turbo"] as const),
  };
  const azure = {
    transcribe: vi.fn<(...args: unknown[]) => Promise<TranscriptionResult>>(async () => okResult("azure", "azure words")),
    availableProviders: vi.fn(() => ["azure"] as const),
  };
  return { openRouter, azure };
}

describe("Whisper fallback chain", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not fall back when the primary model succeeds", async () => {
    const { openRouter, azure } = makeDeps();
    openRouter.transcribe.mockResolvedValueOnce(okResult("whisper-large-v3"));
    const service = createTranscriptionService(config, { openRouter: openRouter as never, azure: azure as never });

    await expect(service.transcribe(audio, "whisper-large-v3", "wav")).resolves.toEqual(okResult("whisper-large-v3"));
    expect(openRouter.transcribe).toHaveBeenCalledOnce();
    expect(azure.transcribe).not.toHaveBeenCalled();
  });

  it("calls the other Whisper model without context after a rejected primary", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { openRouter, azure } = makeDeps();
    openRouter.transcribe.mockRejectedValueOnce(rejected(400)).mockResolvedValueOnce(okResult("whisper-large-v3-turbo", "recovered"));
    const service = createTranscriptionService(config, { openRouter: openRouter as never, azure: azure as never });
    const context = { question: "Tell me about caching", previousText: "I used Redis" };

    await expect(service.transcribe(audio, "whisper-large-v3", "wav", undefined, context)).resolves.toEqual(okResult("whisper-large-v3-turbo", "recovered"));
    expect(openRouter.transcribe).toHaveBeenNthCalledWith(1, audio, "whisper-large-v3", "wav", undefined, context);
    expect(openRouter.transcribe).toHaveBeenNthCalledWith(2, audio, "whisper-large-v3-turbo", "wav", undefined, undefined);
    expect(azure.transcribe).not.toHaveBeenCalled();
    expect(JSON.parse(String(info.mock.calls[0]?.[0]))).toEqual({ event: "transcription_fallback", from: "whisper-large-v3", to: "whisper-large-v3-turbo", reason: "rejected", httpStatus: 400 });
    expect(String(info.mock.calls[0]?.[0])).not.toContain("Redis");
  });

  it("uses Azure when both Whisper models fail", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { openRouter, azure } = makeDeps();
    openRouter.transcribe.mockRejectedValueOnce(rejected(400)).mockRejectedValueOnce(rejected(503));
    const service = createTranscriptionService(config, { openRouter: openRouter as never, azure: azure as never });

    await expect(service.transcribe(audio, "whisper-large-v3-turbo", "wav")).resolves.toEqual(okResult("azure", "azure words"));
    expect(azure.transcribe).toHaveBeenCalledWith(audio, "azure");
  });

  it("skips Azure for non-WAV audio", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { openRouter, azure } = makeDeps();
    openRouter.transcribe.mockRejectedValue(rejected(400));
    const service = createTranscriptionService(config, { openRouter: openRouter as never, azure: azure as never });

    await expect(service.transcribe(audio, "whisper-large-v3", "webm")).rejects.toMatchObject({ httpStatus: 400 });
    expect(azure.transcribe).not.toHaveBeenCalled();
  });

  it("throws the first error when every step fails", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { openRouter, azure } = makeDeps();
    const first = rejected(400);
    openRouter.transcribe.mockRejectedValueOnce(first).mockRejectedValueOnce(rejected(502));
    azure.transcribe.mockRejectedValueOnce(new TranscriptionUnavailableError("Azure Speech is unavailable right now."));
    const service = createTranscriptionService(config, { openRouter: openRouter as never, azure: azure as never });

    const error = await service.transcribe(audio, "whisper-large-v3", "wav").catch((caught: unknown) => caught);
    expect(error).toBe(first);
    expect(azure.transcribe).toHaveBeenCalledOnce();
  });

  it("does not fall back when the caller aborted", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { openRouter, azure } = makeDeps();
    const controller = new AbortController();
    openRouter.transcribe.mockImplementationOnce(async () => {
      controller.abort();
      throw new TranscriptionUnavailableError("OpenRouter transcription is unavailable right now.", { providerStatus: "aborted" });
    });
    const service = createTranscriptionService(config, { openRouter: openRouter as never, azure: azure as never });

    await expect(service.transcribe(audio, "whisper-large-v3", "wav", controller.signal)).rejects.toMatchObject({ providerStatus: "aborted" });
    expect(openRouter.transcribe).toHaveBeenCalledOnce();
    expect(azure.transcribe).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
  });

  it("does not fall back when the caller aborted during the other model", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { openRouter, azure } = makeDeps();
    const controller = new AbortController();
    openRouter.transcribe.mockRejectedValueOnce(rejected(400)).mockImplementationOnce(async () => {
      controller.abort();
      throw new TranscriptionUnavailableError("OpenRouter transcription is unavailable right now.", { providerStatus: "aborted" });
    });
    const service = createTranscriptionService(config, { openRouter: openRouter as never, azure: azure as never });

    await expect(service.transcribe(audio, "whisper-large-v3", "wav", controller.signal)).rejects.toMatchObject({ providerStatus: "aborted" });
    expect(openRouter.transcribe).toHaveBeenCalledTimes(2);
    expect(azure.transcribe).not.toHaveBeenCalled();
  });
});
