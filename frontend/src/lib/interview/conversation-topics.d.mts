export type ConversationCategory =
  | "daily-life"
  | "food"
  | "travel"
  | "movies-series"
  | "music"
  | "sports"
  | "work-career"
  | "tech"
  | "money-goals"
  | "people-relationships"
  | "memories"
  | "hypotheticals"
  | "nature-animals"
  | "brazil-culture"
  | "learning"
  | "fun-opinions";

export interface ConversationPath {
  id: "p1" | "p2" | "p3" | "p4" | "p5";
  line: string;
}

export interface ConversationTopic {
  id: string;
  category: ConversationCategory;
  title: string;
  opening: string;
  paths: ConversationPath[];
}

export interface ConversationPlan {
  title: string;
  opening: string;
  paths: ConversationPath[];
}

export interface TopicStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const RECENT_TOPICS_STORAGE_KEY: "tuc:recent-conversation-topics";
export const RECENT_TOPICS_LIMIT: 24;
export const CONVERSATION_TOPICS: ConversationTopic[];

export function pickConversationTopic(options?: {
  recentIds?: string[];
  random?: () => number;
  topics?: ConversationTopic[];
}): ConversationTopic | null;

export function readRecentTopicIds(storage: Pick<TopicStorage, "getItem">): string[];

export function rememberConversationTopic(storage: TopicStorage, id: string): string[];

export function topicToConversationPlan(topic: ConversationTopic): ConversationPlan;
