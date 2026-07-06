/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { defaultHistoricalData } from "./src/data/historicalData.js";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Memory cache to hold FRED data or custom simulation data
let macroDataStore = [...defaultHistoricalData];

// 1. Get Macro Data
app.get("/api/data", (req, res) => {
  res.json({
    data: macroDataStore,
    hasFredKey: !!process.env.FRED_API_KEY,
    hasGeminiKey: !!process.env.GEMINI_API_KEY
  });
});

// 2. Fetch/Refresh real data from FRED if API key is present
app.post("/api/fred/refresh", async (req, res) => {
  const fredKey = process.env.FRED_API_KEY || req.body.fredApiKey;
  
  if (!fredKey) {
    return res.status(400).json({
      error: "FRED API Key is required. Please set FRED_API_KEY in your Secrets panel or provide it in the request."
    });
  }

  try {
    // Helper to fetch FRED series
    const fetchFredSeries = async (seriesId: string) => {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${fredKey}&file_type=json`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`FRED API returned status ${response.status} for series ${seriesId}`);
      }
      const json = await response.json();
      return json.observations || [];
    };

    // Fetch three key economic series from FRED
    // FEDFUNDS: Effective Federal Funds Rate (Monthly)
    // REAINTRATREARAT10Y: Natural Rate of Interest (Quarterly, HLW 10-Year model)
    // CPILFESL: Core CPI (Monthly, Index value)
    console.log("Fetching series from FRED...");
    const [fedfundsObs, rstarObs, coreCpiObs] = await Promise.all([
      fetchFredSeries("FEDFUNDS"),
      fetchFredSeries("REAINTRATREARAT10Y"),
      fetchFredSeries("CPILFESL")
    ]);

    // Parse and map FRED observations by YYYY-MM
    const effrMap = new Map<string, number>();
    const rstarMap = new Map<string, number>();
    const cpiIndexMap = new Map<string, number>();

    fedfundsObs.forEach((o: any) => {
      const val = parseFloat(o.value);
      if (!isNaN(val) && o.date) {
        effrMap.set(o.date.substring(0, 7), val);
      }
    });

    rstarObs.forEach((o: any) => {
      const val = parseFloat(o.value);
      if (!isNaN(val) && o.date) {
        rstarMap.set(o.date.substring(0, 7), val);
      }
    });

    coreCpiObs.forEach((o: any) => {
      const val = parseFloat(o.value);
      if (!isNaN(val) && o.date) {
        cpiIndexMap.set(o.date.substring(0, 7), val);
      }
    });

    // Calculate YoY Inflation and compile everything starting from 2000-01-01
    const combinedData: any[] = [];
    const keys = Array.from(effrMap.keys()).sort();
    
    // Find r* values with forward-fill for quarterly gaps
    let lastKnownRStar = 2.0; // Fallback starter

    keys.forEach((yearMonth) => {
      const dateParts = yearMonth.split("-");
      const year = parseInt(dateParts[0]);
      if (year < 2000 || year > 2026) return; // Keep standard bounds for comparison

      const fullDate = `${yearMonth}-01`;
      const effr = effrMap.get(yearMonth) ?? 0;

      // Forward-fill quarterly r*
      const rStarVal = rstarMap.get(yearMonth);
      if (rStarVal !== undefined) {
        lastKnownRStar = rStarVal;
      }
      const rStar = lastKnownRStar;

      // Calculate Core Inflation YoY: (CPI_t - CPI_{t-12}) / CPI_{t-12} * 100
      let coreInflation = 2.0; // Fallback
      const currentCPI = cpiIndexMap.get(yearMonth);
      
      const prevYear = year - 1;
      const prevYearMonth = `${prevYear}-${dateParts[1]}`;
      const prevCPI = cpiIndexMap.get(prevYearMonth);

      if (currentCPI !== undefined && prevCPI !== undefined && prevCPI > 0) {
        coreInflation = parseFloat(((currentCPI - prevCPI) / prevCPI * 100).toFixed(2));
      }

      const fisherNeutral = parseFloat((rStar + coreInflation).toFixed(2));
      const spread = parseFloat((effr - fisherNeutral).toFixed(2));
      
      let stance: 'Accommodative' | 'Restrictive' | 'Neutral' = 'Neutral';
      if (spread > 0.05) {
        stance = 'Restrictive';
      } else if (spread < -0.05) {
        stance = 'Accommodative';
      }

      combinedData.push({
        date: fullDate,
        effr,
        rStar,
        coreInflation,
        fisherNeutral,
        spread,
        stance
      });
    });

    if (combinedData.length > 0) {
      macroDataStore = combinedData;
      return res.json({
        success: true,
        message: `Successfully ingested and calculated ${combinedData.length} records from FRED API!`,
        data: combinedData
      });
    } else {
      throw new Error("No overlapping data found starting from 2000.");
    }

  } catch (error: any) {
    console.error("FRED Fetch Error:", error);
    res.status(500).json({
      error: "Failed to fetch/calculate indicators from FRED API",
      details: error.message
    });
  }
});

// 3. Reset/Restore Data
app.post("/api/data/reset", (req, res) => {
  macroDataStore = [...defaultHistoricalData];
  res.json({ success: true, message: "Restored built-in historical data successfully.", data: macroDataStore });
});

// 4. Update/Override single data point (for custom scenarios/interactivity)
app.post("/api/data/override", (req, res) => {
  const { date, effr, rStar, coreInflation } = req.body;
  if (!date) return res.status(400).json({ error: "Date is required." });

  const idx = macroDataStore.findIndex(d => d.date === date);
  
  const updatedPoint = {
    date,
    effr: parseFloat(effr),
    rStar: parseFloat(rStar),
    coreInflation: parseFloat(coreInflation),
    fisherNeutral: parseFloat((parseFloat(rStar) + parseFloat(coreInflation)).toFixed(2)),
    spread: parseFloat((parseFloat(effr) - (parseFloat(rStar) + parseFloat(coreInflation))).toFixed(2)),
    stance: 'Neutral' as 'Accommodative' | 'Restrictive' | 'Neutral'
  };

  if (updatedPoint.spread > 0.05) {
    updatedPoint.stance = 'Restrictive';
  } else if (updatedPoint.spread < -0.05) {
    updatedPoint.stance = 'Accommodative';
  }

  if (idx !== -1) {
    macroDataStore[idx] = updatedPoint;
  } else {
    macroDataStore.push(updatedPoint);
    macroDataStore.sort((a, b) => a.date.localeCompare(b.date));
  }

  res.json({ success: true, message: "Scenario updated.", data: macroDataStore });
});

// 5. Generate AI Macro Insights using Gemini
app.post("/api/gemini/analysis", async (req, res) => {
  const { selectedPoint, fullTrendSummary } = req.body;

  if (!ai) {
    return res.status(400).json({
      error: "Gemini API Key is not configured in Secrets panel."
    });
  }

  if (!selectedPoint) {
    return res.status(400).json({ error: "Selected data point is required for analysis." });
  }

  const prompt = `
You are an elite Federal Reserve macroeconomic expert and financial market strategist.
Provide an ultra-high-quality, highly professional, and visually engaging institutional-grade analysis of the Federal Reserve's monetary policy stance for the following snapshot:

--- SNAPSHOT ---
Date: ${selectedPoint.date}
Effective Federal Funds Rate (EFFR): ${selectedPoint.effr}%
Natural Rate of Interest (r*): ${selectedPoint.rStar}%
Core Inflation Rate: ${selectedPoint.coreInflation}%
Fisher Neutral Boundary (r* + Core Inflation): ${selectedPoint.fisherNeutral}%
Policy Spread (EFFR - Fisher Neutral): ${selectedPoint.spread}%
Fisher Stance Condition: ${selectedPoint.stance}

--- GLOBAL CONTEXT ---
${fullTrendSummary ? `Current trends highlight that out of ${fullTrendSummary.totalMonths} months on record, the Federal Reserve spent ${fullTrendSummary.restrictiveMonths} months in a Restrictive stance and ${fullTrendSummary.accommodativeMonths} months in an Accommodative stance.` : ''}

You MUST follow these strict formatting and density requirements to write a masterpiece of financial commentary:
1. Provide exactly 3 highly detailed, sophisticated paragraphs in the "analysis" field (approx. 350-450 words total).
2. Paragraph 1 MUST evaluate the policy alignment/divergence relative to the Fisher Neutral Boundary, placing the current stance in historical context (referencing the global months metrics) and commenting on central bank policy normalization and soft-landing trajectories.
3. Paragraph 2 MUST explicitly address the banking sector, Net Interest Margin (NIM) compression, commercial lending criteria, credit risk pricing, and yield curve dynamics.
4. Paragraph 3 MUST address the labor market equilibrium, wage-push inflation vs. productivity gains, and the anchoring of long-term inflation expectations.
5. Do NOT summarize or shorten this. Make it dense, articulate, and authoritative in Wall Street style.

Provide your expert response as a clean JSON object containing the following keys:
- "analysis": A highly comprehensive 3-paragraph macroeconomic review following the instructions above. Use newline characters (\n\n) between paragraphs.
- "sentiment": Exactly "hawkish", "dovish", or "neutral" based on the stance of the selected period.
- "recommendation": A short, highly sophisticated 1-sentence action recommendation for commercial bankers/investors during this specific stance.

Return ONLY the JSON. Do not include markdown code block characters like \`\`\`json or \`\`\`. Start your response directly with the opening curly brace.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const textContent = response.text || "{}";
    const cleanedText = textContent.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    try {
      const parsed = JSON.parse(cleanedText);
      res.json(parsed);
    } catch (parseErr) {
      console.warn("Failed to parse clean JSON, returning text wrapper", cleanedText);
      res.json({
        analysis: cleanedText,
        sentiment: selectedPoint.stance === 'Restrictive' ? 'hawkish' : (selectedPoint.stance === 'Accommodative' ? 'dovish' : 'neutral'),
        recommendation: "Monitor Federal Reserve communications closely for policy shifts."
      });
    }

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({
      error: "Failed to generate AI macroeconomic analysis",
      details: error.message
    });
  }
});

// Setup Vite Dev Server / Static Asset Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Fisher Stance Server running on http://localhost:${PORT}`);
  });
}

startServer();
