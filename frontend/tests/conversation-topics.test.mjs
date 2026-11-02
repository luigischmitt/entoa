import assert from "node:assert/strict";
import test from "node:test";
import {
  CONVERSATION_TOPICS,
  RECENT_TOPICS_LIMIT,
  RECENT_TOPICS_STORAGE_KEY,
  pickConversationTopic,
  readRecentTopicIds,
  rememberConversationTopic,
  topicToConversationPlan,
} from "../src/lib/interview/conversation-topics.mjs";

const CATEGORIES = [
  "daily-life", "food", "travel", "movies-series", "music", "sports", "work-career", "tech",
  "money-goals", "people-relationships", "memories", "hypotheticals", "nature-animals",
  "brazil-culture", "learning", "fun-opinions",
];

const BANNED_WORDS = [
  "politics", "president", "election", "church", "religion", "god", "sex", "drug", "alcohol",
  "die", "died", "death", "cancer", "weight", "diet", "wife", "husband", "boyfriend", "girlfriend",
  "kids", "children", "salary",
];
const BANNED_PATTERN = new RegExp(`\\b(${BANNED_WORDS.join("|")})\\b`, "i");

const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length;
const sentenceCount = (text) => text.trim().split(/(?<=[.!?])\s+/).filter(Boolean).length;
const countQuestionMarks = (text) => (text.match(/\?/g) || []).length;

function createMemoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => { data.set(key, String(value)); },
    raw: data,
  };
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const allText = (topic) => [topic.opening, ...topic.paths.map((path) => path.line)];

test("topic ids are unique and kebab-case", () => {
  const ids = CONVERSATION_TOPICS.map((topic) => topic.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/, id);
});

test("there are at least 72 topics", () => {
  assert.ok(CONVERSATION_TOPICS.length >= 72, `only ${CONVERSATION_TOPICS.length}`);
});

test("every category is valid and has at least 4 topics", () => {
  const counts = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));
  for (const topic of CONVERSATION_TOPICS) {
    assert.ok(CATEGORIES.includes(topic.category), `${topic.id} has invalid category ${topic.category}`);
    counts[topic.category] += 1;
  }
  for (const category of CATEGORIES) {
    assert.ok(counts[category] >= 4, `${category} has ${counts[category]}`);
  }
});

test("each topic has a Portuguese title of 2 to 5 words", () => {
  for (const topic of CONVERSATION_TOPICS) {
    const words = wordCount(topic.title);
    assert.ok(words >= 2 && words <= 5, `${topic.id}: "${topic.title}" has ${words} words`);
    assert.ok(topic.title.trim() === topic.title && topic.title.length > 0, topic.id);
  }
});

test("each topic has exactly five paths named p1 to p5", () => {
  for (const topic of CONVERSATION_TOPICS) {
    assert.deepEqual(topic.paths.map((path) => path.id), ["p1", "p2", "p3", "p4", "p5"], topic.id);
  }
});

test("openings are two sentences, at most 35 words, and end with a single question", () => {
  for (const topic of CONVERSATION_TOPICS) {
    assert.ok(wordCount(topic.opening) <= 35, `${topic.id} opening has ${wordCount(topic.opening)} words`);
    assert.equal(sentenceCount(topic.opening), 2, `${topic.id} opening sentence count`);
    assert.ok(topic.opening.endsWith("?"), `${topic.id} opening must end with ?`);
    assert.equal(countQuestionMarks(topic.opening), 1, `${topic.id} opening must have one ?`);
  }
});

test("path lines are short, one or two sentences, and end with exactly one question", () => {
  for (const topic of CONVERSATION_TOPICS) {
    for (const path of topic.paths) {
      const { line } = path;
      assert.ok(wordCount(line) <= 28, `${topic.id} ${path.id} has ${wordCount(line)} words`);
      assert.ok([1, 2].includes(sentenceCount(line)), `${topic.id} ${path.id} sentence count`);
      assert.ok(line.endsWith("?"), `${topic.id} ${path.id} must end with ?`);
      assert.equal(countQuestionMarks(line), 1, `${topic.id} ${path.id} must have exactly one ?`);
    }
  }
});

test("no em dash or en dash appears in any text", () => {
  for (const topic of CONVERSATION_TOPICS) {
    for (const text of [topic.title, ...allText(topic)]) {
      assert.ok(!/[—–]/.test(text), `${topic.id} contains a dash: ${text}`);
    }
  }
});

test("banned topics are absent from openings and paths", () => {
  for (const topic of CONVERSATION_TOPICS) {
    for (const text of allText(topic)) {
      assert.doesNotMatch(text, BANNED_PATTERN, `${topic.id}: ${text}`);
    }
  }
});

test("no more than three openings start with the same first word", () => {
  const counts = new Map();
  for (const topic of CONVERSATION_TOPICS) {
    const first = topic.opening.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z']/g, "");
    counts.set(first, (counts.get(first) || 0) + 1);
  }
  for (const [word, count] of counts) {
    assert.ok(count <= 3, `"${word}" starts ${count} openings`);
  }
});

test("no two topics share the same opening", () => {
  const openings = CONVERSATION_TOPICS.map((topic) => topic.opening.trim().toLowerCase());
  assert.equal(new Set(openings).size, openings.length);
});

test("picker never returns a recent id when other topics remain", () => {
  const recentIds = CONVERSATION_TOPICS.slice(0, 30).map((topic) => topic.id);
  for (let seed = 1; seed <= 200; seed += 1) {
    const picked = pickConversationTopic({ recentIds, random: seededRandom(seed) });
    assert.ok(picked, "expected a topic");
    assert.ok(!recentIds.includes(picked.id), `returned recent ${picked.id}`);
  }
});

