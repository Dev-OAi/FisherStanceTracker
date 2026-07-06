/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MacroDataPoint } from '../types';

// Milestone data points representing the key historical values from 2000 to 2026.
// Monthly data will be interpolated between these milestones to create a smooth, high-fidelity curve matching the chart.
interface Milestone {
  year: number;
  month: number; // 1-indexed
  effr: number;
  rStar: number;
  coreInflation: number;
}

const milestones: Milestone[] = [
  { year: 2000, month: 1, effr: 5.50, rStar: 3.40, coreInflation: 1.80 },
  { year: 2000, month: 7, effr: 6.50, rStar: 3.20, coreInflation: 1.90 },
  { year: 2000, month: 12, effr: 6.50, rStar: 3.10, coreInflation: 2.00 },
  { year: 2001, month: 6, effr: 3.75, rStar: 2.90, coreInflation: 2.10 },
  { year: 2001, month: 12, effr: 1.75, rStar: 2.80, coreInflation: 1.90 },
  { year: 2002, month: 6, effr: 1.75, rStar: 2.60, coreInflation: 1.60 },
  { year: 2002, month: 12, effr: 1.25, rStar: 2.55, coreInflation: 1.70 },
  { year: 2003, month: 6, effr: 1.00, rStar: 2.50, coreInflation: 1.30 },
  { year: 2003, month: 12, effr: 1.00, rStar: 2.45, coreInflation: 1.50 },
  { year: 2004, month: 6, effr: 1.25, rStar: 2.40, coreInflation: 1.80 },
  { year: 2004, month: 12, effr: 2.25, rStar: 2.35, coreInflation: 2.10 },
  { year: 2005, month: 6, effr: 3.25, rStar: 2.30, coreInflation: 2.20 },
  { year: 2005, month: 12, effr: 4.25, rStar: 2.25, coreInflation: 2.20 },
  { year: 2006, month: 6, effr: 5.25, rStar: 2.20, coreInflation: 2.40 },
  { year: 2007, month: 6, effr: 5.25, rStar: 2.10, coreInflation: 2.30 },
  { year: 2007, month: 12, effr: 4.25, rStar: 1.90, coreInflation: 2.10 },
  { year: 2008, month: 6, effr: 2.00, rStar: 1.60, coreInflation: 2.00 },
  { year: 2008, month: 12, effr: 0.15, rStar: 1.20, coreInflation: 1.70 },
  { year: 2009, month: 6, effr: 0.15, rStar: 1.00, coreInflation: 1.40 },
  { year: 2010, month: 6, effr: 0.15, rStar: 0.85, coreInflation: 1.50 },
  { year: 2011, month: 6, effr: 0.15, rStar: 0.75, coreInflation: 1.60 },
  { year: 2012, month: 6, effr: 0.15, rStar: 0.70, coreInflation: 1.70 },
  { year: 2013, month: 6, effr: 0.15, rStar: 0.70, coreInflation: 1.65 },
  { year: 2014, month: 6, effr: 0.15, rStar: 0.75, coreInflation: 1.60 },
  { year: 2015, month: 6, effr: 0.15, rStar: 0.80, coreInflation: 1.45 },
  { year: 2015, month: 12, effr: 0.25, rStar: 0.85, coreInflation: 1.50 },
  { year: 2016, month: 6, effr: 0.38, rStar: 0.90, coreInflation: 1.70 },
  { year: 2016, month: 12, effr: 0.63, rStar: 0.95, coreInflation: 1.80 },
  { year: 2017, month: 6, effr: 1.13, rStar: 1.00, coreInflation: 1.90 },
  { year: 2017, month: 12, effr: 1.38, rStar: 1.05, coreInflation: 1.95 },
  { year: 2018, month: 6, effr: 1.88, rStar: 1.10, coreInflation: 2.00 },
  { year: 2018, month: 12, effr: 2.38, rStar: 1.05, coreInflation: 1.90 },
  { year: 2019, month: 6, effr: 2.38, rStar: 0.95, coreInflation: 1.70 },
  { year: 2019, month: 12, effr: 1.55, rStar: 0.80, coreInflation: 1.60 },
  { year: 2020, month: 3, effr: 0.10, rStar: 0.75, coreInflation: 1.50 },
  { year: 2020, month: 6, effr: 0.10, rStar: 0.72, coreInflation: 1.40 },
  { year: 2021, month: 1, effr: 0.10, rStar: 0.65, coreInflation: 1.50 },
  { year: 2021, month: 6, effr: 0.10, rStar: 0.62, coreInflation: 3.50 },
  { year: 2021, month: 12, effr: 0.10, rStar: 0.65, coreInflation: 4.70 },
  { year: 2022, month: 6, effr: 1.50, rStar: 0.70, coreInflation: 4.80 },
  { year: 2022, month: 12, effr: 4.10, rStar: 0.75, coreInflation: 4.40 },
  { year: 2023, month: 6, effr: 5.05, rStar: 0.80, coreInflation: 3.80 },
  { year: 2023, month: 12, effr: 5.33, rStar: 0.85, coreInflation: 3.20 },
  { year: 2024, month: 6, effr: 5.33, rStar: 0.95, coreInflation: 2.60 },
  { year: 2024, month: 12, effr: 4.33, rStar: 1.00, coreInflation: 2.20 },
  { year: 2025, month: 6, effr: 3.83, rStar: 1.10, coreInflation: 2.10 },
  { year: 2025, month: 12, effr: 3.33, rStar: 1.15, coreInflation: 2.00 },
  { year: 2026, month: 6, effr: 3.25, rStar: 1.20, coreInflation: 2.00 }
];

