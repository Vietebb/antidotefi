import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

import { getLiveMarketPrices } from "@/utils/prices";

function getAdminSupabase() {
  const candidates = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SERVICE_ROLE_SECRET,
    process.env.SUPABASE_SECRET_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ].filter(Boolean) as string[];

  const secretKey =
    candidates.find((k) => k.startsWith("sb_secret_")) ||
    candidates.find((k) => !k.startsWith("sb_publishable_")) ||
    candidates[0];

  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey);
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate user session from secure HTTP-only cookies
    const userSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await userSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized operator session" }, { status: 401 });
    }

    const body = await request.json();
    const { assetSymbol, action, amount, price } = body;

    // 2. Input validation
    if (!assetSymbol || !["BUY", "SELL"].includes(action)) {
      return NextResponse.json({ error: "Invalid trade parameters" }, { status: 400 });
    }

    const { prices: livePrices } = await getLiveMarketPrices();
    const liveAsset = livePrices[assetSymbol];

    if (!liveAsset || !liveAsset.price) {
      return NextResponse.json({ error: `Unsupported trading asset: ${assetSymbol}` }, { status: 400 });
    }

    const benchmarkPrice = liveAsset.price;
    const maxSlippagePct = assetSymbol === "DOGE" ? 0.05 : 0.04;

    const numAmount = Number(amount);
    const clientPrice = Number(price);

    if (isNaN(numAmount) || numAmount <= 0 || isNaN(clientPrice) || clientPrice <= 0) {
      return NextResponse.json({ error: "Amount and price must be positive numbers" }, { status: 400 });
    }

    // 3. SECURITY: Server-side price slippage verification
    // Rejects any manipulated price quotes submitted via DevTools
    const priceDeviation = Math.abs(clientPrice - benchmarkPrice) / benchmarkPrice;
    if (priceDeviation > maxSlippagePct) {
      return NextResponse.json(
        {
          error: `Price verification failed. Price of $${clientPrice} deviates more than ${(maxSlippagePct * 100).toFixed(0)}% from live market price ($${benchmarkPrice}).`,
        },
        { status: 400 }
      );
    }

    // Use verified price for all cost math
    const executionPrice = clientPrice;
    const totalCost = Number((numAmount * executionPrice).toFixed(2));

    // 4. Use Admin Client to mutate ledger (bypasses direct user RLS)
    const adminSupabase = getAdminSupabase();

    // Fetch existing paper wallets for the user
    const { data: wallets, error: walletError } = await adminSupabase
      .from("paper_wallets")
      .select("id, asset_symbol, balance")
      .eq("user_id", user.id);

    if (walletError) {
      return NextResponse.json({ error: "Failed to read paper wallets: " + walletError.message }, { status: 500 });
    }

    const usdWallet = wallets?.find((w) => w.asset_symbol === "USD");
    const assetWallet = wallets?.find((w) => w.asset_symbol === assetSymbol);

    const currentUsdBalance = usdWallet ? Number(usdWallet.balance) : 0;
    const currentAssetBalance = assetWallet ? Number(assetWallet.balance) : 0;

    if (action === "BUY") {
      if (currentUsdBalance < totalCost) {
        return NextResponse.json(
          {
            error: `Insufficient USD funds. Required: $${totalCost.toFixed(2)}, Available: $${currentUsdBalance.toFixed(2)}`,
          },
          { status: 400 }
        );
      }

      // Deduct USD cash
      const newUsdBalance = Number((currentUsdBalance - totalCost).toFixed(2));
      const { error: updateUsdErr } = await adminSupabase
        .from("paper_wallets")
        .update({ balance: newUsdBalance, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("asset_symbol", "USD");

      if (updateUsdErr) {
        return NextResponse.json({ error: "Failed to update USD wallet: " + updateUsdErr.message }, { status: 500 });
      }

      // Credit target asset
      const newAssetBalance = Number((currentAssetBalance + numAmount).toFixed(8));
      if (assetWallet) {
        await adminSupabase
          .from("paper_wallets")
          .update({ balance: newAssetBalance, updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("asset_symbol", assetSymbol);
      } else {
        await adminSupabase.from("paper_wallets").insert({
          user_id: user.id,
          asset_symbol: assetSymbol,
          balance: newAssetBalance,
        });
      }
    } else {
      // SELL
      if (currentAssetBalance < numAmount) {
        return NextResponse.json(
          {
            error: `Insufficient ${assetSymbol} balance. Required: ${numAmount}, Available: ${currentAssetBalance}`,
          },
          { status: 400 }
        );
      }

      // Deduct target asset
      const newAssetBalance = Number((currentAssetBalance - numAmount).toFixed(8));
      const { error: updateAssetErr } = await adminSupabase
        .from("paper_wallets")
        .update({ balance: newAssetBalance, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("asset_symbol", assetSymbol);

      if (updateAssetErr) {
        return NextResponse.json({ error: "Failed to update asset wallet: " + updateAssetErr.message }, { status: 500 });
      }

      // Credit USD cash
      const newUsdBalance = Number((currentUsdBalance + totalCost).toFixed(2));
      if (usdWallet) {
        await adminSupabase
          .from("paper_wallets")
          .update({ balance: newUsdBalance, updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("asset_symbol", "USD");
      } else {
        await adminSupabase.from("paper_wallets").insert({
          user_id: user.id,
          asset_symbol: "USD",
          balance: newUsdBalance,
        });
      }
    }

    // 5. Audit log in trade_history
    const { data: tradeRecord, error: tradeErr } = await adminSupabase
      .from("trade_history")
      .insert({
        user_id: user.id,
        asset_symbol: assetSymbol,
        action: action,
        amount: numAmount,
        price: executionPrice,
      })
      .select()
      .single();

    if (tradeErr) {
      console.error("Trade history audit log error:", tradeErr);
    }

    return NextResponse.json({
      success: true,
      trade: tradeRecord,
      message: `EXECUTED ${action} ${numAmount} ${assetSymbol} @ $${executionPrice.toLocaleString()}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal trade engine error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
