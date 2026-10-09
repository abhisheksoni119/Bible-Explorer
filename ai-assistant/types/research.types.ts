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
  /**
   * Approval gate: when true, the pipeline stops after duplicate detection
   * and returns the validated candidate as a proposal — nothing is inserted
   * until a human approves it. Used by the admin research API.
   */
  dryRun?: boolean;
}

export interface KeywordCandidate {
  keyword: string;
  /** Where this candidate came from — e.g. "google_trends", "serp_analysis", "related_search". */
  source: string;
  /**
   * AI-INFERRED ESTIMATE ONLY — never observed search data. The discovery
   * service has no live keyword-metrics provider; these numbers are model
   * guesses and must be labelled as such wherever displayed.
   */
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
