# The 2020 COVID-19 Liquidity Crisis (Black Thursday)

## 1. Executive Summary
The March 2020 market crash, known in crypto as "Black Thursday," was an exogenous macro shock driven by the escalating global COVID-19 pandemic. It represented a severe global liquidity crisis where all asset classes—equities, precious metals, and cryptocurrencies—were simultaneously aggressively sold for USD cash. 

## 2. Event Timeline
*   **Late February 2020:** Traditional equity markets begin experiencing severe volatility and drawdowns as COVID-19 spreads globally. Bitcoin trends downward from ~$10,000 to ~$9,000.
*   **March 11, 2020:** The World Health Organization (WHO) officially declares COVID-19 a global pandemic. Traditional risk assets plummet.
*   **March 12, 2020 (Black Thursday):** Panic sweeps the globe. A historic dash for cash triggers unprecedented sell-offs across crypto. BitMEX, the leading derivatives exchange at the time, experiences catastrophic cascading liquidations. 
*   **March 13, 2020:** BitMEX abruptly goes offline for "hardware maintenance," temporarily halting the liquidation engine and allowing market makers to restore order book sanity.

## 3. Price Impact and Drawdown Metrics
*   **Immediate Crash:** Within a 24-hour period (March 12-13), Bitcoin plunged from approximately $7,900 to a low of **$3,800**, representing an intraday drop of over **-51%**.
*   **Derivative Dislocation:** Due to the liquidation engine cascade, Bitcoin traded significantly lower on BitMEX (touching ~$3,596) compared to spot exchanges like Coinbase. 
*   **Total Drawdown:** From the February local top of ~$10,500 to the March low of $3,800, BTC experienced a **-63.8%** macro drawdown.

## 4. Recovery Duration
Despite the violent crash, the recovery was exceptionally rapid, spurred by historic monetary easing and stimulus checks (quantitative easing) from global central banks.
*   **Days to Recovery:** Bitcoin experienced a "V-shaped" recovery, reclaiming the pre-crash level of $9,000 by May 2020. This took approximately **60 days**. It definitively broke $10,000 in July 2020, solidifying a new bull market.

## 5. Core Market Psychology & Microstructure
For algorithmic trading frameworks, Black Thursday is the textbook example of a **liquidation cascade and order book failure**.
*   **Dash for Cash:** The psychology was pure survival and panic. Correlation across all asset classes temporarily went to 1.0, rendering traditional risk-parity and diversification models useless.
*   **Cascading Liquidations:** Algorithms utilizing leverage were liquidated unconditionally. BitMEX’s liquidation engine aggressively market-sold seized collateral into an illiquid order book, creating a mechanical death spiral independent of human decision-making.
*   **Mean Reversion Opportunity:** Once the forced selling mechanism was manually halted, the unprecedented deviation from moving averages presented one of the most lucrative mean-reversion trades in cryptocurrency history.
