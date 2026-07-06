/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MacroDataPoint } from '../types';
import { Percent, TrendingUp, Compass, ShieldAlert, Sparkles } from 'lucide-react';

interface KPICardsProps {
  selectedPoint: MacroDataPoint;
}

export const KPICards: React.FC<KPICardsProps> = ({ selectedPoint }) => {
  const { effr, rStar, coreInflation, fisherNeutral, spread, stance } = selectedPoint;

  const isRestrictive = stance === 'Restrictive';
  const isAccommodative = stance === 'Accommodative';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. EFFR */}
      <div className="bg-white rounded border border-slate-200 p-4 shadow-sm hover:border-slate-400 transition-all duration-300">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">EFFR (Fed Funds)</span>
          <div className="p-1.5 bg-slate-100 text-slate-700 rounded">
            <Percent className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold text-slate-900 font-mono">{effr.toFixed(2)}%</span>
          <span className="text-[10px] text-slate-400 block mt-1 font-sans">Monthly Average Rate</span>
        </div>
      </div>

      {/* 2. Natural Rate r* */}
      <div className="bg-white rounded border border-slate-200 p-4 shadow-sm hover:border-slate-400 transition-all duration-300">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">Natural Rate (r*)</span>
          <div className="p-1.5 bg-slate-100 text-slate-700 rounded">
            <Compass className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold text-slate-900 font-mono">{rStar.toFixed(2)}%</span>
          <span className="text-[10px] text-slate-400 block mt-1 font-sans">HLW Neutral Model</span>
        </div>
      </div>

      {/* 3. Core Inflation */}
      <div className="bg-white rounded border border-slate-200 p-4 shadow-sm hover:border-slate-400 transition-all duration-300">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">Core Inflation</span>
          <div className="p-1.5 bg-slate-100 text-slate-700 rounded">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold text-slate-900 font-mono">{coreInflation.toFixed(2)}%</span>
          <span className="text-[10px] text-slate-400 block mt-1 font-sans">Core PCE YoY</span>
        </div>
      </div>

      {/* 4. Fisher Neutral Boundary (styled as a key accent block) */}
      <div className="bg-slate-900 text-white rounded p-4 shadow-md hover:bg-slate-800 transition-all duration-300">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest font-sans">Neutral Boundary</span>
          <div className="p-1.5 bg-white/10 text-white rounded">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold text-white font-mono">{fisherNeutral.toFixed(2)}%</span>
          <span className="text-[10px] opacity-70 block mt-1 font-sans italic">r* + Core Inflation</span>
        </div>
      </div>

      {/* 5. Policy Spread & Stance Badge */}
      <div className={`rounded border p-4 shadow-sm transition-all duration-300 ${
        isRestrictive 
          ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300 text-rose-950' 
          : isAccommodative 
            ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300 text-emerald-950' 
            : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-900'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest font-sans">Policy Stance</span>
          <div className={`p-1 rounded ${
            isRestrictive 
              ? 'bg-rose-500 text-white' 
              : isAccommodative 
                ? 'bg-emerald-500 text-white' 
                : 'bg-slate-400 text-white'
          }`}>
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold font-display tracking-tight uppercase">
              {stance}
            </span>
          </div>
          <span className="text-[10px] block mt-1 font-sans font-medium">
            Spread: <span className="font-mono font-bold">{spread > 0 ? `+${spread.toFixed(2)}` : spread.toFixed(2)} pts</span>
          </span>
        </div>
      </div>
    </div>
  );
};
