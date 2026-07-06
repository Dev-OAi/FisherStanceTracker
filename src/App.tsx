/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { MacroDataPoint, StanceSummary } from './types';
import { KPICards } from './components/KPICards';
import { FisherStanceChart } from './components/FisherStanceChart';
import { AICommentary } from './components/AICommentary';
import { ScenarioBuilder } from './components/ScenarioBuilder';
import { FREDConfig } from './components/FREDConfig';
import { Compass, Sparkles, TrendingUp, Sliders, Cpu, BarChart3, Info } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<MacroDataPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<MacroDataPoint | null>(null);
  const [hasFredKey, setHasFredKey] = useState<boolean>(false);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tab selector for the controller panel
  const [activeTab, setActiveTab] = useState<'insights' | 'scenario' | 'fred'>('insights');
  // Zoom selector for chart interval
  const [zoomRange, setZoomRange] = useState<'all' | 'post-covid' | 'gfc' | 'dotcom'>('all');

  // Load initial indicators from the backend Express endpoints
  const fetchIndicators = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/data');
      if (!response.ok) {
        throw new Error('Failed to retrieve macroeconomic indicators.');
      }
      const json = await response.json();
      setData(json.data);
      setHasFredKey(json.hasFredKey);
      setHasGeminiKey(json.hasGeminiKey);
      
      // Default selected point to the most recent month
      if (json.data && json.data.length > 0) {
        setSelectedPoint(json.data[json.data.length - 1]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to establish connection with the Express backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndicators();
  }, []);

  // Compute aggregated stats over the current dataset
  const getTrendSummary = (): StanceSummary | null => {
    if (!data || data.length === 0 || !selectedPoint) return null;

    let restrictive = 0;
    let accommodative = 0;
    let neutral = 0;

    data.forEach((p) => {
      if (p.stance === 'Restrictive') restrictive++;
      else if (p.stance === 'Accommodative') accommodative++;
      else neutral++;
    });

    return {
      currentDate: selectedPoint.date,
      currentEffr: selectedPoint.effr,
      currentRStar: selectedPoint.rStar,
      currentCoreInflation: selectedPoint.coreInflation,
      currentFisherNeutral: selectedPoint.fisherNeutral,
      currentSpread: selectedPoint.spread,
      currentStance: selectedPoint.stance,
      restrictiveMonths: restrictive,
      accommodativeMonths: accommodative,
      neutralMonths: neutral,
      totalMonths: data.length
    };
  };

  const trendSummary = getTrendSummary();

  // Apply single-point overrides for scenario simulation
  const handleOverride = async (date: string, effr: number, rStar: number, coreInflation: number) => {
    try {
      const response = await fetch('/api/data/override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date, effr, rStar, coreInflation })
      });

      const json = await response.json();
      if (response.ok) {
        setData(json.data);
        const updatedPoint = json.data.find((p: MacroDataPoint) => p.date === date);
        if (updatedPoint) {
          setSelectedPoint(updatedPoint);
        }
      }
    } catch (err) {
      console.error("Failed to apply override:", err);
    }
  };

  // Reset/restore default historical time series
  const handleReset = async () => {
    try {
      const response = await fetch('/api/data/reset', { method: 'POST' });
      const json = await response.json();
      if (response.ok) {
        setData(json.data);
        // Reset selected point to latest
        setSelectedPoint(json.data[json.data.length - 1]);
      }
    } catch (err) {
      console.error("Failed to reset dataset:", err);
    }
  };

  // Called when a live FRED sync concludes successfully
  const handleFredSyncSuccess = (updatedData: MacroDataPoint[]) => {
    setData(updatedData);
    if (updatedData.length > 0) {
      setSelectedPoint(updatedData[updatedData.length - 1]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans p-4">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-slate-900 animate-spin"></div>
          <span className="text-sm font-semibold text-slate-700 mt-4 block">Assembling Macro Dashboard...</span>
          <span className="text-xs text-slate-400 mt-1 block">Mapping Natural Interest Rates and Inflation Indexes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans p-6 text-center">
        <div className="bg-white p-6 rounded border border-red-200 max-w-md shadow-xs">
          <span className="text-red-600 font-bold text-lg block mb-2">Workspace Ingress Blocked</span>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">{error}</p>
          <button
            onClick={fetchIndicators}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded uppercase tracking-wider cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      {/* Header Banner */}
      <header className="bg-white border-b border-slate-200 py-5 px-6 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-950 text-white rounded">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 font-sans uppercase tracking-tight flex items-center gap-2">
                Fisher Stance Tracker
              </h1>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Programmatic Recreation of Shaded Macroeconomic Policy Settings (2000–2026)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            {/* Indicators summary badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 rounded text-xs font-bold uppercase tracking-wider">
              <BarChart3 className="w-3.5 h-3.5 text-slate-600" />
              <span>{data.length} Months Tracked</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 rounded text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Strategist Active</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 space-y-6">
        {/* KPI Cards section for currently locked date */}
        {selectedPoint && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 font-sans">
                Focused Snapshot: {new Date(selectedPoint.date + 'T00:00:00').toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  timeZone: 'UTC'
                })}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">DATE SNAPSHOT: {selectedPoint.date}</span>
            </div>
            <KPICards selectedPoint={selectedPoint} />
          </div>
        )}

        {/* Master SVG Chart container */}
        {selectedPoint && (
          <FisherStanceChart
            data={data}
            selectedPoint={selectedPoint}
            onSelectPoint={setSelectedPoint}
            zoomRange={zoomRange}
            setZoomRange={setZoomRange}
          />
        )}

        {/* Two-Column Bento Grid: Left is rich AI Commentary / Right is Controls Tabs */}
        {selectedPoint && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Column 1: AI Macro insights (2/3 width on desktop) */}
            <div className="lg:col-span-2">
              <AICommentary
                selectedPoint={selectedPoint}
                trendSummary={trendSummary}
                hasGeminiKey={hasGeminiKey}
                allData={data}
              />
            </div>

            {/* Column 2: Interactive Controls Tab Panel (1/3 width) */}
            <div className="space-y-4">
              {/* Tab Navigation buttons */}
              <div className="bg-white p-1 rounded border border-slate-200 flex gap-1">
                <button
                  onClick={() => setActiveTab('insights')}
                  className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-all uppercase tracking-wider cursor-pointer ${
                    activeTab === 'insights'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  Stats
                </button>
                <button
                  onClick={() => setActiveTab('scenario')}
                  className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-all uppercase tracking-wider cursor-pointer ${
                    activeTab === 'scenario'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Scenario
                </button>
                <button
                  onClick={() => setActiveTab('fred')}
                  className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-all uppercase tracking-wider cursor-pointer ${
                    activeTab === 'fred'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  FRED®
                </button>
              </div>

              {/* Tab Content 1: Historical distributions summary */}
              {activeTab === 'insights' && trendSummary && (
                <div className="bg-white rounded border border-slate-200 p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-sans uppercase tracking-tight">
                      Historical Distribution
                    </h3>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                      Stance ratios across the complete {trendSummary.totalMonths}-month dataset
                    </p>
                  </div>

                  <div className="space-y-3.5 pt-2">
                    {/* Restrictive (Green) */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                          <span className="w-2.5 h-2.5 bg-emerald-500 border border-emerald-600 rounded-sm"></span>
                          Restrictive Stance
                        </span>
                        <span className="font-mono font-bold text-slate-700 text-xs">
                          {trendSummary.restrictiveMonths} mos ({((trendSummary.restrictiveMonths / trendSummary.totalMonths) * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded overflow-hidden border border-slate-200">
                        <div
                          className="bg-emerald-500 h-2 rounded-sm transition-all duration-500"
                          style={{ width: `${(trendSummary.restrictiveMonths / trendSummary.totalMonths) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Accommodative (Red) */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                          <span className="w-2.5 h-2.5 bg-rose-500 border border-rose-600 rounded-sm"></span>
                          Accommodative Stance
                        </span>
                        <span className="font-mono font-bold text-slate-700 text-xs">
                          {trendSummary.accommodativeMonths} mos ({((trendSummary.accommodativeMonths / trendSummary.totalMonths) * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded overflow-hidden border border-slate-200">
                        <div
                          className="bg-rose-500 h-2 rounded-sm transition-all duration-500"
                          style={{ width: `${(trendSummary.accommodativeMonths / trendSummary.totalMonths) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Neutral (Gray) */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                          <span className="w-2.5 h-2.5 bg-slate-400 border border-slate-500 rounded-sm"></span>
                          Neutral Stance
                        </span>
                        <span className="font-mono font-bold text-slate-700 text-xs">
                          {trendSummary.neutralMonths} mos ({((trendSummary.neutralMonths / trendSummary.totalMonths) * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded overflow-hidden border border-slate-200">
                        <div
                          className="bg-slate-400 h-2 rounded-sm transition-all duration-500"
                          style={{ width: `${(trendSummary.neutralMonths / trendSummary.totalMonths) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 leading-normal border-t border-slate-100 pt-4 mt-2">
                    <span className="font-bold text-slate-500 block uppercase tracking-wider mb-1">Interpretation Guide</span>
                    When the Fed Funds Rate (EFFR) surpasses the Neutral Boundary (r* + Inflation), the Fed is in a <span className="text-emerald-600 font-bold">Restrictive</span> setting, seeking to tighten credit. When EFFR falls below, policy is <span className="text-rose-600 font-bold">Accommodative</span>, boosting liquidity.
                  </div>
                </div>
              )}

              {/* Tab Content 2: Sliders Scenario override */}
              {activeTab === 'scenario' && (
                <ScenarioBuilder
                  selectedPoint={selectedPoint}
                  onOverride={handleOverride}
                  onReset={handleReset}
                />
              )}

              {/* Tab Content 3: FRED API live sync form */}
              {activeTab === 'fred' && (
                <FREDConfig
                  hasFredKey={hasFredKey}
                  onRefreshSuccess={handleFredSyncSuccess}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
