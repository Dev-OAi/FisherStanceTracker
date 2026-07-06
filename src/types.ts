/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MacroDataPoint {
  date: string; // YYYY-MM-DD
  effr: number; // Effective Federal Funds Rate (%)
  rStar: number; // Natural Rate of Interest (%)
  coreInflation: number; // Core Inflation Rate (%)
  fisherNeutral: number; // Derived: rStar + coreInflation (%)
  spread: number; // Derived: effr - fisherNeutral (%)
  stance: 'Accommodative' | 'Restrictive' | 'Neutral';
}

export interface StanceSummary {
  currentDate: string;
  currentEffr: number;
  currentRStar: number;
  currentCoreInflation: number;
  currentFisherNeutral: number;
  currentSpread: number;
  currentStance: 'Accommodative' | 'Restrictive' | 'Neutral';
  restrictiveMonths: number;
  accommodativeMonths: number;
  neutralMonths: number;
  totalMonths: number;
}

export interface AIAnalysisResponse {
  analysis: string;
  sentiment: 'hawkish' | 'dovish' | 'neutral';
  recommendation: string;
}
