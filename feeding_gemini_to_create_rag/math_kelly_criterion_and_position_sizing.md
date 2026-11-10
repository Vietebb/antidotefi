# Kelly Criterion and Position Sizing in Crypto Contagions

## 1. Executive Summary
The Kelly Criterion is a mathematical formula used to determine the optimal theoretical size for a bet to maximize long-term wealth growth while minimizing the risk of absolute ruin. Formula: `f* = (bp - q) / b`, where `f*` is the fraction of the portfolio to wager, `b` is the odds received, `p` is the probability of winning, and `q` is the probability of losing. In algorithmic trading, ignoring the Kelly Criterion (over-leveraging) guarantees long-term destruction, as witnessed during the systemic deleveraging of June 2022.

## 2. Event Timeline (The 3AC Contagion Application)
*   **May 2022:** The collapse of Terra (LUNA) removes $60 billion in liquidity, triggering massive margin calls across the industry.
*   **June 12, 2022:** Celsius Network halts withdrawals due to severe illiquidity.
*   **June 15, 2022:** Rumors circulate that Three Arrows Capital (3AC), a premier crypto hedge fund, is failing margin calls. 3AC ignored fractional Kelly sizing, utilizing max leverage to farm low-volatility yields.
*   **July 1, 2022:** 3AC files for Chapter 15 bankruptcy, defaulting on over $3.5 billion in loans. 

## 3. Price Impact and Performance Metrics
*   **Immediate Crash:** The forced liquidation of 3AC's collateral (stETH, BTC, GBTC) crashed Bitcoin from ~$30,000 in early June to ~$17,500 by June 18—a devastating **-41.6%** drop in under three weeks.
*   **Altcoin Annihilation:** Highly correlated altcoins held in 3AC's portfolio dropped by **-60% to -80%** as block-sized market orders were dumped into illiquid order books by liquidators.
*   **The Kelly Penalty:** Funds that sized at "Half-Kelly" or "Quarter-Kelly" experienced a 10-15% drawdown but survived. Those operating at leverage multiples >1 (exceeding Kelly) were mathematically wiped out to zero.

## 4. Duration of Trend and Recovery
*   **Contagion Overhang:** The liquidation cascade depressed the market for months, dragging BTC to a final macro bottom in November 2022.
*   **Days to Recover:** It took approximately **530 days** (from June 2022) for Bitcoin to reclaim the $30,000 level and repair the structural damage caused by 3AC's over-leveraging.

## 5. Core Market Psychology & Microstructure
For algorithmic risk parameters, the Kelly Criterion fundamentally counters **human hubris and recency bias**.
*   **Illusion of Edge:** 3AC operators believed their probability of success (`p`) was near 100%, leading them to size positions at leverage (>100% of equity). When the Black Swan hit, `q` (probability of loss) materialized, multiplying against max leverage to yield instant ruin.
*   **Volatility Drag (Variance Drain):** Algorithms programmed with Kelly bounds recognize that high-volatility assets impose a "variance drain." A 50% loss requires a 100% gain to recover. Over-sizing in crypto mathematically guarantees that a standard 30% volatility wick will trigger a margin call before the "correct" directional thesis can play out.
