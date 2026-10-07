/**
 * Types for Research + Keyword Discovery + Search Intent Detection.
 * Interface-only — no implementation. Phase 2 services (research.service.ts,
 * keywordDiscovery.service.ts, intentDetection.service.ts) consume/produce these.
 */

export interface ResearchInput {
  /** Starting point for research — an existing topic name, a raw keyword, or a content gap description. */
  seedQuery: string;
  language?: string;
  /** Optional hint to bias research toward a known topic (for expansion/refresh runs). */
  relatedTopicId?: string | null;
}

export interface KeywordCandidate {
  keyword: string;
  /** Where this candidate came from — e.g. "google_trends", "serp_analysis", "related_search". */
  source: string;
  estimatedVolume?: number;
  estimatedDifficulty?: number;
}

export interface ResearchOutput {
  seedQuery: string;
  language: string;
  keywords: KeywordCandidate[];
  relatedTopics: string[];
}

export type SearchIntentType = 'informational' | 'navigational' | 'transactional' | 'commercial';

export interface SearchIntentResult {
  type: SearchIntentType;
  confidence: number; // 0–1
  reasoning?: string;
}
