/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { MacroDataPoint } from '../types';

interface FisherStanceChartProps {
  data: MacroDataPoint[];
  selectedPoint: MacroDataPoint;
  onSelectPoint: (point: MacroDataPoint) => void;
  zoomRange: 'all' | 'post-covid' | 'gfc' | 'dotcom';
  setZoomRange: (range: 'all' | 'post-covid' | 'gfc' | 'dotcom') => void;
}

export const FisherStanceChart: React.FC<FisherStanceChartProps> = ({
  data,
  selectedPoint,
  onSelectPoint,
  zoomRange,
  setZoomRange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 420 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Resize handler using ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      // Maintain a perfect 16:9 or similar ratio
      setDimensions({
        width: Math.max(width, 300),
        height: Math.min(Math.max(width * 0.45, 280), 450)
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter data based on selected zoom range
  const getFilteredData = (): { filtered: MacroDataPoint[]; originalIndices: number[] } => {
    const originalWithIdx = data.map((d, index) => ({ d, index }));
    let result = originalWithIdx;

    if (zoomRange === 'post-covid') {
      result = originalWithIdx.filter(item => {
        const year = parseInt(item.d.date.substring(0, 4));
        return year >= 2020;
      });
    } else if (zoomRange === 'gfc') {
      result = originalWithIdx.filter(item => {
        const year = parseInt(item.d.date.substring(0, 4));
        return year >= 2007 && year <= 2013;
      });
    } else if (zoomRange === 'dotcom') {
      result = originalWithIdx.filter(item => {
        const year = parseInt(item.d.date.substring(0, 4));
        return year >= 2000 && year <= 2004;
      });
    }

    return {
      filtered: result.map(item => item.d),
      originalIndices: result.map(item => item.index)
    };
  };

  const { filtered, originalIndices } = getFilteredData();

  const padding = { top: 25, right: 30, bottom: 40, left: 45 };
  const { width, height } = dimensions;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Min and Max values for scaling
  const yMin = 0;
  const yMax = 7.0; // Captures rate peaks at 6.5%

  // Scales values to SVG space
  const getX = (index: number, total: number) => {
    if (total <= 1) return padding.left;
    return padding.left + (index / (total - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    return padding.top + chartHeight - ((clamped - yMin) / (yMax - yMin)) * chartHeight;
  };

  // Build the shaded areas between EFFR and Fisher Neutral
  // Accomplished by making narrow polygons between consecutive points
  const renderShadedAreas = () => {
    const polygons: React.ReactNode[] = [];
    if (filtered.length < 2) return null;

    for (let i = 0; i < filtered.length - 1; i++) {
      const p1 = filtered[i];
      const p2 = filtered[i + 1];

      const x1 = getX(i, filtered.length);
      const x2 = getX(i + 1, filtered.length);

      const yEffr1 = getY(p1.effr);
      const yEffr2 = getY(p2.effr);

      const yNeutral1 = getY(p1.fisherNeutral);
      const yNeutral2 = getY(p2.fisherNeutral);

      const d1 = p1.effr - p1.fisherNeutral;
      const d2 = p2.effr - p2.fisherNeutral;

      if (d1 * d2 >= 0) {
        // No crossing in this strip
        const isRestrictive = d1 > 0;
        const colorClass = isRestrictive
          ? 'fill-rose-100/50 stroke-none'
          : 'fill-emerald-100/50 stroke-none';

        const pointsStr = `${x1},${yEffr1} ${x2},${yEffr2} ${x2},${yNeutral2} ${x1},${yNeutral1}`;
        polygons.push(
          <polygon
            key={`shade-normal-${i}`}
            points={pointsStr}
            className={colorClass}
          />
        );
      } else {
        // Line crossing occurs inside this segment!
        // Calculate crossing fraction f
        const absD1 = Math.abs(d1);
        const absD2 = Math.abs(d2);
        const f = absD1 / (absD1 + absD2);

        // Interpolate the exact crossing coordinates
        const xMid = x1 + f * (x2 - x1);
        const yMid = yEffr1 + f * (yEffr2 - yEffr1); // equivalent to yNeutral1 + f * (yNeutral2 - yNeutral1)

        // Draw Left triangle/polygon
        const isLeftRestrictive = d1 > 0;
        const leftColor = isLeftRestrictive ? 'fill-rose-100/50' : 'fill-emerald-100/50';
        const leftPoints = `${x1},${yEffr1} ${xMid},${yMid} ${x1},${yNeutral1}`;
        polygons.push(
          <polygon
            key={`shade-cross-left-${i}`}
            points={leftPoints}
            className={`${leftColor} stroke-none`}
          />
        );

        // Draw Right triangle/polygon
        const isRightRestrictive = d2 > 0;
        const rightColor = isRightRestrictive ? 'fill-rose-100/50' : 'fill-emerald-100/50';
        const rightPoints = `${xMid},${yMid} ${x2},${yEffr2} ${x2},${yNeutral2}`;
        polygons.push(
          <polygon
            key={`shade-cross-right-${i}`}
            points={rightPoints}
            className={`${rightColor} stroke-none`}
          />
        );
      }
    }

    return polygons;
  };

  // Build line path definitions
  const getLinePath = (getValue: (d: MacroDataPoint) => number) => {
    if (filtered.length === 0) return '';
    return filtered
      .map((d, index) => {
        const x = getX(index, filtered.length);
        const y = getY(getValue(d));
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  // Handle click on chart to select macro date
  const handleChartClick = (index: number) => {
    if (index >= 0 && index < filtered.length) {
      onSelectPoint(filtered[index]);
    }
  };

  // Grid Ticks
  const yTicks = [0, 1, 2, 3, 4, 5, 6, 7];
  
  // Calculate horizontal dates labels to display
  const getXTicks = () => {
    const ticks: { label: string; x: number; index: number }[] = [];
    if (filtered.length === 0) return ticks;

    // Pick 5-6 evenly spaced indexes to show date labels
    const count = width > 600 ? 6 : 4;
    const step = Math.max(1, Math.floor(filtered.length / count));

    for (let i = 0; i < filtered.length; i += step) {
      const date = filtered[i].date;
      const year = date.substring(0, 4);
      ticks.push({
        label: year,
        x: getX(i, filtered.length),
        index: i
      });
    }

    // Always include the last year label if not already close
    const lastIdx = filtered.length - 1;
    const lastYear = filtered[lastIdx].date.substring(0, 4);
    if (ticks.length > 0 && lastIdx - ticks[ticks.length - 1].index > step / 2) {
      ticks.push({
        label: lastYear,
        x: getX(lastIdx, filtered.length),
        index: lastIdx
      });
    }

    return ticks;
  };

  // Trace hover index based on cursor movement
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const svgEl = e.currentTarget;
    const rect = svgEl.getBoundingClientRect();
    const clientX = e.clientX - rect.left;

    if (clientX < padding.left || clientX > width - padding.right) {
      setHoverIndex(null);
      return;
    }

    // Find closest index
    const relativeX = clientX - padding.left;
    const pct = relativeX / chartWidth;
    const exactIndex = Math.round(pct * (filtered.length - 1));
    const clampedIndex = Math.max(0, Math.min(filtered.length - 1, exactIndex));
    setHoverIndex(clampedIndex);
  };

  // Determine active displayed point (either hover or selected locked point)
  const activeFilteredIdx = hoverIndex !== null 
    ? hoverIndex 
    : filtered.findIndex(d => d.date === selectedPoint.date);
  
  const activePoint = activeFilteredIdx !== -1 ? filtered[activeFilteredIdx] : selectedPoint;
  const activeX = activeFilteredIdx !== -1 ? getX(activeFilteredIdx, filtered.length) : padding.left;

  return (
    <div className="bg-white rounded border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 font-display">
            3-Component Fisher Stance: Shaded Policy Settings
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Compare Effective Fed Funds Rate (EFFR) against Neutral Boundary (r* + Inflation). Click a date to inspect or analyze.
          </p>
        </div>

        {/* Zoom Range Selectors */}
        <div className="flex bg-slate-50 p-1 rounded border border-slate-200 self-start sm:self-center">
          <button
            onClick={() => setZoomRange('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
              zoomRange === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Max
          </button>
          <button
            onClick={() => setZoomRange('post-covid')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
              zoomRange === 'post-covid'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Post-COVID
          </button>
          <button
            onClick={() => setZoomRange('gfc')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
              zoomRange === 'gfc'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            GFC Era
          </button>
          <button
            onClick={() => setZoomRange('dotcom')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
              zoomRange === 'dotcom'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Dot-Com
          </button>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div ref={containerRef} className="relative w-full overflow-hidden select-none">
        <svg
          width={width}
          height={height}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
          onClick={() => activeFilteredIdx !== -1 && handleChartClick(activeFilteredIdx)}
          className="cursor-pointer"
        >
          {/* Definitions for Gradients */}
          <defs>
            <linearGradient id="grid-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={`y-grid-${tick}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-slate-400"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          {/* Render Area Shading */}
          {renderShadedAreas()}

          {/* Line: Natural Rate r* (Dashed Orange) */}
          <path
            d={getLinePath(d => d.rStar)}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeDasharray="5 4"
            className="transition-all duration-300 animate-fade-in"
          />

          {/* Line: Core Inflation (Dotted Red) */}
          <path
            d={getLinePath(d => d.coreInflation)}
            fill="none"
            stroke="#EF4444"
            strokeWidth="2.2"
            strokeDasharray="2 3"
            className="transition-all duration-300"
          />

          {/* Line: Fisher Neutral Boundary (Solid Purple/Indigo in Geometric Balance) */}
          <path
            d={getLinePath(d => d.fisherNeutral)}
            fill="none"
            stroke="#6366F1"
            strokeWidth="2"
            className="transition-all duration-300"
          />

          {/* Line: EFFR (Solid Dark Slate in Geometric Balance) */}
          <path
            d={getLinePath(d => d.effr)}
            fill="none"
            stroke="#1E293B"
            strokeWidth="2.5"
            className="transition-all duration-300"
          />

          {/* Baseline Zero */}
          <line
            x1={padding.left}
            y1={getY(0)}
            x2={width - padding.right}
            y2={getY(0)}
            stroke="#94A3B8"
            strokeWidth="1.2"
          />

          {/* X Axis ticks */}
          {getXTicks().map((tick, i) => (
            <g key={`x-tick-${i}`}>
              <line
                x1={tick.x}
                y1={getY(0)}
                x2={tick.x}
                y2={getY(0) + 5}
                stroke="#CBD5E1"
                strokeWidth="1"
              />
              <text
                x={tick.x}
                y={getY(0) + 18}
                textAnchor="middle"
                className="text-[10px] font-mono fill-slate-500 font-semibold"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Vertical scrub guide bar */}
          {activeFilteredIdx !== -1 && (
            <g>
              <line
                x1={activeX}
                y1={padding.top}
                x2={activeX}
                y2={height - padding.bottom}
                stroke="#475569"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              {/* Plot anchor circles for each indicator */}
              <circle
                cx={activeX}
                cy={getY(activePoint.effr)}
                r="4.5"
                className="fill-slate-800 stroke-white stroke-2"
              />
              <circle
                cx={activeX}
                cy={getY(activePoint.fisherNeutral)}
                r="4.5"
                className="fill-indigo-600 stroke-white stroke-2"
              />
              <circle
                cx={activeX}
                cy={getY(activePoint.rStar)}
                r="4"
                className="fill-amber-500 stroke-white stroke-2"
              />
              <circle
                cx={activeX}
                cy={getY(activePoint.coreInflation)}
                r="4"
                className="fill-red-500 stroke-white stroke-2"
              />
            </g>
          )}
        </svg>

        {/* Hover / Selection details tooltip */}
        {activePoint && (
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-[55px] bg-slate-900/95 backdrop-blur-xs text-white p-3 rounded text-xs shadow-lg flex flex-wrap gap-x-4 gap-y-1.5 border border-slate-800"
          >
            <div className="font-semibold text-slate-200">
              {new Date(activePoint.date + 'T00:00:00').toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                timeZone: 'UTC'
              })}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-800 border border-slate-600 inline-block"></span>
              <span className="text-slate-400">EFFR:</span>
              <span className="font-mono font-bold text-white">{activePoint.effr.toFixed(2)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500 inline-block"></span>
              <span className="text-slate-400">Neutral Boundary:</span>
              <span className="font-mono font-bold text-indigo-200">{activePoint.fisherNeutral.toFixed(2)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block"></span>
              <span className="text-slate-400">r*:</span>
              <span className="font-mono font-bold text-amber-200">{activePoint.rStar.toFixed(2)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block"></span>
              <span className="text-slate-400">Inflation:</span>
              <span className="font-mono font-bold text-rose-200">{activePoint.coreInflation.toFixed(2)}%</span>
            </div>
            <div className="flex items-center gap-1.5 border-l border-slate-700 pl-4">
              <span className="text-slate-400">Spread:</span>
              <span className={`font-mono font-bold ${activePoint.spread > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {activePoint.spread > 0 ? `+${activePoint.spread.toFixed(2)}` : activePoint.spread.toFixed(2)} pts
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend & Details */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-3 justify-center text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-slate-950"></div>
          <span className="text-slate-600 font-semibold font-sans">Fed Funds Rate (EFFR)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 border-t-2 border-dashed border-amber-500"></div>
          <span className="text-slate-600 font-semibold font-sans">Natural Rate (r*)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 border-t-2 border-dotted border-rose-500"></div>
          <span className="text-slate-600 font-semibold font-sans">Core Inflation Rate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-indigo-500"></div>
          <span className="text-slate-600 font-bold font-sans">Fisher Neutral Boundary (r* + Inflation)</span>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <span className="inline-block w-3 h-3 bg-rose-400/20 border border-rose-500 rounded-xs"></span>
          <span className="text-slate-500 font-semibold">Restrictive Stance</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-emerald-400/20 border border-emerald-500 rounded-xs"></span>
          <span className="text-slate-500 font-semibold">Accommodative Stance</span>
        </div>
      </div>
    </div>
  );
};
