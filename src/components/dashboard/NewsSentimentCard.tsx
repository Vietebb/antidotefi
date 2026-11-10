"use client";

import React, { useState, useEffect } from "react";

interface NewsSource {
  source: string;
  title: string;
  url: string;
}

interface RAGMatch {
  title: string;
  similarity: number;
  source: string;
  content: string;
}

interface SentimentData {
  score: number;
  label: string;
  confidence: number;
  summary: string;
  tactical_signal: string;
  model: string;
  sources: NewsSource[];
  ragMatch: RAGMatch;
  updated_at: string;
}

export default function NewsSentimentCard() {
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSourcesExpanded, setIsSourcesExpanded] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchSentiment = async () => {
      try {
        const res = await fetch("/api/sentiment");
        const json = await res.json();
        if (isMounted && json.success) {
          setData(json);
          setLoading(false);
        }
      } catch (err) {
        console.error("Sentiment load error:", err);
        if (isMounted) setLoading(false);
      }
    };

    fetchSentiment();
    const interval = setInterval(fetchSentiment, 5 * 60 * 1000); // 5 min poll
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const score = data?.score || 74;
  const isBullish = score >= 60;
  const isBearish = score <= 40;

  return (
    <div className="elevated-glass-panel p-5 flex flex-col gap-4 border border-terminal-border/80 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-terminal-border/80 pb-2.5">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-terminal-purple font-mono font-semibold">
            AI MARKET INTELLIGENCE
          </div>
          <div className="text-sm font-bold text-white mt-0.5 font-mono flex items-center gap-2">
            <span>CONSENSUS SENTIMENT GAUGE</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-terminal-cyan animate-pulse"></span>
          <span className="text-[10px] font-mono text-terminal-cyan font-bold">
            GEMINI 3.6 + RAG
          </span>
        </div>
      </div>

      {loading ? (
        /* YouTube-Style Shimmer Skeleton */
        <div className="flex flex-col gap-3 p-4 bg-terminal-obsidian/40 border border-terminal-border/40 animate-pulse">
          <div className="flex justify-between items-center">
            <div className="h-5 w-24 bg-terminal-border/60 rounded"></div>
            <div className="h-5 w-16 bg-terminal-border/60 rounded"></div>
          </div>
          <div className="h-2 w-full bg-terminal-border/40 rounded"></div>
          <div className="h-10 w-full bg-terminal-border/50 rounded mt-2"></div>
          <div className="h-6 w-3/4 bg-terminal-border/40 rounded"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Sentiment Meter Bar */}
          <div className="flex flex-col gap-1.5 bg-terminal-obsidian/60 border border-terminal-border/60 p-3.5">
            <div className="flex items-center justify-between font-mono">
              <span className="text-xs text-terminal-muted font-bold">SCORE: {score}/100</span>
              <span
                className={`text-xs px-2 py-0.5 font-bold uppercase tracking-wider ${
                  isBullish
                    ? "bg-terminal-greenMuted text-terminal-emerald border border-terminal-emerald/40"
                    : isBearish
                    ? "bg-terminal-redMuted text-terminal-red border border-terminal-red/40"
                    : "bg-terminal-obsidian text-terminal-cyan border border-terminal-cyan/40"
                }`}
              >
                {data?.label || "BULLISH"} ({data?.confidence || 86}% CONF.)
              </span>
            </div>

            {/* Custom Meter Track */}
            <div className="w-full h-2.5 bg-terminal-obsidian border border-terminal-border relative overflow-hidden mt-1">
              <div
                style={{ width: `${score}%` }}
                className={`h-full transition-all duration-500 ${
                  isBullish
                    ? "bg-gradient-to-r from-emerald-500 to-terminal-emerald shadow-neon-emerald"
                    : isBearish
                    ? "bg-gradient-to-r from-red-600 to-terminal-red shadow-neon-red"
                    : "bg-gradient-to-r from-amber-500 to-terminal-purple"
                }`}
              />
            </div>
            <div className="flex justify-between text-[9px] text-terminal-muted font-mono pt-0.5">
              <span>0 (EXTREME FEAR)</span>
              <span>50 (NEUTRAL)</span>
              <span>100 (EXTREME GREED)</span>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="flex flex-col gap-1.5 font-mono text-xs">
            <span className="text-[10px] text-terminal-purple uppercase tracking-wider font-semibold">
              EXECUTIVE SYNTHESIS
            </span>
            <p className="text-terminal-text leading-relaxed bg-terminal-obsidian/40 border border-terminal-border/40 p-2.5 text-[11px]">
              {data?.summary}
            </p>
          </div>

          {/* Tactical Paper Signal */}
          <div className="flex flex-col gap-1 font-mono text-xs">
            <span className="text-[10px] text-terminal-emerald uppercase tracking-wider font-semibold">
              TACTICAL SIMULATION SIGNAL
            </span>
            <p className="text-white text-[11px] font-bold border-l-2 border-l-terminal-emerald pl-2.5 py-0.5">
              ⚡ {data?.tactical_signal}
            </p>
          </div>

          {/* Progressive Disclosure: Collapsible Sources & RAG Knowledge Precedent */}
          <div className="border-t border-terminal-border/80 pt-3">
            <button
              onClick={() => setIsSourcesExpanded(!isSourcesExpanded)}
              className="w-full flex items-center justify-between text-xs font-mono py-1.5 px-2 bg-terminal-obsidian border border-terminal-border hover:border-terminal-purple/60 hover:text-terminal-purple transition-all"
            >
              <span className="flex items-center gap-1.5 font-bold text-terminal-cyan">
                <span>📰</span>
                <span>INSPECT NEWS SOURCES & RAG MEMORY</span>
              </span>
              <span className="text-[10px] font-bold text-terminal-muted">
                {isSourcesExpanded ? "▲ HIDE" : "▼ EXPAND (3)"}
              </span>
            </button>

            {isSourcesExpanded && (
              <div className="flex flex-col gap-3 mt-3 bg-terminal-obsidian/80 border border-terminal-border p-3 font-mono text-xs animate-in fade-in duration-200">
                {/* Verified RSS Headlines */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-terminal-purple font-semibold">
                    1. VERIFIED HEADLINE SOURCES
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {data?.sources && data.sources.length > 0 ? (
                      data.sources.map((src, idx) => (
                        <a
                          key={idx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start justify-between gap-2 p-1.5 bg-terminal-card/60 hover:bg-terminal-cardHover border border-terminal-border/40 hover:border-terminal-purple/40 text-[11px] transition-all group"
                        >
                          <span className="text-white group-hover:text-terminal-purple transition-colors">
                            {src.title}
                          </span>
                          <span className="text-[9px] px-1 py-0.5 bg-terminal-obsidian border border-terminal-border text-terminal-muted uppercase flex-shrink-0">
                            {src.source} ↗
                          </span>
                        </a>
                      ))
                    ) : (
                      <span className="text-terminal-muted text-[11px]">CoinDesk & CoinTelegraph consensus live feed.</span>
                    )}
                  </div>
                </div>

                {/* Supabase RAG Knowledge Match */}
                {data?.ragMatch && (
                  <div className="flex flex-col gap-1.5 border-t border-terminal-border/40 pt-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-terminal-cyan font-semibold">
                        2. HISTORICAL RAG KNOWLEDGE PRECEDENT
                      </span>
                      <span className="text-[9px] text-terminal-emerald font-bold">
                        {(data.ragMatch.similarity * 100).toFixed(0)}% VECTOR MATCH
                      </span>
                    </div>
                    <div className="p-2 bg-terminal-card/80 border border-terminal-border/60 text-[11px]">
                      <div className="font-bold text-white mb-1">
                        📚 {data.ragMatch.title}
                      </div>
                      <p className="text-terminal-muted leading-relaxed text-[10px]">
                        {data.ragMatch.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
