"use client";

import React, { useRef, useState } from "react";

export type GlowColor = "violet" | "cyan" | "fuchsia" | "emerald" | "green" | "red" | "amber";

interface TiltCardProps {
  title: string;
  value: string;
  subValue?: string;
  change24h?: string;
  isProfit?: boolean;
  badge?: string;
  icon?: React.ReactNode;
  glowColor?: GlowColor;
  children?: React.ReactNode;
}

export default function TiltCard({
  title,
  value,
  subValue,
  change24h,
  isProfit,
  badge,
  icon,
  glowColor = "violet",
  children,
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Depth perspective with Kowalski spring feel
    const rotateX = -((y - centerY) / centerY) * 9;
    const rotateY = ((x - centerX) / centerX) * 9;

    setRotate({ x: rotateX, y: rotateY });
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.25,
    });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setGlare({ x: 50, y: 50, opacity: 0 });
  };

  const glowBorder: Record<GlowColor, string> = {
    violet: "hover:border-terminal-purple/70 hover:shadow-neon-violet",
    cyan: "hover:border-terminal-cyan/70 hover:shadow-neon-cyan",
    fuchsia: "hover:border-terminal-fuchsia/70 hover:shadow-neon-fuchsia",
    emerald: "hover:border-terminal-emerald/70 hover:shadow-neon-emerald",
    green: "hover:border-terminal-green/70 hover:shadow-neon-emerald",
    red: "hover:border-terminal-red/70 hover:shadow-neon-red",
    amber: "hover:border-terminal-amber/70 hover:shadow-neon-amber",
  };

  return (
    <div
      style={{ perspective: "1200px" }}
      className="w-full select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={cardRef}
        style={{
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
          transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          transformStyle: "preserve-3d",
        }}
        className={`relative overflow-hidden elevated-glass-card p-4 sm:p-5 transition-all duration-200 ${glowBorder[glowColor]}`}
      >
        {/* Dynamic cursor-following glare overlay with subtle violet sheen */}
        <div
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(168, 85, 247, 0.16) 0%, rgba(255, 255, 255, 0.08) 30%, transparent 65%)`,
            opacity: glare.opacity,
            transition: "opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          className="absolute inset-0 pointer-events-none z-10"
        />

        {/* Card Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {icon && <span className="text-terminal-purple">{icon}</span>}
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-terminal-muted font-mono">
              {title}
            </span>
          </div>
          {badge && (
            <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-terminal-obsidian border border-terminal-borderLight text-terminal-purple">
              {badge}
            </span>
          )}
        </div>

        {/* Card Main Metric */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white tabular-data">
            {value}
          </div>
          {change24h && (
            <div
              className={`text-xs font-mono font-semibold tabular-data flex items-center gap-0.5 ${
                isProfit ? "text-terminal-emerald" : "text-terminal-red"
              }`}
            >
              <span>{isProfit ? "▲" : "▼"}</span>
              <span>{change24h}</span>
            </div>
          )}
        </div>

        {/* Subtitle / Evaluation */}
        {subValue && (
          <div className="text-[11px] font-mono text-terminal-muted mt-1 tabular-data">
            {subValue}
          </div>
        )}

        {children && <div className="mt-3 pt-3 border-t border-terminal-border/60">{children}</div>}
      </div>
    </div>
  );
}
