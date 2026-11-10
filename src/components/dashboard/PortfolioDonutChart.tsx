"use client";

import React, { useState, useMemo } from "react";

interface PortfolioDonutChartProps {
  wallets: Record<string, number>;
  prices: Record<string, number>;
  totalEquity: number;
  netPnl: number;
  isLoading?: boolean;
}

const ASSET_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  USD: { fill: "#10B981", stroke: "#059669", label: "USD Cash" },
  BTC: { fill: "#F59E0B", stroke: "#D97706", label: "Bitcoin" },
  ETH: { fill: "#6366F1", stroke: "#4F46E5", label: "Ethereum" },
  SOL: { fill: "#A855F7", stroke: "#9333EA", label: "Solana" },
  DOGE: { fill: "#EAB308", stroke: "#CA8A04", label: "Dogecoin" },
};

export default function PortfolioDonutChart({
  wallets,
  prices,
  totalEquity,
  netPnl,
  isLoading = false,
}: PortfolioDonutChartProps) {
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);

  const radius = 44;
  const circumference = 2 * Math.PI * radius; // ~276.46

  // Compute breakdown percentages & exact non-overlapping clockwise offsets
  const slices = useMemo(() => {
    if (totalEquity <= 0) return [];

    const rawValues: Array<{ symbol: string; value: number; balance: number }> = [
      { symbol: "USD", value: wallets["USD"] || 0, balance: wallets["USD"] || 0 },
      { symbol: "BTC", value: (wallets["BTC"] || 0) * (prices["BTC"] || 84750), balance: wallets["BTC"] || 0 },
      { symbol: "ETH", value: (wallets["ETH"] || 0) * (prices["ETH"] || 2715), balance: wallets["ETH"] || 0 },
      { symbol: "SOL", value: (wallets["SOL"] || 0) * (prices["SOL"] || 119), balance: wallets["SOL"] || 0 },
      { symbol: "DOGE", value: (wallets["DOGE"] || 0) * (prices["DOGE"] || 0.0968), balance: wallets["DOGE"] || 0 },
    ];

    // Filter out negligible balances (< $0.01)
    const active = rawValues.filter((v) => v.value > 0.01);
    if (active.length === 0) {
      active.push({ symbol: "USD", value: totalEquity, balance: totalEquity });
    }

    let cumulativeLength = 0;

    return active.map((item) => {
      const pct = (item.value / totalEquity) * 100;
      const arcLength = (pct / 100) * circumference;
      // Slight 1.5px visual separator gap between slices if multiple assets
      const gap = active.length > 1 ? 1.5 : 0;
      const strokeDash = Math.max(0, arcLength - gap);
      const strokeOffset = -cumulativeLength;
      cumulativeLength += arcLength;

      return {
        ...item,
        percent: pct,
        strokeDash,
        strokeOffset,
        circumference,
        color: ASSET_COLORS[item.symbol] || { fill: "#8B5CF6", stroke: "#7C3AED", label: item.symbol },
      };
    });
  }, [wallets, prices, totalEquity, circumference]);

  const activeSlice = hoveredSymbol ? slices.find((s) => s.symbol === hoveredSymbol) : null;
  const isProfit = netPnl >= 0;

  return (
    <div className="elevated-glass-panel p-5 flex flex-col gap-4 border border-terminal-border/80 relative overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-terminal-border/80 pb-2.5">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-terminal-purple font-mono font-semibold">
            ASSET ALLOCATION
          </div>
          <div className="text-sm font-bold text-white mt-0.5 font-mono">PORTFOLIO DIVERSIFICATION</div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 bg-terminal-obsidian border border-terminal-border text-terminal-cyan font-bold">
          {slices.length} {slices.length === 1 ? "ASSET" : "ASSETS"}
        </span>
      </div>

      {isLoading ? (
        /* YouTube-Style Shimmer Skeleton */
        <div className="flex flex-col items-center justify-center p-6 gap-4 animate-pulse">
          <div className="w-36 h-36 rounded-full border-8 border-terminal-border/50 border-t-terminal-purple/60 animate-spin"></div>
          <div className="h-4 w-28 bg-terminal-border/60 rounded"></div>
          <div className="h-3 w-40 bg-terminal-border/40 rounded"></div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1">
          {/* SVG Donut Chart */}
          <div className="relative w-40 h-40 flex-shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
              {/* Background Base Ring */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="14"
              />

              {/* Seamless Clockwise Slices with Sharp Butt Caps */}
              {slices.map((slice) => {
                const isHovered = hoveredSymbol === slice.symbol;
                return (
                  <circle
                    key={slice.symbol}
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke={slice.color.fill}
                    strokeWidth={isHovered ? "17" : "13"}
                    strokeDasharray={`${slice.strokeDash} ${slice.circumference}`}
                    strokeDashoffset={slice.strokeOffset}
                    strokeLinecap="butt"
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredSymbol(slice.symbol)}
                    onMouseLeave={() => setHoveredSymbol(null)}
                  />
                );
              })}
            </svg>

            {/* Donut Center Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-1">
              <span className="text-[9px] uppercase tracking-wider text-terminal-muted font-mono">
                {activeSlice ? activeSlice.symbol : "TOTAL VALUE"}
              </span>
              <span className="text-xs sm:text-sm font-bold text-white font-mono tabular-data">
                $
                {activeSlice
                  ? activeSlice.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : totalEquity.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span
                className={`text-[9px] font-mono font-bold ${
                  activeSlice ? "text-terminal-cyan" : isProfit ? "text-terminal-emerald" : "text-terminal-red"
                }`}
              >
                {activeSlice
                  ? `${activeSlice.percent.toFixed(1)}% WEIGHT`
                  : `${isProfit ? "+" : ""}$${netPnl.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              </span>
            </div>
          </div>

          {/* Allocation Legend with Responsive Table Columns (Zero Truncation) */}
          <div className="flex flex-col gap-1.5 w-full font-mono text-xs overflow-hidden">
            {slices.map((slice) => {
              const isHovered = hoveredSymbol === slice.symbol;
              return (
                <div
                  key={slice.symbol}
                  onMouseEnter={() => setHoveredSymbol(slice.symbol)}
                  onMouseLeave={() => setHoveredSymbol(null)}
                  className={`flex items-center justify-between px-2 py-1 rounded transition-all cursor-pointer ${
                    isHovered
                      ? "bg-terminal-cardHover/90 border-l-2 border-l-terminal-purple shadow-neon-violet"
                      : "hover:bg-terminal-card/50"
                  }`}
                >
                  {/* Left: Indicator Dot & Symbol */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: slice.color.fill }}
                    />
                    <span className="font-bold text-terminal-text">{slice.symbol}</span>
                  </div>

                  {/* Right: Dollar Value & Clean Percentage */}
                  <div className="flex items-center gap-2 text-right tabular-data flex-shrink-0">
                    <span className="font-bold text-white text-[11px]">
                      ${slice.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-terminal-cyan font-bold w-12 text-right">
                      {slice.percent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
