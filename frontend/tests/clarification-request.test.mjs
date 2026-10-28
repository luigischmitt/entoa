import assert from "node:assert/strict";
import test from "node:test";

import { detectClarificationRequest } from "../src/lib/interview/clarification-request.mjs";

const repeat = ["Can you repeat the question?", "Sorry?", "Pardon?", "Come again?", "Say that again", "one more time", "Sorry, what?", "can you repit", "Could you repeat that, please?", "Um, sorry, could you repeat that please?", "Sorry. Can you say that again?", "Excuse me?", "Can you repeat what you said", "I didn't catch that", "pode repetir?", "Pode repetir a pergunta, por favor?", "repete", "Desculpa, pode repetir?", "como?", "de novo"];
const rephrase = ["I didn't understand", "I did not understand the question", "I don't understand the question", "Sorry, I didn't get it", "Could you rephrase that?", "Can you say it in a different way?", "Could you explain the question?", "could you explain", "What do you mean?", "What do you mean by that?", "Could you clarify?", "Can you make it simpler", "não entendi", "Não entendi a pergunta", "como assim", "pode explicar melhor?", "pode reformular?", "I did not understand. Could you repeat?", "não entendi a pergunta, pode repetir?"];
const define = ["What do you mean by scalability?", "What does idempotency mean?", "Hmm, I don't know what scalability means", "What is CI/CD?", "Could you define latency?", "What does CI/CD stand for", "O que significa idempotência?", "o que é escalabilidade", "O que você quer dizer com latência?"];

test("detects repeat requests in English, Portuguese and Whisper-style variants", () => {
  for (const text of repeat) assert.equal(detectClarificationRequest(text), "repeat", text);
});

test("detects requests to say the question another way", () => {
  for (const text of rephrase) assert.equal(detectClarificationRequest(text), "rephrase", text);
});

test("detects requests to explain a word or term", () => {
  for (const text of define) assert.equal(detectClarificationRequest(text), "define", text);
});

test("never classifies real answers, even ones containing clarification words", () => {
  const answers = [
    "I don't know",
    "Not sure",
    "Yes",
    "Let me think",
    "I would repeat the request three times with exponential backoff and then fail",
    "We repeat the process every night",
    "I don't understand why the build failed so I looked at the logs and found a missing dependency",
    "What do you mean by scalability in this context? In my last project we had to handle ten thousand requests per second and I used Kafka for that",
    "Sure, I can explain how we deployed it with Docker",
    "Could you explain how that works in my project? Honestly I used React",
    "what is the difference between a process and a thread in Node",
    "I used Redis again",
    "I did it again and again until it worked",
    "Eu não entendi o erro no começo, mas depois achei o problema no banco de dados e corrigi",
    "",
  ];
  for (const text of answers) assert.equal(detectClarificationRequest(text), null, text);
});

test("an utterance longer than twenty words is never a clarification request", () => {
  const long = `Can you repeat the question ${"please ".repeat(20)}`;
  assert.equal(detectClarificationRequest(long), null);
});

test("ignores non-string input", () => {
  assert.equal(detectClarificationRequest(undefined), null);
  assert.equal(detectClarificationRequest(null), null);
});

test("real requests from interviews: slower repeats and literal Portuguese word questions", () => {
  for (const text of ["Can you repeat more slower?", "Can you repeat it a bit slower, please?", "Could you speak more slowly?", "Say it again slower", "Repeat please"]) {
    assert.equal(detectClarificationRequest(text), "repeat", text);
  }
  for (const text of ["Sorry, but I don't know what is index database.", "What means scalability?", "What scalability means?", "What does idempotency means?", "What is the meaning of the word throughput?", "I don't understand the word latency"]) {
    assert.equal(detectClarificationRequest(text), "define", text);
  }
});

test("an echo of the question ending in 'what is <term>' is a definition request only for the question's own words", () => {
  const question = "How would you profile and resolve performance bottlenecks in a backend service?";
  assert.equal(detectClarificationRequest("Profile and resolve performance bottlenecks what is bottlenecks", question), "define");
  assert.equal(detectClarificationRequest("Profile and resolve performance bottlenecks what is bottleneck?", question), "define");
  assert.equal(detectClarificationRequest("I used caching and it worked, what is the result", question), null);
  assert.equal(detectClarificationRequest("I improved the queue, what is latency", question), null);
  assert.equal(detectClarificationRequest("Profile and resolve performance bottlenecks what is bottlenecks"), null);
});

test("a request followed by an echo of the question's words asks what those words mean", () => {
  const question = "What first made you curious about writing software?";
  assert.equal(detectClarificationRequest("I don't understand. Writing software", question), "define");
  assert.equal(detectClarificationRequest("Sorry, I didn't get it. Curious?", question), "define");
  assert.equal(detectClarificationRequest("I don't understand. Writing software", null), null);
  assert.equal(detectClarificationRequest("Writing software. I like it.", question), null);
  assert.equal(detectClarificationRequest("I don't understand. Databases", question), null);
});
