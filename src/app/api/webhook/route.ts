import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLiveMarketPrices } from "@/utils/prices";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
function getAdminSupabase() {
  const candidates = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SERVICE_ROLE_SECRET,
    process.env.SUPABASE_SECRET_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ].filter(Boolean) as string[];

  // Pick key with sb_secret_ prefix or fallback
  const secretKey =
    candidates.find((k) => k.startsWith("sb_secret_")) ||
    candidates.find((k) => !k.startsWith("sb_publishable_")) ||
    candidates[0];

  if (!SUPABASE_URL || !secretKey) return null;
  return createClient(SUPABASE_URL, secretKey);
}

async function sendTelegram(chatId: string, text: string) {
  if (!BOT_TOKEN) {
    console.error("Missing TELEGRAM_BOT_TOKEN");
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown",
      }),
    });
  } catch (err) {
    console.error("sendTelegram network error:", err);
  }
}

export async function GET() {
  return NextResponse.json({
    status: "online",
    service: "Quant Terminal Telegram Webhook",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    const update = await request.json();
    const message = update?.message || update?.edited_message;

    if (message?.chat?.id) {
      const chatId = message.chat.id.toString();
      const text = (message.text || "").trim();
      const supabase = getAdminSupabase();

      // =========================================================================
      // /start [user_id]
      // =========================================================================
      if (text.startsWith("/start")) {
        const parts = text.split(/\s+/);
        const deepLinkUserId = parts.length > 1 ? parts[1].trim() : null;

        if (!supabase) {
          await sendTelegram(chatId, "⚠️ *System Error*: Database credentials unavailable.");
          return NextResponse.json({ ok: true });
        }

        if (deepLinkUserId) {
          const { data: userRecord, error: findError } = await supabase
            .from("users")
            .select("id")
            .eq("id", deepLinkUserId)
            .single();

          if (findError || !userRecord) {
            await sendTelegram(
              chatId,
              `⚠️ *LINK FAILED*\n\nNo Quant Terminal operator found with ID:\n\`${deepLinkUserId}\`\n\nPlease log in to your web terminal to obtain your correct Operator UID.`
            );
          } else {
            const { error: updateError } = await supabase
              .from("users")
              .update({
                telegram_chat_id: chatId,
                updated_at: new Date().toISOString(),
              })
              .eq("id", deepLinkUserId);

            if (updateError) {
              await sendTelegram(chatId, `⚠️ *Link Error*: ${updateError.message}`);
            } else {
              await sendTelegram(
                chatId,
                `🟢 *QUANT TERMINAL // OPERATOR BRIDGE LINKED*\n━━━━━━━━━━━━━━━━━━━━━━━━\n👤 *Operator UID:* \`${deepLinkUserId}\`\n💬 *Telegram Chat ID:* \`${chatId}\`\n⚡ *Status:* CONNECTED & ACTIVE\n\nYour paper trading desk is linked. Send /balance at any time to inspect your live portfolio.`
              );
            }
          }
        } else {
          const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("telegram_chat_id", chatId)
            .single();

          if (existingUser) {
            await sendTelegram(
              chatId,
              `🟢 *QUANT TERMINAL // OPERATOR VERIFIED*\n━━━━━━━━━━━━━━━━━━━━━━━━\nYour Telegram is linked to Operator \`${existingUser.id.slice(0, 8)}...\`.\n\nSend /balance to query your portfolio balances and cash.`
            );
          } else {
            await sendTelegram(
              chatId,
              `👋 *WELCOME TO THE QUANT TERMINAL*\n━━━━━━━━━━━━━━━━━━━━━━━━\nTo link this Telegram bot to your web paper trading desk:\n\n1. Open your web terminal dashboard.\n2. Tap *Link Telegram Bot*.\n\nOr reply with:\n\`/start <your_user_id>\``
            );
          }
        }
      }
      // =========================================================================
      // /balance
      // =========================================================================
      else if (text.startsWith("/balance")) {
        if (!supabase) {
          await sendTelegram(chatId, "⚠️ *System Error*: Database credentials unavailable.");
          return NextResponse.json({ ok: true });
        }

        const { data: userRecord, error: userErr } = await supabase
          .from("users")
          .select("id")
          .eq("telegram_chat_id", chatId)
          .single();

        if (userErr || !userRecord) {
          await sendTelegram(
            chatId,
            `⚠️ *ACCOUNT NOT LINKED*\n\nThis Telegram chat is not yet linked to a Quant Terminal profile.\n\nLog in to your web terminal and tap *Link Telegram Bot*, or send:\n\`/start <your_user_id>\``
          );
        } else {
          const { data: wallets, error: walletErr } = await supabase
            .from("paper_wallets")
            .select("asset_symbol, balance")
            .eq("user_id", userRecord.id);

          if (walletErr) {
            await sendTelegram(chatId, `⚠️ *Wallet Error*: ${walletErr.message}`);
          } else {
            const benchmarkPrices: Record<string, number> = {
              USD: 1,
              BTC: 84750.0,
              ETH: 2715.0,
              SOL: 119.0,
              DOGE: 0.0968,
            };

            try {
              const { prices: live } = await getLiveMarketPrices();
              if (live) {
                Object.entries(live).forEach(([sym, data]) => {
                  benchmarkPrices[sym] = data.price;
                });
              }
            } catch {
              // Fallback to baseline
            }

            let totalUsdValue = 0;
            const walletLines: string[] = [];

            const walletMap: Record<string, number> = {};
            (wallets || []).forEach((w) => {
              walletMap[w.asset_symbol] = Number(w.balance);
            });

            const usdBal = walletMap["USD"] !== undefined ? walletMap["USD"] : 100000;
            totalUsdValue += usdBal;
            walletLines.push(`💵 *USD Cash:* \`$${usdBal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\``);

            for (const [symbol, bal] of Object.entries(walletMap)) {
              if (symbol === "USD") continue;
              const price = benchmarkPrices[symbol] || 0;
              const val = bal * price;
              totalUsdValue += val;
              if (bal > 0) {
                walletLines.push(
                  `🪙 *${symbol}:* \`${bal.toFixed(4)}\` (~$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                );
              }
            }

            if (walletLines.length === 1) {
              walletLines.push(`🪙 *Crypto Holdings:* \`0.00\` (No open positions)`);
            }

            const responseText = [
              `📊 *QUANT TERMINAL // PORTFOLIO VALUATION*`,
              `━━━━━━━━━━━━━━━━━━━━━━━━`,
              ...walletLines,
              `━━━━━━━━━━━━━━━━━━━━━━━━`,
              `💼 *Total Portfolio Equity:* \`$${totalUsdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD\``,
              `⚡ *Terminal Mode:* Active Operator`,
              `🕒 *Timestamp:* \`${new Date().toISOString().slice(0, 19).replace("T", " ")} UTC\``,
            ].join("\n");

            await sendTelegram(chatId, responseText);
          }
        }
      }
      // =========================================================================
      // /help
      // =========================================================================
      else if (text.startsWith("/help") || text.startsWith("/")) {
        await sendTelegram(
          chatId,
          `🤖 *QUANT TERMINAL COMMANDS*\n━━━━━━━━━━━━━━━━━━━━━━━━\n/balance - Instant portfolio valuation & paper balances\n/start [user_id] - Link Telegram to web terminal account\n/help - Show this manual\n\nWeb Terminal: ${process.env.NEXT_PUBLIC_VERCEL_URL || "https://antidote-lake.vercel.app"}`
        );
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
  }

  return NextResponse.json({ ok: true });
}
