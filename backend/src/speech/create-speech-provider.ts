import type { SpeechConfig } from "./config.js";
import { AzureSpeechProvider } from "./azure-speech-provider.js";
import { ChatterboxSpeechProvider } from "./chatterbox-speech-provider.js";
import { FakeSpeechProvider } from "./fake-speech-provider.js";
import { HybridSpeechProvider } from "./hybrid-speech-provider.js";
import type { SpeechProvider } from "./types.js";

export function createSpeechProvider(config: SpeechConfig): SpeechProvider {
  if (config.provider === "chatterbox-azure") {
    if (!config.azure || !config.chatterbox || !config.hybrid) throw new Error("Chatterbox Azure speech configuration is missing.");
    return new HybridSpeechProvider({
      primary: new ChatterboxSpeechProvider(config.chatterbox),
      secondary: new AzureSpeechProvider(config.azure),
      secondaryVoice: config.azure.voice,
      // Azure gets its full timeout after Chatterbox's own deadline, so the overall budget is the sum of both.
      timeoutMs: config.chatterbox.timeoutMs + config.azure.timeoutMs,
      hedgeAfterMs: config.hybrid.hedgeAfterMs,
      pinnedFallbackAfterMs: config.hybrid.pinnedFallbackAfterMs,
    });
  }

  return new FakeSpeechProvider();
}
