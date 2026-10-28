import { TranscriptionUnavailableError } from "./errors.js";
import type { TranscriptionProvider, TranscriptionResult, TranscriptionService } from "./types.js";

type AzureCandidate = {
  Display?: string;
};

type AzureSpeechResponse = {
  RecognitionStatus?: string;
  DisplayText?: string;
  NBest?: AzureCandidate[];
};

/** Azure's short-audio REST endpoint accepts at most 60 s; 50 s chunks leave headroom. */
const maxChunkSeconds = 50;

type AzureSpeechTranscriptionServiceOptions = {
  key: string;
  region: string;
  timeoutMs: number;
  fetchImplementation?: typeof fetch;
};

export class AzureSpeechTranscriptionService implements TranscriptionService {
  private readonly endpoint: string;
  private readonly fetchImplementation: typeof fetch;

  constructor(private readonly options: AzureSpeechTranscriptionServiceOptions) {
    this.endpoint = `https://${options.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`;
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  availableProviders(): TranscriptionProvider[] {
    return ["azure"];
  }

  async transcribe(audio: Buffer, provider: TranscriptionProvider): Promise<TranscriptionResult> {
    if (provider !== "azure") throw new TranscriptionUnavailableError("This transcription provider is not configured.");
    const wav = parseWav(audio);
    // The short-audio endpoint accepts at most 60 s, so longer recordings are sent as sequential chunks.
    if (!wav || wav.dataLength <= maxChunkSeconds * wav.bytesPerSecond) {
      const transcript = recognizedText(await this.request(audio));
      if (!transcript) throw new TranscriptionUnavailableError("Azure Speech could not recognize a response in this recording.");
      return { provider, transcript };
    }

    const chunkBytes = Math.floor((maxChunkSeconds * wav.bytesPerSecond) / wav.blockAlign) * wav.blockAlign;
    const transcripts: string[] = [];
    for (let offset = 0; offset < wav.dataLength; offset += chunkBytes) {
      const pcm = audio.subarray(wav.dataOffset + offset, wav.dataOffset + Math.min(offset + chunkBytes, wav.dataLength));
      if (pcm.length < wav.blockAlign) continue;
      const transcript = recognizedText(await this.request(buildPcmWav(pcm, wav)));
      if (transcript) transcripts.push(transcript);
    }
    const transcript = transcripts.join(" ");
    if (!transcript) throw new TranscriptionUnavailableError("Azure Speech could not recognize a response in this recording.");
    return { provider, transcript };
  }

  private async request(audio: Buffer): Promise<AzureSpeechResponse> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
      "Ocp-Apim-Subscription-Key": this.options.key,
    };

    try {
      const response = await this.fetchImplementation(this.endpoint, {
        method: "POST",
        headers,
        body: new Uint8Array(audio),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });

      if (!response.ok) {
        throw new TranscriptionUnavailableError(`Azure Speech returned HTTP ${response.status}.`);
      }

      return await response.json() as AzureSpeechResponse;
    } catch (error) {
      if (error instanceof TranscriptionUnavailableError) throw error;
      throw new TranscriptionUnavailableError("Azure Speech is unavailable right now.", { cause: error });
    }
  }
}

type WavFormat = {
  audioFormat: number;
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  blockAlign: number;
  bytesPerSecond: number;
  dataOffset: number;
  dataLength: number;
};

/** Reads the fmt and data chunks by walking the RIFF structure; returns null when the header is not a usable WAV. */
export function parseWav(audio: Buffer): WavFormat | null {
  if (audio.length < 12 || audio.toString("ascii", 0, 4) !== "RIFF" || audio.toString("ascii", 8, 12) !== "WAVE") return null;
  let format: Omit<WavFormat, "dataOffset" | "dataLength"> | null = null;
  let data: { offset: number; length: number } | null = null;
  let position = 12;
  while (position + 8 <= audio.length) {
    const id = audio.toString("ascii", position, position + 4);
    const size = audio.readUInt32LE(position + 4);
    const body = position + 8;
    if (id === "fmt " && size >= 16 && body + 16 <= audio.length) {
      const audioFormat = audio.readUInt16LE(body);
      const channels = audio.readUInt16LE(body + 2);
      const sampleRate = audio.readUInt32LE(body + 4);
      const bytesPerSecond = audio.readUInt32LE(body + 8);
      const blockAlign = audio.readUInt16LE(body + 12);
      const bitsPerSample = audio.readUInt16LE(body + 14);
      if (channels > 0 && sampleRate > 0 && blockAlign > 0 && bytesPerSecond > 0 && bitsPerSample > 0) {
        format = { audioFormat, channels, sampleRate, bitsPerSample, blockAlign, bytesPerSecond };
      }
    } else if (id === "data") {
      data = { offset: body, length: Math.min(size, audio.length - body) };
      break;
    }
    position = body + size + (size % 2);
  }
  if (!format || !data) return null;
  return { ...format, dataOffset: data.offset, dataLength: data.length - (data.length % format.blockAlign) };
}

/** A minimal 44-byte PCM WAV header with the same format as the source, wrapping one PCM slice. */
function buildPcmWav(pcm: Buffer, format: WavFormat): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  // WAVE_FORMAT_EXTENSIBLE is written as plain PCM so the 16-byte fmt chunk stays valid.
  header.writeUInt16LE(format.audioFormat === 0xfffe ? 1 : format.audioFormat, 20);
  header.writeUInt16LE(format.channels, 22);
  header.writeUInt32LE(format.sampleRate, 24);
  header.writeUInt32LE(format.bytesPerSecond, 28);
  header.writeUInt16LE(format.blockAlign, 32);
  header.writeUInt16LE(format.bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function recognizedText(transcription: AzureSpeechResponse): string | undefined {
  if (transcription.RecognitionStatus !== "Success") return undefined;
  return transcription.NBest?.[0]?.Display?.trim() || transcription.DisplayText?.trim() || undefined;
}
