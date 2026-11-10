# Expected Value (EV) in Highly Volatile Tail-Risk Events

## 1. Executive Summary
Expected Value (EV) is the probability-weighted average of all possible outcomes of a trade. Formula: `EV = (Probability of Win × Potential Profit) - (Probability of Loss × Potential Loss)`. In algorithmic trading, systems do not predict the future; they execute large sample sizes of positive EV (+EV) bets. The crypto market frequently presents highly asymmetric EV setups, particularly during catastrophic tail-risk events (Black Swans) where the market misprices the probability of structural failure.

## 2. Event Timeline (The Terra/LUNA Death Spiral Application)
*   **May 7, 2022:** Terra's algorithmic stablecoin, UST, slightly depegs to $0.98. Market consensus assumes it will repeg, as it had historically.
*   **May 9, 2022:** UST drops to $0.60. The algorithm begins hyper-inflating the LUNA token supply to absorb the sell pressure.
*   **May 10-12, 2022:** Quant models recognize the mathematically infinite minting loop. The probability of terminal collapse approaches 99%. Shorting LUNA becomes a massively +EV trade, as the downside (loss) is capped by short-liquidation bounds, but the upside (profit) is exponential as LUNA hyperinflates.
*   **May 13, 2022:** The Terra blockchain halts; LUNA hits $0.

## 3. Price Impact and Performance Metrics
*   **Asymmetric Payout:** LUNA dropped from ~$60 on May 8 to $0.00001 by May 13—a **-99.99%** impact. 
*   **EV Math:** If a quant system risked 1% of its portfolio to short LUNA at $30, assuming a 50% chance of a total wipeout ($0) and a 50% chance of a short squeeze (stopping out at $60), the expected value was massively skewed. As the minting mechanism broke, the probability of hitting $0 shifted to 99%, making it one of the most profitable +EV structural trades in history.
*   **Market Drag:** The forced liquidation of the Luna Foundation Guard's reserves dropped Bitcoin by **-33%** (from $39k to $26k).

## 4. Duration of Trend and Recovery
*   **Speed of Collapse:** The entire event, from localized depeg to terminal collapse, took just **6 days**.
*   **Days to Recover:** For LUNA and UST holders, recovery is **infinite (impossible)**; the assets were structurally destroyed. For Bitcoin, it took **573 days** to recover to the pre-collapse $39,000 level.

## 5. Core Market Psychology & Microstructure
For risk management, strict adherence to EV math combats **normalcy bias and the illusion of safety**.
*   **Fat-Tail Mispricing:** Retail traders assumed a $40 billion market cap project was "too big to fail" (normalcy bias). Algorithmic EV models do not respect market cap; they evaluate the mathematical solvency of the protocol.
*   **Risk/Reward Asymmetry:** The Terra collapse proves that in crypto, downside risk is rarely normally distributed. +EV systems look for setups where the market prices a Black Swan at a 1% probability, but the algorithm’s on-chain data indicates a 20% probability. Over hundreds of trades, capitalizing on this statistical mispricing generates pure alpha.
