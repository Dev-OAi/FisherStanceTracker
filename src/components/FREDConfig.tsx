/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Key, Cpu, HelpCircle } from 'lucide-react';

interface FREDConfigProps {
  hasFredKey: boolean;
  onRefreshSuccess: (data: any[]) => void;
}

export const FREDConfig: React.FC<FREDConfigProps> = ({
  hasFredKey,
  onRefreshSuccess
}) => {
  const [fredApiKey, setFredApiKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: ''
  });

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const response = await fetch('/api/fred/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fredApiKey })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch series.');
      }

      setStatus({
        type: 'success',
        message: data.message || 'FRED integration synchronized!'
      });
      onRefreshSuccess(data.data);
    } catch (err: any) {
      console.error(err);
      setStatus({
        type: 'error',
        message: err.message || 'Failed to contact FRED API. Verify your API Key.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-4">
        <div className="p-2 bg-slate-900 text-white rounded">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 font-sans uppercase tracking-tight">
            FRED® API Live Ingestion
          </h3>
          <p className="text-[11px] text-slate-400 font-sans">
            Fetch real-time monthly indicators from the St. Louis Federal Reserve database
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Status */}
        {hasFredKey ? (
          <div className="p-3 bg-emerald-50 rounded border border-emerald-200 flex items-center gap-2.5 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">FRED_API_KEY detected in server environment variables.</span>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center gap-2.5 text-slate-600 text-xs">
            <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Currently using high-fidelity historical baseline (2000–2026).</span>
          </div>
        )}

        {/* Sync Form */}
        <form onSubmit={handleSync} className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
              FRED API Key (or provide server variable)
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder={hasFredKey ? "••••••••••••••••••••••••" : "Paste your FRED API Key here..."}
                value={fredApiKey}
                onChange={(e) => setFredApiKey(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded focus:border-slate-900 focus:outline-hidden font-mono pr-8"
              />
              <Key className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs rounded cursor-pointer transition-colors flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Ingesting from FRED...' : 'Fetch and Refresh Real-Time Data'}
          </button>
        </form>

        {status.type && (
          <div className={`p-3 rounded border flex gap-2 text-xs ${
            status.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {status.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="leading-relaxed">{status.message}</span>
          </div>
        )}

        {/* Informative Series IDs list */}
        <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-500 space-y-1">
          <span className="font-bold text-slate-400 uppercase tracking-widest block mb-1">Underlying Series Tracked</span>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-500">Effective Federal Funds Rate:</span>
            <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-800">FEDFUNDS</code>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-500">Natural Rate of Interest (HLW 10Y):</span>
            <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-800">REAINTRATREARAT10Y</code>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-500">Core CPI (Inflation index):</span>
            <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-800">CPILFESL</code>
          </div>
        </div>

        {/* FRED Credentials Guide */}
        <div className="text-[10px] text-slate-400 leading-normal bg-slate-50/50 p-3 rounded border border-slate-200">
          <span className="font-bold text-slate-500 block mb-0.5 uppercase tracking-wider">How to obtain a FRED API Key:</span>
          1. Go to <a href="https://fred.stlouisfed.org/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">fred.stlouisfed.org</a> and create a free account.<br />
          2. Visit <span className="font-semibold text-slate-500">My Account &gt; API Keys</span> and request an API key.<br />
          3. Paste it above or declare <code className="bg-slate-100 px-1 rounded font-mono">FRED_API_KEY</code> in the Secrets panel.
        </div>
      </div>
    </div>
  );
};
