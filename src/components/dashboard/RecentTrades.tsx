"use client";

import React, { useState } from "react";

export interface TradeRecord {
  id: string;
  asset_symbol: string;
  action: "BUY" | "SELL";
  amount: number;
  price: number;
  timestamp: string;
}

export interface LimitOrder {
  id: string;
  assetSymbol: string;
  action: "BUY" | "SELL";
  amount: number;
  limitPrice: number;
  status: "OPEN" | "FILLED" | "CANCELLED";
  createdAt: string;
  filledAt?: string;
  cancelledAt?: string;
}

interface RecentTradesProps {
  trades: TradeRecord[];
  limitOrders?: LimitOrder[];
  onCancelLimitOrder?: (id: string) => void;
}

export default function RecentTrades({
  trades,
  limitOrders = [],
  onCancelLimitOrder,
}: RecentTradesProps) {
  const [activeTab, setActiveTab] = useState<"HISTORY" | "ACTIVE_LIMITS" | "LIMIT_HISTORY">("HISTORY");
  
  const activeLimits = limitOrders.filter((o) => o.status === "OPEN");
  const pastLimits = limitOrders.filter((o) => o.status !== "OPEN");

  return (
    <div className="elevated-glass-panel p-5 flex flex-col gap-3.5 border border-terminal-border/80">
      {/* Tabs Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-terminal-border/80 pb-2.5 gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-terminal-purple font-mono font-semibold">
            AUDIT BOOK & LOGS
          </div>
          <div className="text-sm font-bold text-white mt-0.5 font-mono">
            {activeTab === "HISTORY"
              ? "ALL EXECUTED SPOT TRADES"
              : activeTab === "ACTIVE_LIMITS"
              ? "ACTIVE STAGED LIMIT ORDERS"
              : "HISTORICAL LIMIT ORDERS LOG"}
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1 bg-terminal-obsidian border border-terminal-border p-0.5 font-mono text-xs">
          <button
            onClick={() => setActiveTab("HISTORY")}
            className={`px-3 py-1 font-bold transition-all ${
              activeTab === "HISTORY"
                ? "bg-terminal-purple text-white shadow-neon-violet"
                : "text-terminal-muted hover:text-white"
            }`}
          >
            EXECUTED ({trades.length})
          </button>
          <button
            onClick={() => setActiveTab("ACTIVE_LIMITS")}
            className={`px-3 py-1 font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "ACTIVE_LIMITS"
                ? "bg-terminal-cyan text-black shadow-neon-cyan font-bold"
                : "text-terminal-muted hover:text-white"
            }`}
          >
            <span>ACTIVE LIMITS</span>
            {activeLimits.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-terminal-purple text-white text-[9px] flex items-center justify-center font-bold">
                {activeLimits.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("LIMIT_HISTORY")}
            className={`px-3 py-1 font-bold transition-all ${
              activeTab === "LIMIT_HISTORY"
                ? "bg-terminal-cardHover text-terminal-text border border-terminal-purple/40"
                : "text-terminal-muted hover:text-white"
            }`}
          >
            LIMIT HISTORY ({pastLimits.length})
          </button>
        </div>
      </div>

      {/* Tab 1: All Executed Trades */}
      {activeTab === "HISTORY" && (
        <>
          {trades.length === 0 ? (
            <div className="py-8 text-center text-xs text-terminal-muted font-mono">
              NO TRADES EXECUTED YET. SUBMIT A MARKET ORDER OR STAGE A LIMIT ORDER ABOVE.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-terminal-border/80 text-terminal-muted text-[10px] uppercase tracking-wider bg-terminal-obsidian/60">
                    <th className="py-2.5 px-3">TIMESTAMP</th>
                    <th className="py-2.5 px-3">ASSET</th>
                    <th className="py-2.5 px-3">ACTION</th>
                    <th className="py-2.5 px-3 text-right">AMOUNT</th>
                    <th className="py-2.5 px-3 text-right">FILL PRICE</th>
                    <th className="py-2.5 px-3 text-right">TOTAL USD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terminal-border/40">
                  {trades.map((trade) => {
                    const isBuy = trade.action === "BUY";
                    const total = Number(trade.amount) * Number(trade.price);
                    const timeStr = new Date(trade.timestamp).toLocaleTimeString();

                    return (
                      <tr key={trade.id} className="hover:bg-terminal-cardHover/60 transition-colors">
                        <td className="py-2.5 px-3 text-terminal-muted text-[11px] tabular-data">
                          {timeStr}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-terminal-text">
                          {trade.asset_symbol}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              isBuy
                                ? "bg-terminal-greenMuted text-terminal-emerald border border-terminal-emerald/40"
                                : "bg-terminal-redMuted text-terminal-red border border-terminal-red/40"
                            }`}
                          >
                            {trade.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-data text-white font-bold">
                          {Number(trade.amount).toFixed(4)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-data text-terminal-muted">
                          ${Number(trade.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-data font-bold text-terminal-cyan">
                          ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Tab 2: Active Staged Limit Orders */}
      {activeTab === "ACTIVE_LIMITS" && (
        <>
          {activeLimits.length === 0 ? (
            <div className="py-8 text-center text-xs text-terminal-muted font-mono flex flex-col items-center gap-1.5">
              <span>NO ACTIVE LIMIT ORDERS CURRENTLY AWAITING PRICE TRIGGER.</span>
              <span className="text-[10px] text-terminal-cyan">
                Select &quot;LIMIT&quot; in the Order Router above to stage automated dip-buy or profit-take triggers.
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-terminal-border/80 text-terminal-muted text-[10px] uppercase tracking-wider bg-terminal-obsidian/60">
                    <th className="py-2.5 px-3">PLACED AT</th>
                    <th className="py-2.5 px-3">ASSET</th>
                    <th className="py-2.5 px-3">TYPE</th>
                    <th className="py-2.5 px-3 text-right">QUANTITY</th>
                    <th className="py-2.5 px-3 text-right">TARGET LIMIT PRICE</th>
                    <th className="py-2.5 px-3 text-center">STATUS</th>
                    <th className="py-2.5 px-3 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terminal-border/40">
                  {activeLimits.map((order) => {
                    const isBuy = order.action === "BUY";
                    const timeStr = new Date(order.createdAt).toLocaleTimeString();

                    return (
                      <tr key={order.id} className="hover:bg-terminal-cardHover/60 transition-colors">
                        <td className="py-2.5 px-3 text-terminal-muted text-[11px] tabular-data">
                          {timeStr}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-terminal-text">
                          {order.assetSymbol}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              isBuy
                                ? "bg-terminal-greenMuted text-terminal-emerald border border-terminal-emerald/40"
                                : "bg-terminal-redMuted text-terminal-red border border-terminal-red/40"
                            }`}
                          >
                            LIMIT {order.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-data text-white font-bold">
                          {Number(order.amount).toFixed(4)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-data text-terminal-cyan font-bold">
                          ${Number(order.limitPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] bg-terminal-obsidian border border-terminal-border text-terminal-yellow font-bold uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-terminal-yellow animate-ping"></span>
                            AWAITING TICK
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => onCancelLimitOrder && onCancelLimitOrder(order.id)}
                            className="px-2.5 py-1 text-[10px] font-bold bg-terminal-redMuted hover:bg-terminal-red border border-terminal-red/50 text-terminal-red hover:text-white uppercase transition-all shadow-neon-red"
                          >
                            CANCEL
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Tab 3: Historical Limit Orders Log */}
      {activeTab === "LIMIT_HISTORY" && (
        <>
          {pastLimits.length === 0 ? (
            <div className="py-8 text-center text-xs text-terminal-muted font-mono">
              NO PAST LIMIT ORDER HISTORY LOGGED YET.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-terminal-border/80 text-terminal-muted text-[10px] uppercase tracking-wider bg-terminal-obsidian/60">
                    <th className="py-2.5 px-3">DATE / TIME</th>
                    <th className="py-2.5 px-3">ASSET</th>
                    <th className="py-2.5 px-3">SIDE</th>
                    <th className="py-2.5 px-3 text-right">QUANTITY</th>
                    <th className="py-2.5 px-3 text-right">TARGET LIMIT</th>
                    <th className="py-2.5 px-3 text-center">OUTCOME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terminal-border/40">
                  {pastLimits.map((order) => {
                    const isFilled = order.status === "FILLED";
                    const isBuy = order.action === "BUY";
                    const timeStr = new Date(order.filledAt || order.cancelledAt || order.createdAt).toLocaleTimeString();

                    return (
                      <tr key={order.id} className="hover:bg-terminal-cardHover/60 transition-colors">
                        <td className="py-2.5 px-3 text-terminal-muted text-[11px] tabular-data">
                          {timeStr}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-terminal-text">
                          {order.assetSymbol}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              isBuy ? "text-terminal-emerald" : "text-terminal-red"
                            }`}
                          >
                            {order.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-data text-white">
                          {Number(order.amount).toFixed(4)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-data text-terminal-muted">
                          ${Number(order.limitPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              isFilled
                                ? "bg-terminal-greenMuted text-terminal-emerald border border-terminal-emerald/40"
                                : "bg-terminal-obsidian text-terminal-muted border border-terminal-border"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