// Helper to interpolate between two numbers
function interpolate(start: number, end: number, fraction: number): number {
  return start + (end - start) * fraction;
}

export function generateHistoricalData(): MacroDataPoint[] {
  const dataPoints: MacroDataPoint[] = [];

  for (let i = 0; i < milestones.length - 1; i++) {
    const start = milestones[i];
    const end = milestones[i + 1];

    const startIdx = start.year * 12 + (start.month - 1);
    const endIdx = end.year * 12 + (end.month - 1);
    const steps = endIdx - startIdx;

    for (let s = 0; s < steps; s++) {
      const fraction = s / steps;
      const currentIdx = startIdx + s;
      const year = Math.floor(currentIdx / 12);
      const monthZero = currentIdx % 12;

      const dateStr = `${year}-${String(monthZero + 1).padStart(2, '0')}-01`;

      const effr = parseFloat(interpolate(start.effr, end.effr, fraction).toFixed(2));
      const rStar = parseFloat(interpolate(start.rStar, end.rStar, fraction).toFixed(2));
      const coreInflation = parseFloat(interpolate(start.coreInflation, end.coreInflation, fraction).toFixed(2));

      const fisherNeutral = parseFloat((rStar + coreInflation).toFixed(2));
      const spread = parseFloat((effr - fisherNeutral).toFixed(2));
      
      let stance: 'Accommodative' | 'Restrictive' | 'Neutral' = 'Neutral';
      if (spread > 0.05) {
        stance = 'Restrictive';
      } else if (spread < -0.05) {
        stance = 'Accommodative';
      }

      dataPoints.push({
        date: dateStr,
        effr,
        rStar,
        coreInflation,
        fisherNeutral,
        spread,
        stance
      });
    }
  }

  // Add the last point
  const last = milestones[milestones.length - 1];
  const lastDateStr = `${last.year}-${String(last.month).padStart(2, '0')}-01`;
  const fisherNeutral = parseFloat((last.rStar + last.coreInflation).toFixed(2));
  const spread = parseFloat((last.effr - fisherNeutral).toFixed(2));
  let stance: 'Accommodative' | 'Restrictive' | 'Neutral' = 'Neutral';
  if (spread > 0.05) {
    stance = 'Restrictive';
  } else if (spread < -0.05) {
    stance = 'Accommodative';
  }

  dataPoints.push({
    date: lastDateStr,
    effr: last.effr,
    rStar: last.rStar,
    coreInflation: last.coreInflation,
    fisherNeutral,
    spread,
    stance
  });

  return dataPoints;
}

export const defaultHistoricalData = generateHistoricalData();
