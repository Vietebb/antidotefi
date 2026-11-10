"use client";

import React, { useState, useEffect, useCallback } from "react";
import TiltCard from "./TiltCard";
import TradingTable from "./TradingTable";
import RecentTrades, { type TradeRecord, type LimitOrder } from "./RecentTrades";
import TelegramLinkWidget from "./TelegramLinkWidget";
import PriceTrendChart from "./PriceTrendChart";
import PortfolioDonutChart from "./PortfolioDonutChart";
import NewsSentimentCard from "./NewsSentimentCard";
import TradeReceiptModal, { type TradeReceiptData } from "./TradeReceiptModal";
import { createClient } from "@/utils/supabase/client";

interface TerminalDashboardProps {
  user: {
    id: string;
    email?: string | null;
  };
  initialWallets: Array<{ asset_symbol: string; balance: number }>;
  initialTrades: TradeRecord[];
  initialTelegramId?: string | null;
}

export default function TerminalDashboard({
  user,
  initialWallets,
  initialTrades,
  initialTelegramId,
}: TerminalDashboardProps) {
  const [wallets, setWallets] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = { USD: 100000, BTC: 0, ETH: 0, SOL: 0, DOGE: 0 };
    initialWallets.forEach((w) => {
      map[w.asset_symbol] = Number(w.balance);
    });
    return map;
  });
  const [trades, setTrades] = useState<TradeRecord[]>(initialTrades);
  const [telegramChatId, setTelegramChatId] = useState<string | null>(initialTelegramId || null);
  const [prices, setPrices] = useState<Record<string, number>>({
    BTC: 84750,
    ETH: 2715,
    SOL: 119,
    DOGE: 0.0968,
  });

  const [currentReceipt, setCurrentReceipt] = useState<TradeReceiptData | null>(null);

  const isDemo = user.id === "guest-demo-operator" || user.id.startsWith("guest");

  const handleLocalBalanceChange = (asset: string, action: "BUY" | "SELL", amount: number, totalUsd: number) => {
    setWallets((prev) => {
      const next = { ...prev };
      if (action === "BUY") {
        next["USD"] = Math.max(0, (next["USD"] || 0) - totalUsd);
        next[asset] = (next[asset] || 0) + amount;
      } else {
        next["USD"] = (next["USD"] || 0) + totalUsd;
        next[asset] = Math.max(0, (next[asset] || 0) - amount);
      }
      return next;
    });
  };

  // Staged Limit Orders with LocalStorage Persistence
  const [openLimitOrders, setOpenLimitOrders] = useState<LimitOrder[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`antidote_limit_orders_${user.id}`);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const handleUpdateLimitOrders = (orders: LimitOrder[]) => {
    setOpenLimitOrders(orders);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`antidote_limit_orders_${user.id}`, JSON.stringify(orders));
      } catch (err) {
        console.error("Failed to persist limit orders:", err);
      }
    }
  };

  const handleCancelLimitOrder = (id: string) => {
    const orderToCancel = openLimitOrders.find((o) => o.id === id);
    const updated = openLimitOrders.map((o) =>
      o.id === id ? { ...o, status: "CANCELLED" as const, cancelledAt: new Date().toISOString() } : o
    );
    handleUpdateLimitOrders(updated);
    if (orderToCancel) {
      setCurrentReceipt({
        title: "LIMIT ORDER CANCELLED",
        type: "LIMIT_CANCELLED",
        action: orderToCancel.action,
        assetSymbol: orderToCancel.assetSymbol,
        amount: orderToCancel.amount,
        price: orderToCancel.limitPrice,
        totalValue: orderToCancel.amount * orderToCancel.limitPrice,
        remainingCash: usdCash,
        timestamp: new Date().toISOString(),
        txHash: `0xCAN-${Math.random().toString(16).substring(2, 10).toUpperCase()}`,
        message: `Limit order #${orderToCancel.id} cancelled. Unlocked liquidity for trading desk.`,
      });
    }
  };

  const refreshData = useCallback(async () => {
    const supabase = createClient();

    // Fetch wallets
    const { data: walletData } = await supabase
      .from("paper_wallets")
      .select("asset_symbol, balance")
      .eq("user_id", user.id);

    if (walletData) {
      const map: Record<string, number> = { USD: 0, BTC: 0, ETH: 0, SOL: 0, DOGE: 0 };
      walletData.forEach((w) => {
        map[w.asset_symbol] = Number(w.balance);
      });
      setWallets(map);
    }

    // Fetch recent trades
    const { data: tradeData } = await supabase
      .from("trade_history")
      .select("id, asset_symbol, action, amount, price, timestamp")
      .eq("user_id", user.id)
      .order("timestamp", { ascending: false })
      .limit(10);

    if (tradeData) {
      setTrades(tradeData as TradeRecord[]);
    }

    // Check telegram chat id
    const { data: userData } = await supabase
      .from("users")
      .select("telegram_chat_id")
      .eq("id", user.id)
      .single();

    if (userData?.telegram_chat_id) {
      setTelegramChatId(userData.telegram_chat_id);
    }
  }, [user.id]);

  // Fetch prices to compute real-time portfolio net worth
  useEffect(() => {
    let isMounted = true;
    const fetchPrices = async () => {
      try {
        const res = await fetch("/api/prices");
        const json = await res.json();
        if (isMounted && json.data) {
          const pMap: Record<string, number> = {};
          Object.values(json.data).forEach((item: any) => {
            pMap[item.symbol] = item.price;
          });
          setPrices(pMap);
        }
      } catch (err) {
        console.error("Price stream error:", err);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Compute total equity
  const usdCash = wallets["USD"] || 0;
  const btcValue = (wallets["BTC"] || 0) * (prices["BTC"] || 84750);
  const ethValue = (wallets["ETH"] || 0) * (prices["ETH"] || 2715);
  const solValue = (wallets["SOL"] || 0) * (prices["SOL"] || 119);
  const dogeValue = (wallets["DOGE"] || 0) * (prices["DOGE"] || 0.0968);
  const totalEquity = usdCash + btcValue + ethValue + solValue + dogeValue;
  const initialBase = 100000;
  const netPnl = totalEquity - initialBase;
  const pnlPercent = (netPnl / initialBase) * 100;
  const isProfit = netPnl >= 0;

  return (
    <div className="flex flex-col gap-6">
      {/* 3D Tilt Cards Row (Purple Geometry 1200px perspective) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Portfolio Value */}
        <TiltCard
          title="TOTAL PORTFOLIO VALUE"
          value={`$${totalEquity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subValue={`NET PNL: ${isProfit ? "+" : ""}$${netPnl.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          change24h={`${isProfit ? "+" : ""}${pnlPercent.toFixed(2)}%`}
          isProfit={isProfit}
          badge="TOTAL EQUITY"
          glowColor={isProfit ? "emerald" : "fuchsia"}
          icon={
            <svg className="w-4 h-4 text-terminal-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          <div className="flex justify-between text-[10px] text-terminal-muted font-mono">
            <span>STARTING POOL</span>
            <span className="text-terminal-text tabular-data">$100,000.00 USD</span>
          </div>
        </TiltCard>

        {/* Card 2: USD Paper Cash */}
        <TiltCard
          title="USD PAPER CASH"
          value={`$${usdCash.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subValue="AVAILABLE PURCHASING POWER"
          badge="LIQUIDITY"
          glowColor="cyan"
          icon={
            <svg className="w-4 h-4 text-terminal-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        >
          <div className="flex justify-between text-[10px] text-terminal-muted font-mono">
            <span>ALLOCATION</span>
            <span className="text-terminal-cyan tabular-data">
              {totalEquity > 0 ? ((usdCash / totalEquity) * 100).toFixed(1) : "100.0"}% CASH
            </span>
          </div>
        </TiltCard>

        {/* Card 3: Bitcoin Position */}
        <TiltCard
          title="BTC POSITION"
          value={`${(wallets["BTC"] || 0).toFixed(4)} BTC`}
          subValue={`≈ $${btcValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change24h="+3.42%"
          isProfit={true}
          badge="ASSET // BTC"
          glowColor="violet"
          icon={
            <span className="text-terminal-purple font-bold text-xs">₿</span>
          }
        >
          <div className="flex justify-between text-[10px] text-terminal-muted font-mono">
            <span>SPOT MARK</span>
            <span className="text-terminal-text tabular-data">${prices["BTC"]?.toLocaleString()}</span>
          </div>
        </TiltCard>

        {/* Card 4: Ethereum & Altcoins */}
        <TiltCard
          title="ETH & ALTS"
          value={`$${(ethValue + solValue + dogeValue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subValue={`${(wallets["ETH"] || 0).toFixed(3)} ETH · ${(wallets["SOL"] || 0).toFixed(2)} SOL`}
          change24h="+2.15%"
          isProfit={true}
          badge="ALT BASKET"
          glowColor="emerald"
          icon={
            <span className="text-terminal-emerald font-bold text-xs">Ξ</span>
          }
        >
          <div className="flex justify-between text-[10px] text-terminal-muted font-mono">
            <span>PORTFOLIO WEIGHT</span>
            <span className="text-terminal-emerald tabular-data">
              {totalEquity > 0 ? (((ethValue + solValue + dogeValue) / totalEquity) * 100).toFixed(1) : "0.0"}%
            </span>
          </div>
        </TiltCard>
      </div>

      {/* Main Execution Desk & Right Intelligence Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: 8-Point 24H Price Trend Chart + Trading Desk */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Interactive 8-Point 24-Hour Price Trend Chart */}
          <PriceTrendChart />

          {/* High-Density Market Desk with Limit Orders and One-Click Close */}
          <TradingTable
            usdBalance={usdCash}
            wallets={wallets}
            onTradeExecuted={refreshData}
            openLimitOrders={openLimitOrders}
            onLimitOrdersUpdate={handleUpdateLimitOrders}
            onShowReceipt={(receipt) => setCurrentReceipt(receipt)}
            onLimitFilled={(trade) => setTrades((prev) => [trade, ...prev])}
            isDemo={isDemo}
            onLocalBalanceChange={handleLocalBalanceChange}
          />
        </div>

        {/* Right Column: Visual Donut Chart + AI Sentiment Intelligence */}
        <div className="flex flex-col gap-6">
          {/* Visual Portfolio Allocation Donut Chart */}
          <PortfolioDonutChart
            wallets={wallets}
            prices={prices}
            totalEquity={totalEquity}
            netPnl={netPnl}
          />

          {/* AI Sentiment Intelligence Card with Source & RAG Transparency */}
          <NewsSentimentCard />
        </div>
      </div>

      {/* Full-Width Recent Trades, Active Limit Orders & Limit History Tabbed Book */}
      <RecentTrades
        trades={trades}
        limitOrders={openLimitOrders}
        onCancelLimitOrder={handleCancelLimitOrder}
      />

      {/* Full-Width Telegram Automated Intelligence & Desk Clearing Audit */}
      <TelegramLinkWidget
        userId={user.id}
        telegramChatId={telegramChatId}
      />

      {/* Prominent High-Impact Confirmation Receipt Modal */}
      <TradeReceiptModal
        receipt={currentReceipt}
        onClose={() => setCurrentReceipt(null)}
      />
    </div>
  );
}
