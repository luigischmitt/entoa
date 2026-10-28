import { describe, expect, it, vi } from "vitest";
import { AzureSpeechTranscriptionService, parseWav } from "./azure-speech-transcription-service.js";
import { pcmToWav } from "./streaming-transcription.js";

const sampleRate = 16_000;
const bytesPerSecond = sampleRate * 2;
const service = (fetcher: typeof fetch) => new AzureSpeechTranscriptionService({ key: "test", region: "eastus", timeoutMs: 1_000, fetchImplementation: fetcher });

describe("Azure short-audio chunking", () => {
  it("sends audio up to 50 seconds as a single request", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ RecognitionStatus: "Success", DisplayText: "short answer" }));
    const result = await service(fetcher).transcribe(pcmToWav(Buffer.alloc(30 * bytesPerSecond)), "azure");

    expect(fetcher).toHaveBeenCalledOnce();
    expect(result).toEqual({ provider: "azure", transcript: "short answer" });
  });

  it("splits a 120 second WAV into three requests and joins the transcripts", async () => {
    const bodies: Buffer[] = [];
    const replies = ["first part", "second part", "third part"];
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      bodies.push(Buffer.from(init?.body as Uint8Array));
      return Response.json({ RecognitionStatus: "Success", DisplayText: replies[bodies.length - 1] });
    });
    const pcm = Buffer.alloc(120 * bytesPerSecond, 1);
    const result = await service(fetcher).transcribe(pcmToWav(pcm), "azure");

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ provider: "azure", transcript: "first part second part third part" });
    const dataSizes = bodies.map((body) => parseWav(body)?.dataLength);
    expect(dataSizes).toEqual([50 * bytesPerSecond, 50 * bytesPerSecond, 20 * bytesPerSecond]);
    for (const body of bodies) {
      expect(body.toString("ascii", 0, 4)).toBe("RIFF");
      expect(body.toString("ascii", 8, 12)).toBe("WAVE");
      expect(body.toString("ascii", 12, 16)).toBe("fmt ");
      expect(body.readUInt32LE(24)).toBe(sampleRate);
      expect(body.readUInt16LE(22)).toBe(1);
      expect(body.readUInt16LE(34)).toBe(16);
      expect(body.length).toBe(44 + (parseWav(body)?.dataLength ?? -1));
    }
  });

  it("keeps the 16-bit WAV header format when splitting a non-44-byte header", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ RecognitionStatus: "Success", DisplayText: "ok" }));
    const extra = Buffer.from("LIST\x04\x00\x00\x00abcd", "ascii");
    const plain = pcmToWav(Buffer.alloc(61 * bytesPerSecond));
    const withList = Buffer.concat([plain.subarray(0, 36), extra, plain.subarray(36)]);
    withList.writeUInt32LE(withList.length - 8, 4);
    await service(fetcher).transcribe(withList, "azure");

    expect(parseWav(withList)).toMatchObject({ sampleRate, channels: 1, bitsPerSample: 16, dataLength: 61 * bytesPerSecond });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("sends unparseable audio as-is", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ RecognitionStatus: "Success", DisplayText: "raw" }));
    const garbage = Buffer.alloc(200 * 1024, 7);
    const result = await service(fetcher).transcribe(garbage, "azure");

    expect(fetcher).toHaveBeenCalledOnce();
    expect(result.transcript).toBe("raw");
  });
});
