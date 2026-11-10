"use client";

import React, { useEffect } from "react";

export interface TradeReceiptData {
  title: string;
  type: "MARKET_FILLED" | "LIMIT_STAGED" | "LIMIT_FILLED" | "POSITION_CLOSED" | "LIMIT_CANCELLED";
  action: "BUY" | "SELL";
  assetSymbol: string;
  amount: number;
  price: number;
  totalValue: number;
  remainingCash?: number;
  txHash?: string;
  timestamp?: string;
  message?: string;
}

interface TradeReceiptModalProps {
  receipt: TradeReceiptData | null;
  onClose: () => void;
}

export default function TradeReceiptModal({ receipt, onClose }: TradeReceiptModalProps) {
  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (receipt) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [receipt, onClose]);

  if (!receipt) return null;

  const isCancelled = receipt.type === "LIMIT_CANCELLED";
  const isBuy = receipt.action === "BUY";
  const isLimitStaged = receipt.type === "LIMIT_STAGED";
  const isLimitFilled = receipt.type === "LIMIT_FILLED";
  const isClose = receipt.type === "POSITION_CLOSED";

  const glowColor = isCancelled
    ? "border-terminal-muted/80 shadow-lg"
    : isLimitStaged
    ? "border-terminal-cyan shadow-neon-cyan"
    : isBuy
    ? "border-terminal-emerald shadow-neon-emerald"
    : "border-terminal-red shadow-neon-red";

  const badgeColor = isCancelled
    ? "bg-terminal-obsidian text-terminal-muted border border-terminal-muted"
    : isLimitStaged
    ? "bg-terminal-obsidian text-terminal-cyan border border-terminal-cyan"
    : isBuy
    ? "bg-terminal-greenMuted text-terminal-emerald border border-terminal-emerald"
    : "bg-terminal-redMuted text-terminal-red border border-terminal-red";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-terminal-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Click-away backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Glass Receipt Card */}
      <div
        className={`relative z-10 w-full max-w-lg elevated-glass-panel p-6 sm:p-8 flex flex-col gap-5 border-2 ${glowColor} bg-terminal-obsidian/95 text-white font-mono select-none transform transition-all scale-100 animate-in zoom-in-95 duration-200`}
      >
        {/* Top Header Badge */}
        <div className="flex items-start justify-between border-b border-terminal-border/80 pb-4">
          <div className="flex items-center gap-3">
            {/* Animated Icon Circle */}
            <div
              className={`w-12 h-12 rounded-none flex items-center justify-center text-xl font-bold border-2 ${
                isLimitStaged
                  ? "border-terminal-cyan bg-terminal-card/80 text-terminal-cyan shadow-neon-cyan animate-pulse"
                  : isBuy
                  ? "border-terminal-emerald bg-terminal-card/80 text-terminal-emerald shadow-neon-emerald"
                  : "border-terminal-red bg-terminal-card/80 text-terminal-red shadow-neon-red"
              }`}
            >
              {isLimitStaged ? "🎯" : isBuy ? "✓" : "⚡"}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-terminal-muted font-bold">
                AUDIT LOGGED · SIMULATION ENGINE
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide mt-0.5">
                {receipt.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-terminal-muted hover:text-white p-1 text-sm border border-terminal-border/40 hover:border-terminal-border"
          >
            ✕
          </button>
        </div>

        {/* Central Key Highlight Badge */}
        <div className="flex flex-wrap items-center justify-between p-3.5 bg-terminal-card/60 border border-terminal-border gap-2">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${badgeColor}`}>
              {isLimitStaged
                ? `LIMIT ${receipt.action} ORDER`
                : isLimitFilled
                ? `TRIGGERED LIMIT FILL`
                : isClose
                ? `POSITION CLOSED (100%)`
                : `MARKET ${receipt.action}`}
            </span>
            <span className="text-sm font-bold text-white">
              {receipt.amount.toFixed(4)} {receipt.assetSymbol}
            </span>
          </div>
          <div className="text-right">
            <div className="text-xs text-terminal-muted">SETTLEMENT GROSS</div>
            <div className="text-base font-bold text-terminal-cyan tabular-data">
              ${receipt.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-terminal-obsidian border border-terminal-border/60 flex flex-col gap-1">
            <span className="text-[10px] text-terminal-muted uppercase">
              {isLimitStaged ? "TARGET TRIGGER PRICE" : "EXECUTION PRICE"}
            </span>
            <span className="text-sm font-bold text-white tabular-data">
              ${receipt.price.toLocaleString("en-US", { minimumFractionDigits: receipt.assetSymbol === "DOGE" ? 4 : 2 })}
            </span>
          </div>

          <div className="p-3 bg-terminal-obsidian border border-terminal-border/60 flex flex-col gap-1">
            <span className="text-[10px] text-terminal-muted uppercase">ASSET ALLOCATED</span>
            <span className="text-sm font-bold text-terminal-purple tabular-data">
              {receipt.amount.toFixed(4)} {receipt.assetSymbol}
            </span>
          </div>

          {receipt.remainingCash !== undefined && (
            <div className="p-3 bg-terminal-obsidian border border-terminal-border/60 flex flex-col gap-1">
              <span className="text-[10px] text-terminal-muted uppercase">REMAINING CASH</span>
              <span className="text-sm font-bold text-terminal-emerald tabular-data">
                ${receipt.remainingCash.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="p-3 bg-terminal-obsidian border border-terminal-border/60 flex flex-col gap-1">
            <span className="text-[10px] text-terminal-muted uppercase">ORDER STATUS</span>
            <span
              className={`text-sm font-bold uppercase ${
                isLimitStaged ? "text-terminal-yellow" : "text-terminal-emerald"
              }`}
            >
              {isLimitStaged ? "ACTIVE ON BOOK" : "SETTLED IN WALLET"}
            </span>
          </div>
        </div>

        {/* Audit Meta Footer */}
        <div className="flex flex-col gap-1 pt-2 border-t border-terminal-border/60 text-[10px] text-terminal-muted">
          <div className="flex justify-between">
            <span>TX RECEIPT ID:</span>
            <span className="text-terminal-text tabular-data">
              {receipt.txHash || `#ORD-${Date.now().toString(36).toUpperCase()}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span>SYSTEM AUDIT TIME:</span>
            <span className="text-terminal-text tabular-data">
              {receipt.timestamp || `${new Date().toISOString().slice(0, 19).replace("T", " ")} UTC`}
            </span>
          </div>
        </div>

        {/* Primary Dismiss Button */}
        <button
          onClick={onClose}
          className={`w-full py-3 text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
            isLimitStaged
              ? "bg-terminal-cyan text-black hover:bg-cyan-300 shadow-neon-cyan"
              : isBuy
              ? "bg-terminal-emerald text-black hover:bg-emerald-400 shadow-neon-emerald"
              : "bg-terminal-purple text-white hover:bg-purple-600 shadow-neon-violet"
          }`}
        >
          CONFIRM & DISMISS RECEIPT (ESC)
        </button>
      </div>
    </div>
  );
}
