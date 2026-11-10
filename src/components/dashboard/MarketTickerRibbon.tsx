"use client";

import React, { useState, useEffect } from "react";
import type { LiveAssetPrice } from "@/utils/prices";

const DEFAULT_PRICES: Record<string, { price: number; change24h: number }> = {
  BTC: { price: 84750, change24h: 1.68 },
  ETH: { price: 2715, change24h: 2.75 },
  SOL: { price: 119, change24h: 4.95 },
  DOGE: { price: 0.0968, change24h: 4.75 },
};

export default function MarketTickerRibbon() {
  const [prices, setPrices] = useState<Record<string, LiveAssetPrice> | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPrices = async () => {
      try {
        const res = await fetch("/api/prices");
        const json = await res.json();
        if (isMounted && json.data) {
          setPrices(json.data);
        }
      } catch (err) {
        console.error("Ticker ribbon stream error:", err);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const assets = ["BTC", "ETH", "SOL", "DOGE"];

  return (
    <div className="border-b border-terminal-border/80 bg-terminal-obsidian/90 backdrop-blur-md overflow-hidden py-1.5 px-4 text-xs font-mono relative z-10 flex items-center justify-between">
      <div className="flex gap-8 whitespace-nowrap overflow-x-auto no-scrollbar py-0.5">
        {assets.map((sym) => {
          const item = prices ? prices[sym] : null;
          const price = item ? item.price : DEFAULT_PRICES[sym].price;
          const change = item ? item.change24h : DEFAULT_PRICES[sym].change24h;
          const isUp = change >= 0;
          const formattedPrice = sym === "DOGE" ? `$${price.toFixed(4)}` : `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

          return (
            <div key={sym} className="flex items-center gap-2">
              <span className="text-terminal-muted">{sym}/USD</span>
              <span className="text-terminal-text font-bold tabular-data">{formattedPrice}</span>
              <span
                className={`tabular-data font-semibold ${
                  isUp ? "text-terminal-emerald" : "text-rose-400"
                }`}
              >
                {isUp ? "+" : ""}{change.toFixed(2)}% {isUp ? "▲" : "▼"}
              </span>
            </div>
          );
        })}
      </div>
      <div className="hidden md:flex items-center gap-2 pl-4 text-[10px] text-terminal-muted select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-terminal-emerald animate-pulse" />
        <span className="tracking-wider">LIVE FEED</span>
      </div>
    </div>
  );
}
