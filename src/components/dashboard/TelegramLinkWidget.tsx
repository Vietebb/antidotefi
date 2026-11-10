"use client";

import React, { useState } from "react";

interface TelegramLinkWidgetProps {
  userId: string;
  telegramChatId?: string | null;
}

export default function TelegramLinkWidget({
  userId,
  telegramChatId,
}: TelegramLinkWidgetProps) {
  const [copied, setCopied] = useState(false);
  const botUrl = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || "https://t.me/your_quant_bot";
  const botHandle = botUrl.split("/").pop() ? `@${botUrl.split("/").pop()}` : "@your_quant_bot";
  const deepLinkUrl = `${botUrl}?start=${userId}`;

  const copyUserId = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* Telegram Alerts Card */}
      <div className="elevated-glass-panel p-5 flex flex-col justify-between gap-3.5 border border-terminal-border/80">
        <div>
          <div className="flex items-center justify-between border-b border-terminal-border/80 pb-2.5">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-terminal-cyan" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.943z" />
              </svg>
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                TELEGRAM ALERTS & BOT BRIDGE
              </span>
            </div>
            <span
              className={`text-[9px] font-mono px-2 py-0.5 border uppercase font-bold tracking-wider ${
                telegramChatId
                  ? "bg-terminal-obsidian border-terminal-emerald text-terminal-emerald shadow-neon-emerald"
                  : "bg-terminal-obsidian border-terminal-purple text-terminal-purple shadow-neon-violet"
              }`}
            >
              {telegramChatId ? "LINKED" : "UNLINKED"}
            </span>
          </div>

          {telegramChatId ? (
            <div className="flex flex-col gap-2.5 mt-3">
              <div className="text-xs text-terminal-muted font-mono leading-relaxed">
                Your Telegram account is connected. You receive automated portfolio updates every 15 minutes.
              </div>
              <div className="flex items-center justify-between bg-terminal-obsidian/90 border border-terminal-border p-3 text-xs font-mono">
                <span className="text-terminal-muted">CONNECTED CHAT ID:</span>
                <span className="text-terminal-cyan font-bold tabular-data">{telegramChatId}</span>
              </div>
              <div className="text-[11px] text-terminal-muted font-mono">
                COMMANDS: Send <code className="text-terminal-purple font-semibold">/balance</code> or <code className="text-terminal-purple font-semibold">/portfolio</code> to inspect your balance in chat.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-3">
              <div className="text-xs text-terminal-muted font-mono leading-relaxed">
                Connect your Telegram account to receive automated 15-minute portfolio updates and market alerts.
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <a
                  href={deepLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2 px-3 bg-terminal-card border border-terminal-purple/70 hover:border-terminal-purple text-terminal-purple hover:bg-terminal-purple hover:text-white font-mono font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-neon-violet"
                >
                  LINK TELEGRAM BOT ↗
                </a>
                <button
                  onClick={copyUserId}
                  className="py-2 px-3 bg-terminal-obsidian border border-terminal-border hover:border-terminal-borderLight text-terminal-muted hover:text-terminal-text font-mono text-xs uppercase transition-all"
                >
                  {copied ? "COPIED UID ✓" : "COPY USER ID"}
                </button>
              </div>

              <div className="text-[10px] text-terminal-muted font-mono border-t border-terminal-border/60 pt-2.5">
                Or send <code className="text-terminal-text">/start {userId}</code> to <span className="text-terminal-cyan font-semibold">{botHandle}</span> in Telegram.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Info Card */}
      <div className="elevated-glass-panel p-5 flex flex-col justify-between border border-terminal-border/80">
        <div>
          <div className="flex items-center justify-between border-b border-terminal-border/80 pb-2.5">
            <span className="text-[10px] uppercase tracking-widest text-terminal-purple font-mono font-bold">
              DESK CLEARING & ACCOUNT AUDIT
            </span>
            <span className="px-2 py-0.5 text-[9px] font-mono uppercase bg-terminal-obsidian border border-terminal-emerald text-terminal-emerald font-bold">
              SIMULATED DESK
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3.5 text-xs font-mono">
            <div className="bg-terminal-obsidian/70 border border-terminal-border/60 p-2.5 flex flex-col gap-1">
              <span className="text-[10px] text-terminal-muted">STARTING POOL</span>
              <span className="text-white font-bold">$100,000.00 USD</span>
            </div>
            <div className="bg-terminal-obsidian/70 border border-terminal-border/60 p-2.5 flex flex-col gap-1">
              <span className="text-[10px] text-terminal-muted">TRADING FEES</span>
              <span className="text-terminal-emerald font-bold">$0.00 (Zero Fee)</span>
            </div>
            <div className="bg-terminal-obsidian/70 border border-terminal-border/60 p-2.5 flex flex-col gap-1">
              <span className="text-[10px] text-terminal-muted">EXECUTION ENGINE</span>
              <span className="text-terminal-cyan font-bold">INSTANT SPOT</span>
            </div>
            <div className="bg-terminal-obsidian/70 border border-terminal-border/60 p-2.5 flex flex-col gap-1">
              <span className="text-[10px] text-terminal-muted">SLIPPAGE SHIELD</span>
              <span className="text-terminal-purple font-bold">ACTIVE (4.0% MAX)</span>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-terminal-border/80 text-[10px] text-terminal-muted font-mono flex items-center justify-between">
          <span className="text-terminal-muted">OPERATOR SESSION:</span>
          <span className="text-terminal-cyan font-semibold tabular-data font-mono">
            {userId.slice(0, 10)}...{userId.slice(-6)}
          </span>
        </div>
      </div>
    </div>
  );
}
