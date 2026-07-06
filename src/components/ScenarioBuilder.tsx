/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MacroDataPoint } from '../types';
import { Sliders, RefreshCw, CheckCircle } from 'lucide-react';

interface ScenarioBuilderProps {
  selectedPoint: MacroDataPoint;
  onOverride: (date: string, effr: number, rStar: number, coreInflation: number) => void;
  onReset: () => void;
}

export const ScenarioBuilder: React.FC<ScenarioBuilderProps> = ({
  selectedPoint,
  onOverride,
  onReset
}) => {
  const [effr, setEffr] = useState<number>(selectedPoint.effr);
  const [rStar, setRStar] = useState<number>(selectedPoint.rStar);
  const [coreInflation, setCoreInflation] = useState<number>(selectedPoint.coreInflation);
  const [applied, setApplied] = useState<boolean>(false);

  // Sync with selectedPoint changes
  useEffect(() => {
    setEffr(selectedPoint.effr);
    setRStar(selectedPoint.rStar);
    setCoreInflation(selectedPoint.coreInflation);
    setApplied(false);
  }, [selectedPoint]);

  const simFisherNeutral = parseFloat((rStar + coreInflation).toFixed(2));
  const simSpread = parseFloat((effr - simFisherNeutral).toFixed(2));
  
  let simStance: 'Accommodative' | 'Restrictive' | 'Neutral' = 'Neutral';
  if (simSpread > 0.05) {
    simStance = 'Restrictive';
  } else if (simSpread < -0.05) {
    simStance = 'Accommodative';
  }

  const handleApply = () => {
    onOverride(selectedPoint.date, effr, rStar, coreInflation);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  return (
    <div className="bg-white rounded border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-4">
        <div className="p-2 bg-slate-900 text-white rounded">
          <Sliders className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 font-sans uppercase tracking-tight">
            Interactive Scenario Builder
          </h3>
          <p className="text-[11px] text-slate-400 font-sans">
            Simulate alternative Federal Reserve policies for {new Date(selectedPoint.date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' })}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Slider 1: EFFR */}
        <div>
          <div className="flex justify-between items-center mb-1 text-xs">
            <span className="text-slate-600 font-bold text-[10px] uppercase tracking-wider">Effective Fed Funds (EFFR)</span>
            <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              {effr.toFixed(2)}%
            </span>
          </div>
          <input
            type="range"
            min="0.00"
            max="10.00"
            step="0.05"
            value={effr}
            onChange={(e) => {
              setEffr(parseFloat(e.target.value));
              setApplied(false);
            }}
            className="w-full h-1 bg-slate-100 rounded appearance-none cursor-pointer accent-slate-900"
          />
        </div>

        {/* Slider 2: rStar */}
        <div>
          <div className="flex justify-between items-center mb-1 text-xs">
            <span className="text-slate-600 font-bold text-[10px] uppercase tracking-wider">Natural Rate (r*)</span>
            <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              {rStar.toFixed(2)}%
            </span>
          </div>
          <input
            type="range"
            min="-2.00"
            max="5.00"
            step="0.05"
            value={rStar}
            onChange={(e) => {
              setRStar(parseFloat(e.target.value));
              setApplied(false);
            }}
            className="w-full h-1 bg-slate-100 rounded appearance-none cursor-pointer accent-slate-900"
          />
        </div>

        {/* Slider 3: Inflation */}
        <div>
          <div className="flex justify-between items-center mb-1 text-xs">
            <span className="text-slate-600 font-bold text-[10px] uppercase tracking-wider">Core Inflation Rate</span>
            <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              {coreInflation.toFixed(2)}%
            </span>
          </div>
          <input
            type="range"
            min="-1.00"
            max="10.00"
            step="0.05"
            value={coreInflation}
            onChange={(e) => {
              setCoreInflation(parseFloat(e.target.value));
              setApplied(false);
            }}
            className="w-full h-1 bg-slate-100 rounded appearance-none cursor-pointer accent-slate-900"
          />
        </div>

        {/* Live Simulation Output Summary */}
        <div className="bg-slate-50 rounded p-4 border border-slate-200 space-y-2 mt-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Hypothetical Fisher Matrix</span>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white rounded p-2 border border-slate-200">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Neutral</span>
              <span className="text-xs font-bold text-indigo-600 font-mono">{simFisherNeutral.toFixed(2)}%</span>
            </div>
            <div className="bg-white rounded p-2 border border-slate-200">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Spread</span>
              <span className={`text-xs font-bold font-mono ${simSpread > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {simSpread > 0 ? `+${simSpread.toFixed(2)}` : simSpread.toFixed(2)} pts
              </span>
            </div>
            <div className="bg-white rounded p-2 border border-slate-200">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Stance</span>
              <span className={`text-[10px] font-extrabold uppercase tracking-tight ${
                simStance === 'Restrictive' 
                  ? 'text-rose-600' 
                  : simStance === 'Accommodative' 
                    ? 'text-emerald-600' 
                    : 'text-slate-500'
              }`}>{simStance}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 pt-2">
          <button
            onClick={handleApply}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded border cursor-pointer transition-all uppercase tracking-wider ${
              applied
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-900 text-white border-transparent hover:bg-slate-800'
            }`}
          >
            {applied ? <CheckCircle className="w-4 h-4" /> : null}
            {applied ? 'Scenario Applied!' : 'Apply Scenario'}
          </button>
          
          <button
            onClick={onReset}
            className="px-3 py-2 text-xs font-bold rounded border border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
            title="Restore default data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