test("picker avoids the category of the most recent topic when possible", () => {
  const last = CONVERSATION_TOPICS[0];
  for (let seed = 1; seed <= 200; seed += 1) {
    const picked = pickConversationTopic({ recentIds: [last.id], random: seededRandom(seed) });
    assert.notEqual(picked.category, last.category);
  }
});

test("picker falls back to a category match when only that category remains", () => {
  const last = CONVERSATION_TOPICS[0];
  const sameCategory = CONVERSATION_TOPICS.filter((topic) => topic.category === last.category);
  const otherTopics = CONVERSATION_TOPICS.filter((topic) => topic.category !== last.category);
  const picked = pickConversationTopic({
    recentIds: [last.id, ...otherTopics.map((topic) => topic.id)],
    topics: [...sameCategory, ...otherTopics.slice(0, 0)],
    random: () => 0,
  });
  assert.ok(picked);
  assert.notEqual(picked.id, last.id);
});

test("picker still returns a topic when every id is recent", () => {
  const recentIds = CONVERSATION_TOPICS.map((topic) => topic.id);
  const picked = pickConversationTopic({ recentIds, random: () => 0.5 });
  assert.ok(CONVERSATION_TOPICS.includes(picked));
});

test("picker uses the random source uniformly over the remaining pool", () => {
  const topics = CONVERSATION_TOPICS.slice(0, 4);
  assert.equal(pickConversationTopic({ topics, random: () => 0 }).id, topics[0].id);
  assert.equal(pickConversationTopic({ topics, random: () => 0.99 }).id, topics[3].id);
});

test("picker never throws on bad input", () => {
  assert.doesNotThrow(() => pickConversationTopic({ random: () => { throw new Error("boom"); } }));
  assert.doesNotThrow(() => pickConversationTopic({ recentIds: null, topics: null }));
  assert.ok(CONVERSATION_TOPICS.includes(pickConversationTopic({ random: () => Number.NaN })));
});

test("a seeded walk of 24 picks that are remembered never repeats", () => {
  const storage = createMemoryStorage();
  const random = seededRandom(42);
  const picked = [];
  for (let step = 0; step < RECENT_TOPICS_LIMIT; step += 1) {
    const recentIds = readRecentTopicIds(storage);
    const topic = pickConversationTopic({ recentIds, random });
    picked.push(topic.id);
    rememberConversationTopic(storage, topic.id);
  }
  assert.equal(new Set(picked).size, picked.length, `repeats in ${picked.join(", ")}`);
});

test("storage helpers read, validate and remember recent ids", () => {
  const storage = createMemoryStorage({ [RECENT_TOPICS_STORAGE_KEY]: JSON.stringify(["a", "b"]) });
  assert.deepEqual(readRecentTopicIds(storage), ["a", "b"]);
  assert.deepEqual(rememberConversationTopic(storage, "b"), ["b", "a"]);
  assert.deepEqual(readRecentTopicIds(storage), ["b", "a"]);
});

test("remembering trims to the limit and keeps the newest first", () => {
  const storage = createMemoryStorage();
  for (let index = 0; index < RECENT_TOPICS_LIMIT + 5; index += 1) {
    rememberConversationTopic(storage, `topic-${index}`);
  }
  const ids = readRecentTopicIds(storage);
  assert.equal(ids.length, RECENT_TOPICS_LIMIT);
  assert.equal(ids[0], `topic-${RECENT_TOPICS_LIMIT + 4}`);
});

test("storage helpers survive a throwing storage and bad JSON", () => {
  const throwing = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
  };
  assert.deepEqual(readRecentTopicIds(throwing), []);
  assert.deepEqual(readRecentTopicIds(null), []);
  assert.doesNotThrow(() => rememberConversationTopic(throwing, "x"));
  assert.doesNotThrow(() => rememberConversationTopic(null, "x"));

  for (const raw of ["not json", "{\"a\":1}", "[1,2]", "[\"ok\",3]", "null"]) {
    assert.deepEqual(readRecentTopicIds(createMemoryStorage({ [RECENT_TOPICS_STORAGE_KEY]: raw })), [], raw);
  }
});

test("topicToConversationPlan returns title, opening and paths for the room", () => {
  const topic = CONVERSATION_TOPICS[0];
  const plan = topicToConversationPlan(topic);
  assert.deepEqual(Object.keys(plan).sort(), ["opening", "paths", "title"]);
  assert.equal(plan.title, topic.title);
  assert.ok(plan.opening.startsWith("Hi, I'm Tuck! Today, let's talk about "), plan.opening);
  assert.ok(plan.opening.includes(topic.opening), "the original opening is kept after the intro");
  assert.ok(plan.opening.endsWith(topic.opening));
  assert.deepEqual(plan.paths, topic.paths);
});

test("every topic has a subject of 2 to 7 words, with no final period, that reads after the intro", () => {
  for (const topic of CONVERSATION_TOPICS) {
    assert.equal(typeof topic.subject, "string", topic.id);
    const words = wordCount(topic.subject);
    assert.ok(words >= 2 && words <= 7, `${topic.id}: "${topic.subject}" has ${words} words`);
    assert.doesNotMatch(topic.subject, /\.$/u, topic.id);
    assert.doesNotMatch(topic.subject, /[?!,;:]/u, `${topic.id} subject is a plain phrase`);
    assert.ok(topic.subject.trim() === topic.subject, topic.id);
  }
});

test("the plan opening names the subject in the intro, once", () => {
  for (const topic of CONVERSATION_TOPICS) {
    const plan = topicToConversationPlan(topic);
    assert.equal(plan.opening, `Hi, I'm Tuck! Today, let's talk about ${topic.subject}. ${topic.opening}`, topic.id);
  }
});
