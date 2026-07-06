/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MacroDataPoint, AIAnalysisResponse, StanceSummary } from '../types';
import { Brain, Sparkles, TrendingUp, HelpCircle, Flame, Snowflake, AlertCircle, RefreshCw, FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface AICommentaryProps {
  selectedPoint: MacroDataPoint;
  trendSummary: StanceSummary | null;
  hasGeminiKey: boolean;
  allData?: MacroDataPoint[];
}

export const AICommentary: React.FC<AICommentaryProps> = ({
  selectedPoint,
  trendSummary,
  hasGeminiKey,
  allData = []
}) => {
  const [analysis, setAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAIAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/gemini/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          selectedPoint,
          fullTrendSummary: trendSummary
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch policy review.');
      }
      setAnalysis(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Server connection error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasGeminiKey) {
      fetchAIAnalysis();
    } else {
      // Clean previous analysis when switching points and key is missing
      setAnalysis(null);
    }
  }, [selectedPoint, hasGeminiKey]);

  // Premium fallback analysis if key is not configured, to let the user see the visual beauty immediately
  const getFallbackAnalysis = (): AIAnalysisResponse => {
    const isRestrictive = selectedPoint.stance === 'Restrictive';
    const isAccommodative = selectedPoint.stance === 'Accommodative';
    
    const totalMonths = trendSummary?.totalMonths || 318;
    const restrictiveMonths = trendSummary?.restrictiveMonths || 64;
    const accommodativeMonths = trendSummary?.accommodativeMonths || 239;
    const neutralMonths = trendSummary?.neutralMonths || 15;

    const spreadBps = Math.round(selectedPoint.spread * 100);
    const formattedSpread = spreadBps > 0 ? `+${spreadBps} basis points` : `${spreadBps} basis points`;
    
    if (isRestrictive) {
      return {
        sentiment: 'hawkish',
        analysis: `During ${new Date(selectedPoint.date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' })}, the Federal Reserve maintained a restrictive policy stance with a policy spread of +${selectedPoint.spread.toFixed(2)}% (${formattedSpread}). When nominal rates remain elevated above the neutral rate (r* of ${selectedPoint.rStar.toFixed(2)}%) plus core inflation of ${selectedPoint.coreInflation.toFixed(2)}%, the central bank is actively seeking to cool down economic demand. This restricts credit access, heightens commercial banking lending criteria, and increases borrowing costs for corporations and consumers alike, with the goal of driving core inflation down toward the 2.0% target.\n\nFor commercial banks and financial intermediaries, a prolonged restrictive stance creates substantial headwinds, primarily driven by yield curve inversion and Net Interest Margin (NIM) compression. As deposit costs rise rapidly to compete for liquidity, the spread between loan yields and funding costs narrows, forcing banks to tighten credit standards and reduce loan origination volumes. Conversely, this restrictive environment allows banks to command premium yields on high-quality short-duration assets, shifting the credit focus from aggressive portfolio expansion to rigorous underwriting and capital preservation.\n\nIn the broader economy, labor markets face cooling demand as corporate debt service costs increase, limiting capital expenditures and hiring budgets. While this transition can trigger short-term credit stresses, it is a necessary mechanism to prevent a wage-price spiral and restore long-term purchasing power. The FOMC is likely to maintain forward guidance that prioritizes inflation defense over growth preservation, signaling that interest rates will remain 'higher for longer' until core indicators firmly return to the 2.0% objective.`,
        recommendation: "Under restrictive conditions, financial institutions should prioritize asset-liability liquidity, run rigorous stress tests on commercial real estate portfolios, and shift duration profiles to capture high short-end yields."
      };
    } else if (isAccommodative) {
      return {
        sentiment: 'dovish',
        analysis: `In ${new Date(selectedPoint.date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' })}, the Federal Reserve's stance was accommodative, featuring a negative policy spread of ${selectedPoint.spread.toFixed(2)}% (${formattedSpread}). Keeping the Effective Federal Funds Rate (EFFR) of ${selectedPoint.effr.toFixed(2)}% below the Fisher Neutral Boundary of ${selectedPoint.fisherNeutral.toFixed(2)}% acts as a powerful monetary accelerator, injecting substantial liquidity into the financial system to foster job creation, lower capital costs, and bolster economic activity. This accommodative posture represents the Fed's dominant historical operating regime, occupying ${accommodativeMonths} out of ${totalMonths} months in our historical tracker.\n\nFor commercial banking operations, an accommodative environment offers a dual-edged sword. On one hand, cheap and abundant liquidity drives strong credit demand, stimulates mortgage originations, and reduces default rates across consumer and commercial loan books. On the other hand, sustained ultra-low nominal rates compress absolute asset yields, limiting the profit potential of traditional net-interest-income models and prompting a 'search for yield' that can lead to excessive risk-taking and asset bubbles in credit and equity markets.\n\nIn the labor and goods markets, accommodative policies run the risk of overstimulating demand, resulting in tight labor markets where wage growth outstrips productivity gains. If sustained too long during periods of supply constraints, this accommodative spread can de-anchor inflation expectations, leading to persistent cost-push inflation. Central bank forward guidance during these cycles is typically characterized by reassurance of continued liquidity support, though market participants must remain highly alert to early signals of hawkish pivots.`,
        recommendation: "During accommodative cycles, bank strategists should expand loan books to capture high volume, focus on fee-income generation, and build capital reserves to cushion against future tightening phases."
      };
    } else {
      return {
        sentiment: 'neutral',
        analysis: `At an Effective Federal Funds Rate (EFFR) of ${selectedPoint.effr.toFixed(2)}% against a Fisher Neutral Boundary of ${selectedPoint.fisherNeutral.toFixed(2)}%, the Federal Reserve has established a near-perfect 'goldilocks' equilibrium. With a nominal policy spread of just ${formattedSpread}, the monetary authority has successfully aligned its policy stance with the neutral rate (r* of ${selectedPoint.rStar.toFixed(2)}%) plus target core inflation of ${selectedPoint.coreInflation.toFixed(2)}%. This pristine neutral posture represents a rare historical juncture, especially considering the Fed's historical bias toward accommodation (occupying ${accommodativeMonths} out of ${totalMonths} months on record). By operating at the Fisher Neutral boundary, the FOMC is signaling that the current policy rate neither stimulates nor restrains economic expansion, effectively cementing a successful soft-landing scenario.\n\nFor the banking sector and credit markets, this neutral backdrop alleviates the extreme pressures of yield curve inversion and Net Interest Margin (NIM) compression, allowing commercial banks to price credit risk with high fidelity. Loan books are expected to stabilize as credit creation flows at a sustainable pace, free from the distortions of aggressive tightening or the speculative bubbles typical of ultra-loose regimes. Concurrently, labor markets are poised to settle into a sustainable, full-employment equilibrium where wage growth is matched by productivity gains rather than driving cost-push inflation.\n\nUltimately, with core inflation perfectly anchored at the Fed's 2.0% target and inflation expectations firmly stabilized, the risk of a wage-price spiral has dissipated. The central bank's forward guidance will likely pivot from active policy adjustment to vigilant preservation of this equilibrium. Investors must recognize that while the immediate threat of aggressive hikes has receded, the hurdle for rate cuts remains high, locking the macroeconomy into a period of highly predictable, stable policy baseline.`,
        recommendation: "With the Fed firmly neutral and interest rate volatility suppressed, commercial bankers and investors should focus on optimizing asset-liability management, locking in yields on high-quality corporate credit, and pivoting toward selective underwriting in middle-market lending."
      };
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // A4 dimensions: 210 x 297 mm
    // Margin: 15mm (usable width = 180mm)
    
    // Header Highlight Bar
    doc.setFillColor(26, 54, 93); // #1a365d (deep navy)
    doc.rect(15, 12, 180, 1.5, 'F');
    
    // Main Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(26, 54, 93);
    doc.text('Fisher Stance Executive Briefing', 15, 21);
    
    // Subtitle & Date combined as requested
    const formattedDate = new Date(selectedPoint.date + 'T00:00:00').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      timeZone: 'UTC'
    });
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`MACROECONOMIC ANALYSIS & POLICY POSITION • ${formattedDate.toUpperCase()}`, 15, 26.5);

    // Header Separator Line
    doc.setDrawColor(26, 54, 93); // Deep navy line
    doc.setLineWidth(0.4);
    doc.line(15, 30.5, 195, 30.5);

    // --- KPI CARD STRIP (Image 1 style: 5 distinct white cards side-by-side) ---
    const startX = 15;
    const cardY = 34;
    const cardWidth = 34;
    const cardHeight = 21;
    const cardGap = 2.5;

    const kpis = [
      { 
        label: 'EFFR (FED FUNDS)', 
        val: `${selectedPoint.effr.toFixed(2)}%`, 
        desc: 'Monthly Average Rate',
        color: [26, 54, 93] // navy
      },
      { 
        label: 'NATURAL RATE (R*)', 
        val: `${selectedPoint.rStar.toFixed(2)}%`, 
        desc: 'HLW Neutral Model',
        color: [26, 54, 93] // navy
      },
      { 
        label: 'CORE INFLATION', 
        val: `${selectedPoint.coreInflation.toFixed(2)}%`, 
        desc: 'Core PCE YoY',
        color: [26, 54, 93] // navy
      },
      { 
        label: 'NEUTRAL BOUNDARY', 
        val: `${selectedPoint.fisherNeutral.toFixed(2)}%`, 
        desc: 'r* + Core Inflation',
        color: [26, 54, 93] // navy
      },
      { 
        label: 'POLICY STANCE', 
        val: selectedPoint.stance.toUpperCase(), 
        desc: `Spread: ${selectedPoint.spread > 0 ? '+' : ''}${selectedPoint.spread.toFixed(2)}%`,
        color: selectedPoint.stance === 'Restrictive' 
          ? [244, 63, 94] // rose-500
          : selectedPoint.stance === 'Accommodative'
          ? [16, 185, 129] // emerald-500
          : [100, 116, 139] // slate-500
      }
    ];

    kpis.forEach((kpi, index) => {
      const xPos = startX + index * (cardWidth + cardGap);
      
      // Draw white card background with very light border
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.setFillColor(255, 255, 255);
      doc.setLineWidth(0.15);
      doc.roundedRect(xPos, cardY, cardWidth, cardHeight, 1, 1, 'FD');
      
      // Top colored border highlights
      doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.rect(xPos, cardY, cardWidth, 1.2, 'F');
      
      // KPI Header Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(kpi.label, xPos + cardWidth / 2, cardY + 4.8, { align: 'center' });
      
      // KPI Value
      doc.setFont('helvetica', 'bold');
      const isStanceCard = index === 4;
      const valSize = isStanceCard && kpi.val.length > 10 ? 7.5 : isStanceCard ? 9.5 : 12;
      doc.setFontSize(valSize);
      
      if (isStanceCard) {
        doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      } else {
        doc.setTextColor(30, 41, 59); // Slate-800
      }
      doc.text(kpi.val, xPos + cardWidth / 2, cardY + 12.5, { align: 'center' });
      
      // KPI Description Subtext
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.0);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text(kpi.desc, xPos + cardWidth / 2, cardY + 17.5, { align: 'center' });
    });

    // --- VECTOR MINI-CHART CONTAINER (Y = 57.5 to 115.5) ---
    // CUSTOMIZATION TIP: To adjust the chart dimensions and positioning in the PDF, modify these parameters:
    // - chartYStart: The vertical starting position (Y) of the outer container box (default: 57.5)
    // - chartHeight: The total height of the outer container box (increased from 27 to 58 for twice the vertical space and axis space)
    // - plotYStart: The vertical starting position of the line plotting area (default: 64.5)
    // - plotHeight: The height of the active plotting grid (increased from 19 to 44 to make the lines twice as tall/detailed)
    // - plotXStart: The horizontal starting position (X) of the line plotting area (default: 25)
    // - plotWidth: The width of the line plotting area (default: 167)
    const chartYStart = 57.5;
    const chartHeight = 58;
    const plotYStart = 64.5;
    const plotHeight = 44;
    const plotXStart = 25;
    const plotWidth = 167;

    // Outer background box for chart
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, chartYStart, 180, chartHeight, 1.5, 1.5, 'FD');

    // Chart Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('3-COMPONENT FISHER STANCE: SHADED POLICY SETTINGS', 18, chartYStart + 4);

    const pts = allData && allData.length > 0 ? allData : [];
    if (pts.length > 0) {
      // Find min and max values dynamically for precise scale
      const allVals = pts.flatMap(d => [d.effr, d.rStar, d.coreInflation, d.fisherNeutral]);
      const minVal = Math.min(-0.5, Math.floor(Math.min(...allVals)));
      const maxVal = Math.max(7.5, Math.ceil(Math.max(...allVals)));

      const getYPos = (v: number) => {
        return (plotYStart + plotHeight) - ((v - minVal) / (maxVal - minVal)) * plotHeight;
      };

      // Draw horizontal gridlines & labels
      doc.setLineWidth(0.12);
      const gridSteps = [];
      for (let v = Math.max(0, Math.floor(minVal)); v <= maxVal; v += 2) {
        gridSteps.push(v);
      }
      if (gridSteps.length === 0 || gridSteps[0] !== 0) {
        gridSteps.unshift(0);
      }

      gridSteps.forEach((val) => {
        const yPos = getYPos(val);
        if (yPos >= plotYStart && yPos <= (plotYStart + plotHeight)) {
          // Label
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.2);
          doc.setTextColor(148, 163, 184);
          doc.text(`${val}%`, 21, yPos + 0.7, { align: 'right' });

          // Gridline
          doc.setDrawColor(241, 245, 249);
          doc.line(plotXStart, yPos, 192, yPos);
        }
      });

      // Shaded settings: continuous vertical micro-slices
      const sliceWidth = plotWidth / pts.length;
      for (let i = 0; i < pts.length; i++) {
        const xPos = plotXStart + (i / (pts.length - 1)) * plotWidth;
        const yEffr = getYPos(pts[i].effr);
        const yFisher = getYPos(pts[i].fisherNeutral);

        const yTop = Math.max(plotYStart, Math.min(yEffr, yFisher));
        const yBottom = Math.min(plotYStart + plotHeight, Math.max(yEffr, yFisher));

        if (pts[i].spread < 0) {
          doc.setDrawColor(209, 250, 229); // emerald-100 fill
        } else {
          doc.setDrawColor(254, 226, 226); // rose-100 fill
        }
        doc.setLineWidth(Math.max(0.35, sliceWidth * 1.05));
        doc.line(xPos, yTop, xPos, yBottom);
      }

      // Draw Series Lines (with vector segments)
      // Line 1: Core Inflation Rate (red, dotted)
      doc.setLineWidth(0.35);
      doc.setDrawColor(239, 68, 68); // Red
      doc.setLineDashPattern([0.5, 1.2], 0);
      for (let i = 0; i < pts.length - 1; i++) {
        const x1 = plotXStart + (i / (pts.length - 1)) * plotWidth;
        const x2 = plotXStart + ((i + 1) / (pts.length - 1)) * plotWidth;
        const y1 = getYPos(pts[i].coreInflation);
        const y2 = getYPos(pts[i+1].coreInflation);
        doc.line(x1, y1, x2, y2);
      }

      // Line 2: Natural Rate (r*) (amber, dashed)
      doc.setDrawColor(245, 158, 11); // Amber
      doc.setLineDashPattern([1.5, 1.5], 0);
      for (let i = 0; i < pts.length - 1; i++) {
        const x1 = plotXStart + (i / (pts.length - 1)) * plotWidth;
        const x2 = plotXStart + ((i + 1) / (pts.length - 1)) * plotWidth;
        const y1 = getYPos(pts[i].rStar);
        const y2 = getYPos(pts[i+1].rStar);
        doc.line(x1, y1, x2, y2);
      }

      // Line 3: Fisher Neutral Boundary (purple, solid)
      doc.setDrawColor(99, 102, 241); // Indigo/Purple
      doc.setLineDashPattern([], 0); // Solid
      doc.setLineWidth(0.45);
      for (let i = 0; i < pts.length - 1; i++) {
        const x1 = plotXStart + (i / (pts.length - 1)) * plotWidth;
        const x2 = plotXStart + ((i + 1) / (pts.length - 1)) * plotWidth;
        const y1 = getYPos(pts[i].fisherNeutral);
        const y2 = getYPos(pts[i+1].fisherNeutral);
        doc.line(x1, y1, x2, y2);
      }

      // Line 4: EFFR (navy, solid)
      doc.setDrawColor(26, 54, 93); // Dark Navy
      doc.setLineWidth(0.48);
      for (let i = 0; i < pts.length - 1; i++) {
        const x1 = plotXStart + (i / (pts.length - 1)) * plotWidth;
        const x2 = plotXStart + ((i + 1) / (pts.length - 1)) * plotWidth;
        const y1 = getYPos(pts[i].effr);
        const y2 = getYPos(pts[i+1].effr);
        doc.line(x1, y1, x2, y2);
      }

      // Dynamic Legend placement on the top right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4.8);
      
      const legendItems = [
        { label: 'EFFR', color: [26, 54, 93], style: 'solid' },
        { label: 'FISHER NEUTRAL', color: [99, 102, 241], style: 'solid' },
        { label: 'NATURAL RATE (R*)', color: [245, 158, 11], style: 'dashed' },
        { label: 'CORE INFLATION', color: [239, 68, 68], style: 'dotted' }
      ];

      let lx = 90;
      legendItems.forEach((item) => {
        doc.setLineWidth(0.45);
        doc.setDrawColor(item.color[0], item.color[1], item.color[2]);
        if (item.style === 'dashed') {
          doc.setLineDashPattern([1, 1], 0);
        } else if (item.style === 'dotted') {
          doc.setLineDashPattern([0.4, 0.8], 0);
        } else {
          doc.setLineDashPattern([], 0);
        }
        doc.line(lx, chartYStart + 3.5, lx + 4, chartYStart + 3.5);
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(item.label, lx + 5, chartYStart + 4.4);
        lx += item.label.length * 1.1 + 13;
      });

      // Active selected snapshot date vertical line
      const selIdx = pts.findIndex(p => p.date === selectedPoint.date);
      if (selIdx !== -1) {
        const xSel = plotXStart + (selIdx / (pts.length - 1)) * plotWidth;
        doc.setDrawColor(239, 68, 68); // Active red indicator
        doc.setLineWidth(0.3);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(xSel, plotYStart, xSel, plotYStart + plotHeight);
        doc.setLineDashPattern([], 0);

        // Draw active dot at EFFR
        const ySelEffr = getYPos(selectedPoint.effr);
        doc.setFillColor(239, 68, 68);
        doc.circle(xSel, ySelEffr, 0.75, 'F');

        // Draw small label tag at top
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5);
        doc.setTextColor(239, 68, 68);
        doc.text('SNAPSHOT ACTIVE', xSel, plotYStart - 1, { align: 'center' });
      }

      // --- DRAW X AXIS LINE & YEAR TICKS ---
      const xAxisY = plotYStart + plotHeight;
      doc.setDrawColor(148, 163, 184); // Slate-400
      doc.setLineWidth(0.25);
      doc.line(plotXStart, xAxisY, plotXStart + plotWidth, xAxisY);

      const xTicks: { label: string; x: number; index: number }[] = [];
      const targetYears = [2000, 2004, 2008, 2013, 2017, 2022, 2026];
      targetYears.forEach((ty) => {
        const idx = pts.findIndex(p => p.date.startsWith(`${ty}-`));
        if (idx !== -1) {
          xTicks.push({
            label: ty.toString(),
            x: plotXStart + (idx / (pts.length - 1)) * plotWidth,
            index: idx
          });
        }
      });

      // Fallback if target years are not found (e.g., custom date filter selection)
      if (xTicks.length < 3) {
        xTicks.length = 0; // Reset
        const tickCount = 6;
        const step = Math.max(1, Math.floor(pts.length / tickCount));
        for (let i = 0; i < pts.length; i += step) {
          const yearStr = pts[i].date.substring(0, 4);
          xTicks.push({
            label: yearStr,
            x: plotXStart + (i / (pts.length - 1)) * plotWidth,
            index: i
          });
        }
        const lastIdx = pts.length - 1;
        const lastYearStr = pts[lastIdx].date.substring(0, 4);
        if (xTicks[xTicks.length - 1].index < lastIdx - 2) {
          xTicks.push({
            label: lastYearStr,
            x: plotXStart + (lastIdx / (pts.length - 1)) * plotWidth,
            index: lastIdx
          });
        }
      }

      xTicks.forEach((tick) => {
        // Draw tick mark line (1.5mm long)
        doc.setDrawColor(203, 213, 225); // Slate-300
        doc.setLineWidth(0.2);
        doc.line(tick.x, xAxisY, tick.x, xAxisY + 1.5);

        // Draw Year text label (shifted down slightly)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.0);
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text(tick.label, tick.x, xAxisY + 3.8, { align: 'center' });
      });
    }

    // --- SECTIONS WITH VERTICAL ACCENT BARS (Image 1 style) ---
    const rawParagraphs = activeAnalysis.analysis.split('\n\n').filter(Boolean);
    const p1 = rawParagraphs[0] || "No analysis details provided.";
    const p2 = rawParagraphs[1] || "The commercial banking sector continues to price credit risk dynamically, balancing net interest margins with tightening underwriting standards under evolving Federal Reserve conditions.";
    const p3 = rawParagraphs[2] || "Labor markets are projected to stabilize in equilibrium as wage growth aligns with labor productivity, securing long-term price expectations.";

    // Since the chart height has been expanded to 58mm (ending at 115.5mm), we start the subsequent sections
    // at Y = 119.5mm (giving a comfortable 4mm spacing buffer).
    let currentY = 119.5;

    const renderBriefingSection = (title: string, paragraph: string) => {
      // Accent vertical blue line
      doc.setFillColor(26, 54, 93); // navy accent
      doc.rect(15, currentY, 1.2, 4.2, 'F');

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(26, 54, 93);
      doc.text(title, 17.5, currentY + 3.2);

      // Paragraph Text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(51, 65, 85); // Slate-700
      const lines = doc.splitTextToSize(paragraph, 180);
      doc.text(lines, 15, currentY + 7);

      currentY += 7 + (lines.length * 3.4) + 3.5;
    };

    // Render Section I
    renderBriefingSection('MONETARY POLICY NEUTRALITY & DYNAMICS', p1);

    // Render Section II
    renderBriefingSection('BANKING SECTOR IMPACT & CREDIT PRICING', p2);

    // Render Section III
    renderBriefingSection('MACROECONOMIC EQUILIBRIUM & MANDATE STATUS', p3);

    // --- SECTION IV: HISTORICAL BASELINE DISTRIBUTION (Image 1 style with 3 progress rows) ---
    doc.setFillColor(26, 54, 93);
    doc.rect(15, currentY, 1.2, 4.2, 'F');

    const totalMonths = trendSummary?.totalMonths || pts.length || 318;
    const restrictiveMonths = trendSummary?.restrictiveMonths || 75;
    const accommodativeMonths = trendSummary?.accommodativeMonths || 239;
    const neutralMonths = trendSummary?.neutralMonths || 4;

    const accPct = accommodativeMonths / totalMonths;
    const resPct = restrictiveMonths / totalMonths;
    const neuPct = neutralMonths / totalMonths;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(26, 54, 93);
    doc.text(`HISTORICAL BASELINE DISTRIBUTION (${totalMonths} MONTHS TRACKED)`, 17.5, currentY + 3.2);

    currentY += 6.5;

    const distributionRows = [
      {
        label: 'Accommodative Stance',
        countText: `${accommodativeMonths} mos (${(accPct * 100).toFixed(0)}%)`,
        pct: accPct,
        color: [16, 185, 129], // emerald-500
        labelColor: [5, 150, 105] // emerald-600
      },
      {
        label: 'Restrictive Stance',
        countText: `${restrictiveMonths} mos (${(resPct * 100).toFixed(0)}%)`,
        pct: resPct,
        color: [244, 63, 94], // rose-500
        labelColor: [225, 29, 72] // rose-600
      },
      {
        label: 'Neutral Stance',
        countText: `${neutralMonths} mos (${(neuPct * 100).toFixed(0)}%)`,
        pct: neuPct,
        color: [148, 163, 184], // slate-400
        labelColor: [100, 116, 139] // slate-500
      }
    ];

    distributionRows.forEach((row) => {
      // Label Column
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(row.labelColor[0], row.labelColor[1], row.labelColor[2]);
      doc.text(row.label, 17.5, currentY + 2);

      // Value Column
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(row.countText, 62, currentY + 2);

      // Progress bar Track
      doc.setFillColor(241, 245, 249); // slate-100
      doc.roundedRect(110, currentY - 0.5, 83, 2.5, 1.25, 1.25, 'F');

      // Filled Progress bar
      doc.setFillColor(row.color[0], row.color[1], row.color[2]);
      doc.roundedRect(110, currentY - 0.5, 83 * row.pct, 2.5, 1.25, 1.25, 'F');

      currentY += 5.5;
    });

    currentY += 4.5;

    // --- STRATEGIST RECOMMENDATION BOX ---
    const boxHeight = 20;
    
    // Light blue box background
    doc.setDrawColor(224, 242, 254); // sky-100
    doc.setFillColor(240, 249, 255); // sky-50
    doc.setLineWidth(0.15);
    doc.roundedRect(15, currentY, 180, boxHeight, 1, 1, 'FD');

    // Left thick accent bar
    doc.setFillColor(26, 54, 93); // Navy highlight
    doc.rect(15, currentY, 1.5, boxHeight, 'F');

    // Recommendation Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('STRATEGIST RECOMMENDATION', 19, currentY + 4.5);

    // Recommendation Body Text
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.8);
    doc.setTextColor(30, 41, 59); // Slate-800
    const recLines = doc.splitTextToSize(`"${activeAnalysis.recommendation}"`, 172);
    doc.text(recLines, 19, currentY + 9.5);

    // --- FOOTER SECTION ---
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.25);
    doc.line(15, 281, 195, 281);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Fisher Stance Tracker • Generated ${formattedDate}`, 15, 285.5);
    doc.text('Page 1 of 1', 195, 285.5, { align: 'right' });

    const safeFilename = `Fisher_Stance_Briefing_${selectedPoint.date}.pdf`;
    doc.save(safeFilename);
  };

  const activeAnalysis = analysis || getFallbackAnalysis();

  return (
    <div className="bg-white rounded border border-slate-200 p-6 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-900 text-white rounded">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-2">
              AI Macro Strategist Review
              <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-widest">Gemini Pro</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              Instant monetary policy analysis for {new Date(selectedPoint.date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' })}
            </p>
          </div>
        </div>

        {hasGeminiKey && (
          <button
            onClick={fetchAIAnalysis}
            disabled={loading}
            className="p-1.5 hover:bg-slate-50 rounded border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
            title="Regenerate Analysis"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-slate-900 animate-spin"></div>
            <Sparkles className="w-5 h-5 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <span className="text-xs font-semibold text-slate-700 mt-4 block">Consulting Gemini Analyst...</span>
          <span className="text-[10px] text-slate-400 mt-1 block">Analyzing Fisher stance, inflation spreads, and rates...</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between">
          <div>
            {/* Sentiment Header */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Stance Sentiment:</span>
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider ${
                activeAnalysis.sentiment === 'hawkish'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : activeAnalysis.sentiment === 'dovish'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-slate-50 text-slate-700 border border-slate-200'
              }`}>
                {activeAnalysis.sentiment === 'hawkish' && <Flame className="w-3.5 h-3.5" />}
                {activeAnalysis.sentiment === 'dovish' && <Snowflake className="w-3.5 h-3.5" />}
                {activeAnalysis.sentiment === 'neutral' && <HelpCircle className="w-3.5 h-3.5" />}
                <span>{activeAnalysis.sentiment}</span>
              </div>
            </div>

            {/* Analysis Text */}
            <div className="text-xs text-slate-600 leading-relaxed font-sans space-y-4 border-l-2 border-slate-300 pl-3 italic">
              {activeAnalysis.analysis.split('\n\n').filter(Boolean).map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>
          </div>

          {/* Key Recommendation */}
          <div className="mt-6 pt-4 border-t border-slate-200 bg-slate-50 -mx-6 -mb-6 p-6 rounded-b flex flex-col gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Strategist Recommendation</span>
              <p className="text-xs font-mono font-medium text-slate-800 leading-relaxed">
                &gt; {activeAnalysis.recommendation}
              </p>
            </div>
            
            <button
              onClick={handleDownloadPDF}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded transition-all uppercase tracking-wider cursor-pointer shadow-sm hover:shadow active:scale-[0.98] border border-slate-800"
              id="download-pdf-briefing"
              title="Download Executive Briefing"
            >
              <FileDown className="w-4 h-4 text-slate-300" />
              Download Executive Briefing
            </button>
          </div>
        </div>
      )}

      {/* Warning banner if Gemini key is missing */}
      {!hasGeminiKey && !loading && (
        <div className="mt-4 p-3 bg-slate-50 rounded border border-slate-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest block">System Sandbox Preset</span>
            <span className="text-[10px] text-slate-500 block leading-normal mt-0.5">
              Gemini API Key is not configured. Displaying high-fidelity static macroeconomic commentary. Update secrets to enable live FOMC model evaluations.
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 rounded border border-red-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span className="text-[10px] text-red-700 leading-normal">{error}</span>
        </div>
      )}
    </div>
  );
};
