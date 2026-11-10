"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { PricePoint } from "@/utils/prices";

interface PriceTrendChartProps {
  initialSymbol?: string;
  onSelectSymbol?: (symbol: string) => void;
}

export default function PriceTrendChart({
  initialSymbol = "BTC",
  onSelectSymbol,
}: PriceTrendChartProps) {
  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [points, setPoints] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Sync external symbol selection
  useEffect(() => {
    if (initialSymbol && initialSymbol !== symbol) {
      setSymbol(initialSymbol);
    }
  }, [initialSymbol]);

  // Fetch 8-point 24h history whenever symbol changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/prices/history?symbol=${symbol}`);
        const json = await res.json();
        if (isMounted && json.data && Array.isArray(json.data)) {
          setPoints(json.data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch 8-point price history:", err);
        if (isMounted) setLoading(false);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 60000); // 1 minute poll
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [symbol]);

  const handleSymbolChange = (sym: string) => {
    setSymbol(sym);
    if (onSelectSymbol) onSelectSymbol(sym);
  };

  // Compute SVG dimensions and path math
  const { minPrice, maxPrice, changePct, isGain, svgPath, areaPath, coords } = useMemo(() => {
    if (!points || points.length === 0) {
      return { minPrice: 0, maxPrice: 0, changePct: 0, isGain: true, svgPath: "", areaPath: "", coords: [] };
    }

    const prices = points.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const padding = range * 0.1; // 10% breathing room
    const effectiveMin = min - padding;
    const effectiveMax = max + padding;
    const effectiveRange = effectiveMax - effectiveMin;

    const width = 640;
    const height = 180;
    const margin = { top: 20, right: 25, bottom: 30, left: 25 };
    const chartW = width - margin.left - margin.right;
    const chartH = height - margin.top - margin.bottom;

    const firstPrice = points[0].price;
    const lastPrice = points[points.length - 1].price;
    const diff = lastPrice - firstPrice;
    const pct = firstPrice > 0 ? (diff / firstPrice) * 100 : 0;
    const gain = diff >= 0;

    const cList = points.map((pt, idx) => {
      const x = margin.left + (idx / (points.length - 1)) * chartW;
      const y = margin.top + chartH - ((pt.price - effectiveMin) / effectiveRange) * chartH;
      return { x, y, pt, idx };
    });

    // Generate smooth cubic bezier curve
    let d = "";
    cList.forEach((c, i) => {
      if (i === 0) {
        d += `M ${c.x} ${c.y}`;
      } else {
        const prev = cList[i - 1];
        const cp1x = prev.x + (c.x - prev.x) / 2;
        const cp1y = prev.y;
        const cp2x = prev.x + (c.x - prev.x) / 2;
        const cp2y = c.y;
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${c.x} ${c.y}`;
      }
    });

    const lastCoord = cList[cList.length - 1];
    const firstCoord = cList[0];
    const area = `${d} L ${lastCoord.x} ${margin.top + chartH} L ${firstCoord.x} ${margin.top + chartH} Z`;

    return {
      minPrice: min,
      maxPrice: max,
      changePct: pct,
      isGain: gain,
      svgPath: d,
      areaPath: area,
      coords: cList,
    };
  }, [points]);

  const activePoint = hoverIndex !== null && coords[hoverIndex] ? coords[hoverIndex] : null;

  return (
    <div className="elevated-glass-panel p-5 flex flex-col gap-4 relative overflow-hidden border border-terminal-border/80">
      {/* Header with Asset Switcher & 24h Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-terminal-border/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-terminal-cyan font-mono font-semibold">
              24-HOUR PRICE TIMELINE
            </span>
            <span className="text-[9px] px-1.5 py-0.2 bg-terminal-obsidian border border-terminal-border text-terminal-muted font-mono">
              8 SAMPLES · 3H CADENCE
            </span>
          </div>
          <div className="text-sm sm:text-base font-bold text-white mt-0.5 font-mono flex items-center gap-2">
            <span>{symbol}/USD SPOT TREND</span>
            {!loading && points.length > 0 && (
              <span
                className={`text-xs px-2 py-0.5 font-mono font-bold ${
                  isGain
                    ? "bg-terminal-greenMuted text-terminal-emerald border border-terminal-emerald/40"
                    : "bg-terminal-redMuted text-terminal-red border border-terminal-red/40"
                }`}
              >
                {isGain ? "+" : ""}
                {changePct.toFixed(2)}% (24H)
              </span>
            )}
          </div>
        </div>

        {/* Coin Selector Pills */}
        <div className="flex items-center gap-1.5 bg-terminal-obsidian/80 border border-terminal-border p-1">
          {["BTC", "ETH", "SOL", "DOGE"].map((sym) => {
            const isCurrent = symbol === sym;
            return (
              <button
                key={sym}
                onClick={() => handleSymbolChange(sym)}
                className={`px-3 py-1 text-xs font-mono font-bold transition-all ${
                  isCurrent
                    ? "bg-terminal-purple text-white shadow-neon-violet"
                    : "text-terminal-muted hover:text-white hover:bg-terminal-card"
                }`}
              >
                {sym}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chart Canvas / YouTube-Style Shimmer Skeleton */}
      {loading ? (
        <div className="h-44 w-full flex flex-col justify-between p-4 bg-terminal-obsidian/40 border border-terminal-border/40 relative overflow-hidden animate-pulse">
          {/* Top shimmer bars */}
          <div className="flex justify-between items-center">
            <div className="h-4 w-32 bg-terminal-border/60 rounded"></div>
            <div className="h-4 w-24 bg-terminal-border/60 rounded"></div>
          </div>
          {/* Center mock wave skeleton */}
          <div className="flex items-end justify-between h-24 gap-2 pt-4">
            {[40, 65, 50, 85, 60, 75, 90, 80].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className="w-full bg-gradient-to-t from-terminal-border/20 to-terminal-border/60 rounded-t"
              />
            ))}
          </div>
          {/* Bottom time ticks skeleton */}
          <div className="flex justify-between pt-2 border-t border-terminal-border/30">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-2.5 w-8 bg-terminal-border/40 rounded"></div>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative w-full overflow-hidden select-none bg-terminal-obsidian/30 border border-terminal-border/40 p-2">
          {/* SVG Chart */}
          <svg
            viewBox="0 0 640 180"
            className="w-full h-44 overflow-visible"
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              {/* Gradient for Bullish Area */}
              <linearGradient id="bullAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
              {/* Gradient for Bearish Area */}
              <linearGradient id="bearAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Subtle Grid Lines */}
            <line x1="25" y1="20" x2="615" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            <line x1="25" y1="85" x2="615" y2="85" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            <line x1="25" y1="150" x2="615" y2="150" stroke="rgba(255,255,255,0.08)" />

            {/* Area Fill */}
            <path
              d={areaPath}
              fill={isGain ? "url(#bullAreaGrad)" : "url(#bearAreaGrad)"}
              className="transition-all duration-300"
            />

            {/* Main Trend Line */}
            <path
              d={svgPath}
              fill="none"
              stroke={isGain ? "#10B981" : "#F43F5E"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />

            {/* 8 Discrete Data Points on Curve */}
            {coords.map((c) => {
              const isHovered = hoverIndex === c.idx;
              return (
                <g key={c.idx} className="cursor-pointer">
                  {/* Invisible hit-target circle for easy mouse touch */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="14"
                    fill="transparent"
                    onMouseEnter={() => setHoverIndex(c.idx)}
                  />

                  {/* Pulsing ring on hover */}
                  {isHovered && (
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r="7"
                      fill="none"
                      stroke={isGain ? "#10B981" : "#F43F5E"}
                      strokeWidth="2"
                      className="animate-ping opacity-75"
                    />
                  )}

                  {/* Core vertex dot */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={isHovered ? "5" : "3.5"}
                    fill={isHovered ? "#FFFFFF" : isGain ? "#10B981" : "#F43F5E"}
                    stroke="#0A0814"
                    strokeWidth="1.5"
                    className="transition-all duration-150"
                  />

                  {/* Vertical Guideline on Hover */}
                  {isHovered && (
                    <line
                      x1={c.x}
                      y1="20"
                      x2={c.x}
                      y2="150"
                      stroke="rgba(255,255,255,0.3)"
                      strokeDasharray="2 2"
                      strokeWidth="1"
                    />
                  )}

                  {/* Time label below x-axis */}
                  <text
                    x={c.x}
                    y="166"
                    textAnchor="middle"
                    className="text-[9px] fill-terminal-muted font-mono select-none"
                  >
                    {c.pt.time.replace(" UTC", "")}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Floating Tooltip */}
          {activePoint && (
            <div
              style={{
                left: `${(activePoint.x / 640) * 100}%`,
                top: `${(activePoint.y / 180) * 100}%`,
                transform: `translate(-50%, ${activePoint.y < 70 ? "15px" : "-115%"})`,
              }}
              className="absolute pointer-events-none z-20 elevated-glass-card px-2.5 py-1.5 border border-terminal-purple/70 shadow-neon-violet flex flex-col gap-0.5 whitespace-nowrap"
            >
              <div className="text-[10px] text-terminal-cyan font-mono font-semibold">
                🕒 {activePoint.pt.time}
              </div>
              <div className="text-xs font-bold text-white font-mono tabular-data">
                ${activePoint.pt.price.toLocaleString("en-US", { minimumFractionDigits: symbol === "DOGE" ? 4 : 2 })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Range Footnote */}
      <div className="flex flex-wrap items-center justify-between text-[10px] text-terminal-muted font-mono pt-1">
        <div>
          <span>24H LOW: </span>
          <span className="text-terminal-text tabular-data">
            ${minPrice.toLocaleString("en-US", { minimumFractionDigits: symbol === "DOGE" ? 4 : 2 })}
          </span>
          <span className="mx-2">·</span>
          <span>24H HIGH: </span>
          <span className="text-terminal-text tabular-data">
            ${maxPrice.toLocaleString("en-US", { minimumFractionDigits: symbol === "DOGE" ? 4 : 2 })}
          </span>
        </div>
        <div className="text-terminal-purple font-semibold">
          HOVER POINTS TO INSPECT EXACT 3-HOUR PRICE LEVELS
        </div>
      </div>
    </div>
  );
}
