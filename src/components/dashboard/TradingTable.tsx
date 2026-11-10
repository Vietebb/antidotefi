"use client";

import React, { useState, useEffect, useRef } from "react";
import type { AssetPrice } from "@/app/api/prices/route";
import type { LimitOrder, TradeRecord } from "./RecentTrades";
import type { TradeReceiptData } from "./TradeReceiptModal";

interface TradingTableProps {
  usdBalance: number;
  wallets: Record<string, number>;
  onTradeExecuted: () => void;
  openLimitOrders?: LimitOrder[];
  onLimitOrdersUpdate?: (orders: LimitOrder[]) => void;
  onShowReceipt?: (receipt: TradeReceiptData) => void;
  onLimitFilled?: (trade: TradeRecord) => void;
  isDemo?: boolean;
  onLocalBalanceChange?: (asset: string, action: "BUY" | "SELL", amount: number, totalUsd: number) => void;
}

export default function TradingTable({
  usdBalance,
  wallets,
  onTradeExecuted,
  openLimitOrders = [],
  onLimitOrdersUpdate,
  onShowReceipt,
  onLimitFilled,
  isDemo = false,
  onLocalBalanceChange,
}: TradingTableProps) {
  const [prices, setPrices] = useState<Record<string, AssetPrice>>({});
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<string>("BTC");
  const [tradeAmount, setTradeAmount] = useState<string>("");
  const [actionType, setActionType] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [executing, setExecuting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Poll prices every 3 seconds
  useEffect(() => {
    let isMounted = true;
    const fetchPrices = async () => {
      try {
        const res = await fetch("/api/prices");
        const json = await res.json();
        if (isMounted && json.data) {
          setPrices(json.data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch prices:", err);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const currentAsset = prices[selectedAsset];
  const numAmount = parseFloat(tradeAmount) || 0;
  const currentPrice = currentAsset?.price || 0;
  const targetPrice = orderType === "LIMIT" ? parseFloat(limitPrice) || currentPrice : currentPrice;
  const totalValue = numAmount * targetPrice;
  const userAssetBalance = wallets[selectedAsset] || 0;

  // Sync initial limit price with live price when switching asset or mode
  useEffect(() => {
    if (currentAsset?.price && (!limitPrice || orderType === "MARKET")) {
      setLimitPrice(currentAsset.price.toString());
    }
  }, [selectedAsset, currentAsset?.price, orderType]);

  // Automated Limit Order Monitor (fills pending limit orders when price threshold touches)
  const isExecutingLimitRef = useRef(false);
  useEffect(() => {
    if (openLimitOrders.length === 0 || !prices || isExecutingLimitRef.current) return;

    const checkAndFillLimitOrders = async () => {
      for (const order of openLimitOrders) {
        if (order.status !== "OPEN") continue;
        const live = prices[order.assetSymbol];
        if (!live) continue;

        const isBuyTriggered = order.action === "BUY" && live.price <= order.limitPrice;
        const isSellTriggered = order.action === "SELL" && live.price >= order.limitPrice;

        if (isBuyTriggered || isSellTriggered) {
          isExecutingLimitRef.current = true;
          try {
            let success = false;
            const fillTime = new Date().toISOString();
            const totalVal = order.amount * live.price;

            if (isDemo) {
              success = true;
              if (onLocalBalanceChange) {
                onLocalBalanceChange(order.assetSymbol, order.action, order.amount, totalVal);
              }
            } else {
              const res = await fetch("/api/trade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  assetSymbol: order.assetSymbol,
                  action: order.action,
                  amount: order.amount,
                  price: live.price,
                }),
              });
              success = res.ok;
            }

            if (success) {
              const updated = openLimitOrders.map((o) =>
                o.id === order.id ? { ...o, status: "FILLED" as const, filledAt: fillTime } : o
              );
              if (onLimitOrdersUpdate) onLimitOrdersUpdate(updated);

              const tradeRecord: TradeRecord = {
                id: `trade-limit-${Date.now()}`,
                asset_symbol: order.assetSymbol,
                action: order.action,
                amount: order.amount,
                price: live.price,
                timestamp: fillTime,
              };

              if (onLimitFilled) onLimitFilled(tradeRecord);
              onTradeExecuted();

              if (onShowReceipt) {
                onShowReceipt({
                  title: `LIMIT ${order.action} ORDER TRIGGERED & FILLED`,
                  type: "LIMIT_FILLED",
                  action: order.action,
                  assetSymbol: order.assetSymbol,
                  amount: order.amount,
                  price: live.price,
                  totalValue: totalVal,
                  remainingCash: order.action === "BUY" ? Math.max(0, usdBalance - totalVal) : usdBalance + totalVal,
                  txHash: `#LIMIT-FILL-${Date.now().toString(36).toUpperCase()}`,
                  timestamp: `${fillTime.slice(0, 19).replace("T", " ")} UTC`,
                  message: `Market price touched target $${order.limitPrice.toLocaleString()}. Automated execution finalized.`,
                });
              }

              setStatusMessage({
                type: "success",
                text: `🎯 LIMIT ORDER TRIGGERED & FILLED: ${order.action} ${order.amount} ${order.assetSymbol} @ $${live.price.toLocaleString()}`,
              });
            }
          } catch (err) {
            console.error("Limit fill error:", err);
          } finally {
            isExecutingLimitRef.current = false;
          }
          break; // Process one per tick
        }
      }
    };

    checkAndFillLimitOrders();
  }, [prices, openLimitOrders, onLimitOrdersUpdate, onTradeExecuted, onLimitFilled, onShowReceipt, isDemo, onLocalBalanceChange, usdBalance]);

  // Handle Standard Trade Submission (Market or Staged Limit)
  const handleTrade = async (action: "BUY" | "SELL") => {
    if (numAmount <= 0) {
      setStatusMessage({ type: "error", text: "Specify an amount greater than 0" });
      return;
    }

    // Limit Order Branch
    if (orderType === "LIMIT") {
      const numLimitPrice = parseFloat(limitPrice);
      if (isNaN(numLimitPrice) || numLimitPrice <= 0) {
        setStatusMessage({ type: "error", text: "Please enter a valid positive target limit price" });
        return;
      }

      // Check if limit price already satisfies immediate fill
      const canFillImmediately =
        (action === "BUY" && currentPrice <= numLimitPrice) ||
        (action === "SELL" && currentPrice >= numLimitPrice);

      if (!canFillImmediately) {
        // Stage into Active Limit Orders queue
        const nowIso = new Date().toISOString();
        const newOrder: LimitOrder = {
          id: `limit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          assetSymbol: selectedAsset,
          action,
          amount: numAmount,
          limitPrice: numLimitPrice,
          status: "OPEN",
          createdAt: nowIso,
        };

        const nextOrders = [...openLimitOrders, newOrder];
        if (onLimitOrdersUpdate) onLimitOrdersUpdate(nextOrders);

        const stagedVal = numAmount * numLimitPrice;
        if (onShowReceipt) {
          onShowReceipt({
            title: `LIMIT ${action} ORDER PLACED & STAGED`,
            type: "LIMIT_STAGED",
            action,
            assetSymbol: selectedAsset,
            amount: numAmount,
            price: numLimitPrice,
            totalValue: stagedVal,
            remainingCash: action === "BUY" ? Math.max(0, usdBalance - stagedVal) : usdBalance,
            txHash: `#LIMIT-${Date.now().toString(36).toUpperCase()}`,
            timestamp: `${nowIso.slice(0, 19).replace("T", " ")} UTC`,
          });
        }

        setTradeAmount("");
        setStatusMessage({
          type: "info",
          text: `📋 STAGED LIMIT ORDER: ${action} ${numAmount} ${selectedAsset} @ target $${numLimitPrice.toLocaleString()}. Will auto-execute when market touches price.`,
        });
        return;
      }
    }

    // Market / Immediate Fill
    try {
      setExecuting(true);
      setStatusMessage({ type: "info", text: `Executing ${action} order...` });

      const nowIso = new Date().toISOString();
      const executionTotal = numAmount * currentPrice;
      const newRemainingCash = action === "BUY" ? Math.max(0, usdBalance - executionTotal) : usdBalance + executionTotal;

      if (isDemo) {
        const demoTrade: TradeRecord = {
          id: `demo-trade-${Date.now()}`,
          asset_symbol: selectedAsset,
          action,
          amount: numAmount,
          price: currentPrice,
          timestamp: nowIso,
        };

        if (onLimitFilled) onLimitFilled(demoTrade);
        if (onLocalBalanceChange) onLocalBalanceChange(selectedAsset, action, numAmount, executionTotal);

        if (onShowReceipt) {
          onShowReceipt({
            title: `MARKET ${action} ORDER EXECUTED & SETTLED`,
            type: "MARKET_FILLED",
            action,
            assetSymbol: selectedAsset,
            amount: numAmount,
            price: currentPrice,
            totalValue: executionTotal,
            remainingCash: newRemainingCash,
            txHash: `#MKT-${Date.now().toString(36).toUpperCase()}`,
            timestamp: `${nowIso.slice(0, 19).replace("T", " ")} UTC`,
            message: `Spot execution settled. Purchased ${numAmount} ${selectedAsset} at mark price $${currentPrice.toLocaleString()}.`,
          });
        }

        setTradeAmount("");
        setStatusMessage({
          type: "success",
          text: `✓ Spot ${action} of ${numAmount} ${selectedAsset} settled successfully.`,
        });
        return;
      }

      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetSymbol: selectedAsset,
          action,
          amount: numAmount,
          price: currentPrice,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Trade execution failed");
      }

      // Pop large trade confirmation receipt
      if (onShowReceipt) {
        onShowReceipt({
          title: `MARKET ${action} ORDER EXECUTED & SETTLED`,
          type: "MARKET_FILLED",
          action,
          assetSymbol: selectedAsset,
          amount: numAmount,
          price: currentPrice,
          totalValue: executionTotal,
          remainingCash: newRemainingCash,
          txHash: `#MKT-${Date.now().toString(36).toUpperCase()}`,
          timestamp: `${nowIso.slice(0, 19).replace("T", " ")} UTC`,
        });
      }

      // Reset trade amount input back to empty
      setTradeAmount("");

      setStatusMessage({
        type: "success",
        text: `✓ ${json.message}`,
      });
      onTradeExecuted();
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: `✕ ${err instanceof Error ? err.message : "Execution failed"}`,
      });
    } finally {
      setExecuting(false);
    }
  };

  // One-Click "Close Position / Sell All"
  const handleQuickClose = async (symbol: string, heldAmount: number, price: number) => {
    if (heldAmount <= 0) return;

    try {
      setExecuting(true);
      setStatusMessage({ type: "info", text: `Closing 100% position in ${symbol}...` });

      const nowIso = new Date().toISOString();
      const liquidatedTotal = heldAmount * price;

      if (isDemo) {
        const demoTrade: TradeRecord = {
          id: `demo-close-${Date.now()}`,
          asset_symbol: symbol,
          action: "SELL",
          amount: heldAmount,
          price: price,
          timestamp: nowIso,
        };

        if (onLimitFilled) onLimitFilled(demoTrade);
        if (onLocalBalanceChange) onLocalBalanceChange(symbol, "SELL", heldAmount, liquidatedTotal);

        if (onShowReceipt) {
          onShowReceipt({
            title: `100% POSITION LIQUIDATION SETTLED`,
            type: "POSITION_CLOSED",
            action: "SELL",
            assetSymbol: symbol,
            amount: heldAmount,
            price: price,
            totalValue: liquidatedTotal,
            remainingCash: usdBalance + liquidatedTotal,
            txHash: `#CLOSE-${Date.now().toString(36).toUpperCase()}`,
            timestamp: `${nowIso.slice(0, 19).replace("T", " ")} UTC`,
            message: `100% position in ${symbol} (${heldAmount}) liquidated at market spot.`,
          });
        }

        setStatusMessage({
          type: "success",
          text: `✓ CLOSED POSITION: Sold all ${heldAmount.toFixed(4)} ${symbol} for $${liquidatedTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        });
        return;
      }

      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetSymbol: symbol,
          action: "SELL",
          amount: heldAmount,
          price: price,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to close position");
      }

      // Pop large close receipt
      if (onShowReceipt) {
        onShowReceipt({
          title: `100% POSITION LIQUIDATION SETTLED`,
          type: "POSITION_CLOSED",
          action: "SELL",
          assetSymbol: symbol,
          amount: heldAmount,
          price: price,
          totalValue: liquidatedTotal,
          remainingCash: usdBalance + liquidatedTotal,
          txHash: `#CLOSE-${Date.now().toString(36).toUpperCase()}`,
          timestamp: `${nowIso.slice(0, 19).replace("T", " ")} UTC`,
        });
      }

      setStatusMessage({
        type: "success",
        text: `✓ CLOSED POSITION: Sold all ${heldAmount.toFixed(4)} ${symbol} for $${liquidatedTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      });
      onTradeExecuted();
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: `✕ ${err instanceof Error ? err.message : "Close position failed"}`,
      });
    } finally {
      setExecuting(false);
    }
  };

  const setPercentAmount = (pct: number) => {
    if (actionType === "BUY") {
      if (targetPrice > 0) {
        const maxAffordable = (usdBalance * (pct / 100)) / targetPrice;
        setTradeAmount(maxAffordable.toFixed(4));
      }
    } else {
      const maxSellable = userAssetBalance * (pct / 100);
      setTradeAmount(maxSellable.toFixed(4));
    }
  };

  return (
    <div className="elevated-glass-panel p-5 flex flex-col gap-4 border border-terminal-border/80">
      {/* Table Header / Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-terminal-border/80">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-terminal-purple font-mono font-semibold">
            TRADING DESK
          </div>
          <div className="text-sm sm:text-base font-bold text-white mt-0.5 font-mono">
            HIGH-DENSITY SPOT EXECUTION
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-terminal-emerald animate-pulse-fast shadow-neon-emerald"></span>
          <span className="text-[11px] font-mono text-terminal-muted">
            {loading ? "INITIALIZING FEED..." : "LIVE MARKET PRICES"}
          </span>
        </div>
      </div>

      {/* High-Density Market Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b border-terminal-border/80 text-terminal-muted text-[10px] uppercase tracking-wider bg-terminal-obsidian/60">
              <th className="py-2.5 px-3">TICKER</th>
              <th className="py-2.5 px-3 text-right">LAST PRICE</th>
              <th className="py-2.5 px-3 text-right">24H CHANGE</th>
              <th className="py-2.5 px-3 text-right hidden sm:table-cell">24H HIGH</th>
              <th className="py-2.5 px-3 text-right hidden sm:table-cell">24H LOW</th>
              <th className="py-2.5 px-3 text-right">HELD BALANCE</th>
              <th className="py-2.5 px-3 text-center">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-terminal-border/40">
            {Object.values(prices).map((item) => {
              const isSelected = selectedAsset === item.symbol;
              const isGain = item.change24h >= 0;
              const held = wallets[item.symbol] || 0;
              const heldVal = held * item.price;

              return (
                <tr
                  key={item.symbol}
                  onClick={() => setSelectedAsset(item.symbol)}
                  className={`cursor-pointer transition-colors duration-150 ${
                    isSelected
                      ? "bg-terminal-cardHover/90 border-l-2 border-l-terminal-purple shadow-neon-violet"
                      : "hover:bg-terminal-card/60"
                  }`}
                >
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-terminal-text">{item.symbol}</div>
                    <div className="text-[10px] text-terminal-muted hidden md:block">{item.name}</div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-white tabular-data">
                    ${item.price.toLocaleString("en-US", { minimumFractionDigits: item.symbol === "DOGE" ? 4 : 2 })}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-semibold tabular-data ${isGain ? "text-terminal-emerald" : "text-terminal-red"}`}>
                    {isGain ? "+" : ""}{item.change24h.toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-3 text-right text-terminal-muted tabular-data hidden sm:table-cell">
                    ${item.high24h.toLocaleString("en-US", { minimumFractionDigits: item.symbol === "DOGE" ? 4 : 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right text-terminal-muted tabular-data hidden sm:table-cell">
                    ${item.low24h.toLocaleString("en-US", { minimumFractionDigits: item.symbol === "DOGE" ? 4 : 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-data">
                    <div className="text-terminal-text font-bold">{held.toFixed(4)}</div>
                    <div className="text-[10px] text-terminal-muted">${heldVal.toFixed(2)}</div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Select Asset Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAsset(item.symbol);
                        }}
                        className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider transition-all ${
                          isSelected
                            ? "bg-terminal-purple text-white font-bold shadow-neon-violet"
                            : "border border-terminal-border text-terminal-muted hover:border-terminal-purple/60 hover:text-terminal-purple"
                        }`}
                      >
                        {isSelected ? "ACTIVE" : "SELECT"}
                      </button>

                      {/* One-Click "Close Position" Button */}
                      {held > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickClose(item.symbol, held, item.price);
                          }}
                          disabled={executing}
                          title={`Instantly liquidate 100% of ${item.symbol} position`}
                          className="px-2 py-1 text-[10px] font-mono font-bold bg-terminal-redMuted hover:bg-terminal-red border border-terminal-red/50 text-terminal-red hover:text-white uppercase transition-all shadow-neon-red flex items-center gap-1"
                        >
                          <span>CLOSE</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Trade Execution Panel for Selected Asset */}
      {currentAsset && (
        <div className="elevated-glass-card p-4 mt-2 flex flex-col gap-3.5 border border-terminal-purple/40">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-terminal-border/60 pb-3">
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-white font-mono">ORDER ROUTER: {currentAsset.symbol}/USD</span>
              <span className="text-xs text-terminal-cyan font-mono tabular-data font-semibold">
                MARKET: ${currentAsset.price.toLocaleString()}
              </span>
            </div>

            {/* Order Type Toggle: Market vs Limit */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-terminal-obsidian border border-terminal-border p-0.5">
                <button
                  onClick={() => setOrderType("MARKET")}
                  className={`px-3 py-1 text-xs font-bold font-mono transition-all ${
                    orderType === "MARKET"
                      ? "bg-terminal-purple text-white shadow-neon-violet"
                      : "text-terminal-muted hover:text-white"
                  }`}
                >
                  MARKET
                </button>
                <button
                  onClick={() => setOrderType("LIMIT")}
                  className={`px-3 py-1 text-xs font-bold font-mono transition-all ${
                    orderType === "LIMIT"
                      ? "bg-terminal-cyan text-black shadow-neon-cyan"
                      : "text-terminal-muted hover:text-white"
                  }`}
                >
                  LIMIT
                </button>
              </div>

              {/* Side: Buy vs Sell */}
              <div className="flex items-center gap-1 bg-terminal-obsidian border border-terminal-border p-0.5">
                <button
                  onClick={() => setActionType("BUY")}
                  className={`px-3 py-1 text-xs font-bold font-mono transition-all ${
                    actionType === "BUY"
                      ? "bg-terminal-emerald text-black shadow-neon-emerald"
                      : "text-terminal-muted hover:text-white"
                  }`}
                >
                  BUY / LONG
                </button>
                <button
                  onClick={() => setActionType("SELL")}
                  className={`px-3 py-1 text-xs font-bold font-mono transition-all ${
                    actionType === "SELL"
                      ? "bg-terminal-red text-white shadow-neon-red"
                      : "text-terminal-muted hover:text-white"
                  }`}
                >
                  SELL / SHORT
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            {/* Amount Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-terminal-muted uppercase tracking-wider font-mono">
                Order Amount ({currentAsset.symbol})
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  className="w-full bg-terminal-obsidian border border-terminal-border text-white px-3 py-2 text-sm font-mono focus:border-terminal-purple focus:outline-none tabular-data transition-colors"
                  placeholder="0.0"
                />
                <span className="absolute right-3 top-2.5 text-xs text-terminal-muted pointer-events-none font-mono">
                  {currentAsset.symbol}
                </span>
              </div>
            </div>

            {/* Target Price / Total Value */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] text-terminal-muted uppercase tracking-wider font-mono">
                <span>{orderType === "LIMIT" ? "Target Limit Price (USD)" : "Total Value (USD)"}</span>
                <span>
                  Available: {actionType === "BUY" ? `$${usdBalance.toFixed(2)}` : `${userAssetBalance.toFixed(4)} ${currentAsset.symbol}`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {orderType === "LIMIT" ? (
                  <input
                    type="number"
                    step="any"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    className="w-full bg-terminal-obsidian border border-terminal-cyan text-terminal-cyan px-3 py-2 text-sm font-mono tabular-data font-bold focus:outline-none"
                    placeholder="Limit price..."
                  />
                ) : (
                  <div className="w-full bg-terminal-obsidian border border-terminal-border text-terminal-text px-3 py-2 text-sm font-mono tabular-data font-bold">
                    ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}
                <div className="flex gap-1">
                  {[25, 50, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setPercentAmount(pct)}
                      className="px-2 py-2 text-[10px] bg-terminal-obsidian border border-terminal-border text-terminal-muted hover:text-terminal-purple hover:border-terminal-purple font-mono transition-colors"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                disabled={executing || numAmount <= 0}
                onClick={() => handleTrade(actionType)}
                className={`w-full py-2.5 px-4 font-mono font-bold text-xs uppercase tracking-wider transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
                  actionType === "BUY"
                    ? "bg-terminal-emerald text-black hover:bg-terminal-greenGlow shadow-neon-emerald"
                    : "bg-terminal-red text-white hover:bg-terminal-redGlow shadow-neon-red"
                }`}
              >
                {executing
                  ? "PROCESSING..."
                  : orderType === "LIMIT"
                  ? `STAGE LIMIT ${actionType} @ $${targetPrice.toLocaleString()}`
                  : `CONFIRM MARKET ${actionType} ${currentAsset.symbol}`}
              </button>
            </div>
          </div>

          {/* Limit Mode Explainer Sub-note */}
          {orderType === "LIMIT" && (
            <div className="text-[10px] text-terminal-cyan font-mono bg-terminal-obsidian/70 border border-terminal-cyan/30 px-3 py-1.5 flex items-center justify-between">
              <span>🎯 Limit Mode: Total estimated execution: ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              <span className="text-terminal-muted">Monitors tick stream in background</span>
            </div>
          )}

          {statusMessage && (
            <div
              className={`text-[11px] font-mono px-3 py-2 border mt-1 ${
                statusMessage.type === "success"
                  ? "bg-terminal-greenMuted border-terminal-emerald text-terminal-emerald shadow-neon-emerald"
                  : statusMessage.type === "error"
                  ? "bg-terminal-redMuted border-terminal-red text-terminal-red shadow-neon-red"
                  : "bg-terminal-obsidian border-terminal-border text-terminal-purple"
              }`}
            >
              {statusMessage.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
