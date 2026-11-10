import { createClient } from "@/utils/supabase/server";
import LoginButton from "@/components/auth/LoginButton";
import TerminalDashboard from "@/components/dashboard/TerminalDashboard";
import MarketTickerRibbon from "@/components/dashboard/MarketTickerRibbon";
import type { TradeRecord } from "@/components/dashboard/RecentTrades";

interface HomeProps {
  searchParams: Promise<{ demo?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const resolvedParams = await searchParams;
  const isDemo = resolvedParams?.demo === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let wallets: Array<{ asset_symbol: string; balance: number }> = [];
  let trades: TradeRecord[] = [];
  let telegramChatId: string | null = null;

  if (user) {
    // 1. Fetch Wallets
    const { data: walletData } = await supabase
      .from("paper_wallets")
      .select("asset_symbol, balance")
      .eq("user_id", user.id);

    if (walletData && walletData.length > 0) {
      wallets = walletData;
    } else {
      wallets = [{ asset_symbol: "USD", balance: 100000 }];
    }

    // 2. Fetch Recent Trades
    const { data: tradeData } = await supabase
      .from("trade_history")
      .select("id, asset_symbol, action, amount, price, timestamp")
      .eq("user_id", user.id)
      .order("timestamp", { ascending: false })
      .limit(10);

    if (tradeData) {
      trades = tradeData as TradeRecord[];
    }

    // 3. Fetch Telegram ID
    const { data: userData } = await supabase
      .from("users")
      .select("telegram_chat_id")
      .eq("id", user.id)
      .single();

    if (userData?.telegram_chat_id) {
      telegramChatId = userData.telegram_chat_id;
    }
  } else if (isDemo) {
    // Preload rich sample portfolio for guest/demo walkthrough
    wallets = [
      { asset_symbol: "USD", balance: 58240.0 },
      { asset_symbol: "BTC", balance: 0.35 },
      { asset_symbol: "ETH", balance: 3.2 },
      { asset_symbol: "SOL", balance: 18.5 },
      { asset_symbol: "DOGE", balance: 12000.0 },
    ];
    trades = [
      {
        id: "trade-demo-1",
        asset_symbol: "BTC",
        action: "BUY",
        amount: 0.35,
        price: 84200,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "trade-demo-2",
        asset_symbol: "ETH",
        action: "BUY",
        amount: 3.2,
        price: 2710,
        timestamp: new Date(Date.now() - 7200000).toISOString(),
      },
    ];
  }

  const activeUser = user
    ? { id: user.id, email: user.email }
    : isDemo
    ? { id: "guest-demo-operator", email: "guest@quant-terminal.demo" }
    : null;

  return (
    <div className="flex flex-col min-h-screen purple-geometry-grid relative overflow-x-hidden">
      {/* Ambient Purple & Cyan Glow Elements */}
      <div className="glow-orb-violet -top-24 -left-24" />
      <div className="glow-orb-cyan top-1/2 -right-32" />

      {/* Top Status Bar (Elevated Glass) */}
      <header className="border-b border-terminal-border/80 bg-terminal-black/75 backdrop-blur-xl px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-terminal-muted select-none relative z-10">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-terminal-emerald animate-pulse-fast shadow-neon-emerald"></span>
          <span className="font-bold text-terminal-purple tracking-wider font-mono">
            QUANT TERMINAL
          </span>
          <span className="text-[10px] px-2 py-0.5 bg-terminal-obsidian border border-terminal-border text-terminal-cyan font-mono font-semibold">
            SIMULATION MODE // PAPER TRADING
          </span>
        </div>
        <div className="flex items-center gap-3">
          {activeUser && (
            <span className="text-[11px] text-terminal-muted hidden lg:inline font-mono">
              {activeUser.email} {isDemo && "(GUEST PREVIEW)"}
            </span>
          )}
          <LoginButton userEmail={user?.email} />
        </div>
      </header>

      {/* Real-Time Market Ticker Ribbon */}
      <MarketTickerRibbon />

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6 relative z-10">
        {activeUser ? (
          <TerminalDashboard
            user={activeUser}
            initialWallets={wallets}
            initialTrades={trades}
            initialTelegramId={telegramChatId}
          />
        ) : (
          <div className="elevated-glass-panel p-8 sm:p-12 flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-auto w-full border border-terminal-purple/40 shadow-neon-violet">
            <div className="w-14 h-14 rounded-none border border-terminal-purple/60 bg-terminal-card/90 flex items-center justify-center text-terminal-purple mb-4 shadow-neon-violet">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide font-mono">
              QUANT TERMINAL ACCESS
            </h2>
            <p className="text-xs text-terminal-muted max-w-md mt-2 mb-6 font-mono leading-relaxed">
              Sign in with Google to synchronize your personal $100,000 USD paper trading desk and Telegram bot alerts, or enter the guest simulation sandbox.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <LoginButton />
              <a
                href="/?demo=true"
                className="px-4 py-2 border border-terminal-cyan/60 bg-terminal-obsidian hover:bg-terminal-cardHover text-terminal-cyan text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-neon-cyan flex items-center gap-2"
              >
                <span>⚡</span>
                <span>EXPLORE DEMO SANDBOX (GUEST)</span>
              </a>
            </div>

            <div className="mt-8 pt-6 border-t border-terminal-border/60 w-full flex flex-wrap items-center justify-center gap-4 text-[10px] text-terminal-muted font-mono">
              <span className="text-terminal-cyan">$100,000 USD DEMO BALANCE</span>
              <span>•</span>
              <span className="text-terminal-emerald">REAL-TIME MARKET PRICES</span>
              <span>•</span>
              <span className="text-terminal-purple">LIMIT ORDERS & ONE-CLICK CLOSE</span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-terminal-border/80 bg-terminal-black/75 backdrop-blur-xl px-4 py-2.5 text-[11px] text-terminal-muted flex flex-wrap items-center justify-between font-mono relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-terminal-emerald"></span>
          <span className="font-bold text-terminal-text">QUANT TERMINAL</span>
        </div>
        <div className="text-terminal-muted text-[10px]">SIMULATED PAPER TRADING</div>
      </footer>
    </div>
  );
}
