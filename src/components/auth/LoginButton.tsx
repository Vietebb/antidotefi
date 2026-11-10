"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

interface LoginButtonProps {
  userEmail?: string | null;
}

export default function LoginButton({ userEmail }: LoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const supabase = createClient();

      const redirectTo = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Authentication error");
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.reload();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Sign out error");
      setLoading(false);
    }
  };

  if (userEmail) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-terminal-obsidian border border-terminal-borderLight text-[11px] text-terminal-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-terminal-emerald animate-pulse-fast shadow-neon-emerald"></span>
          <span className="text-terminal-text font-mono font-medium">{userEmail}</span>
        </div>
        <button
          onClick={handleSignOut}
          disabled={loading}
          className="px-3 py-1.5 bg-terminal-obsidian border border-terminal-red/50 hover:border-terminal-red text-terminal-red hover:bg-terminal-red/10 text-[11px] font-mono uppercase tracking-wider transition-all disabled:opacity-50"
        >
          {loading ? "TERMINATING..." : "DISCONNECT"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        id="btn-terminal-google-auth"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="group relative flex items-center gap-3 px-6 py-3.5 elevated-glass-card border border-terminal-purple/70 hover:border-terminal-purple text-terminal-purple hover:text-white hover:bg-terminal-purple font-mono font-semibold text-xs tracking-widest uppercase transition-all duration-200 shadow-neon-violet disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4 fill-current transition-colors" viewBox="0 0 24 24">
          <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
        </svg>
        <span>
          {loading ? "INITIALIZING SECURE SESSION..." : "AUTHORIZE VIA GOOGLE TERMINAL"}
        </span>
        <span className="inline-block w-2 h-2 rounded-full bg-terminal-purple group-hover:bg-white animate-pulse-fast" />
      </button>

      {errorMsg && (
        <div className="text-[11px] text-terminal-red border border-terminal-red/40 bg-terminal-redMuted px-3 py-1 font-mono">
          ERR: {errorMsg}
        </div>
      )}
    </div>
  );
}
