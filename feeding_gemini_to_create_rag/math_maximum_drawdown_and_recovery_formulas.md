# Maximum Drawdown (MDD) and Asymmetric Recovery Math

## 1. Executive Summary
Maximum Drawdown (MDD) measures the largest peak-to-trough drop in a portfolio's value. The core quantitative rule of risk management is the asymmetric nature of drawdowns: the percentage gain required to recover from a loss increases exponentially as the loss deepens. Formula: `Recovery % = (1 / (1 - Drawdown %)) - 1`. The 2018 crypto winter serves as the ultimate case study in why algorithmic stop-losses must prevent drawdowns from exceeding the mathematical point of no return.

## 2. Event Timeline (The 2018 Crypto Winter Application)
*   **December 17, 2017:** Bitcoin reaches a macroeconomic cycle peak of ~$19,783. Retail euphoria is at an all-time high.
*   **January - February 2018:** Regulatory crackdowns and the popping of the ICO bubble initiate a vicious downtrend. BTC drops 50%.
*   **November 15, 2018:** The Bitcoin Cash hash war triggers terminal capitulation. 
*   **December 15, 2018:** Bitcoin hits the cycle bottom of ~$3,122. Total altcoin market cap drops by >95%.

## 3. Price Impact and Performance Metrics
*   **Peak-to-Trough Drawdown:** Bitcoin experienced a maximum drawdown of **-84.2%** from its December 2017 peak.
*   **The Asymmetric Recovery Trap:**
    *   A 10% drawdown requires an **11.1%** gain to break even.
    *   A 20% drawdown requires a **25%** gain to break even.
    *   A 50% drawdown requires a **100%** gain to break even.
    *   Bitcoin’s **-84.2%** drawdown required a mathematically staggering **+533%** gain just to return to the break-even price of $19,783.
*   **Altcoin Ruin:** An altcoin dropping -95% requires a **+1,900%** gain to recover. 99% of ICO tokens never recovered their all-time highs because the requisite capital inflows were practically impossible.

## 4. Duration of Trend and Recovery
*   **Days of Drawdown:** The relentless bleed of the bear market lasted exactly **363 days** (Dec 2017 to Dec 2018).
*   **Days to Recover:** Due to the sheer magnitude of the +533% recovery requirement, it took precisely **1,095 days** (exactly three years) for Bitcoin to definitively break $19,783 again in December 2020. 

## 5. Core Market Psychology & Microstructure
For an algorithmic trading AI, MDD constraints solve the psychological flaws of **loss aversion and the disposition effect**.
*   **Holding "Bags":** Human traders refuse to realize a 20% loss, hoping it will bounce back. As the asset falls 50%, 70%, and 80%, they become mathematically trapped, unable to sell due to the sheer size of the realized loss.
*   **Algorithmic Cut-offs:** A robust quantitative model enforces hard MDD limits (e.g., maximum portfolio exposure risk of 15%). By cutting positions early, the algorithm ensures that the portfolio remains on the linear (manageable) part of the recovery curve, preserving capital for future high-probability setups.
