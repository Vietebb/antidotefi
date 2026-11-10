# System Directive: Source Credibility Weights & False-Positive Contagion

## 1. Executive Summary
For an algorithmic trading AI, treating all news sources with equal validity guarantees catastrophic execution errors. The system must enforce strict "Source Credibility Weights" (e.g., Bloomberg/Reuters = High Trust [1.0 multiplier]; Unverified Twitter/Reddit = Low Trust [0.1 multiplier]). To illustrate the necessity of this directive, this file analyzes the October 2023 Cointelegraph fake Bitcoin ETF approval—a textbook case study in the dangers of algorithmic overreaction to Tier-3 news sources.

## 2. Event Timeline (The Cointelegraph Fake ETF Tweet)
*   **October 16, 2023 (09:21 AM EST):** Cointelegraph, a crypto-native media outlet (Tier-3 credibility), posts on X (Twitter): "BREAKING: SEC APPROVES ISHARES BITCOIN SPOT ETF." No primary sources (SEC EDGAR, BlackRock, Reuters) corroborate the claim.
*   **09:21 - 09:28 AM EST:** HFT algorithms globally scrape the "BREAKING" headline and execute massive market buy orders, ignoring the lack of Tier-1 verification.
*   **09:30 AM EST:** Fox Business reporter Eleanor Terrett and Bloomberg analysts tweet that BlackRock has confirmed the report is false.
*   **09:45 AM EST:** Cointelegraph deletes the original tweet and issues an apology for publishing unverified rumors.

## 3. Price Impact and Performance Metrics
*   **The Fake Squeeze:** Within exactly 7 minutes of the unverified tweet, algorithmic buying forced Bitcoin from ~$27,900 to a peak of $30,000, representing a violent **+7.5%** intraday spike.
*   **The Correction Dump:** The moment Tier-1 sources (Bloomberg/BlackRock) denied the rumor, algorithms instantly reversed their positions. Bitcoin crashed from $30,000 back down to ~$28,000, a **-6.6%** drop, wiping out late buyers.
*   **Collateral Damage:** The 20-minute whiplash caused over **$100 million** in leveraged derivative liquidations (both shorts on the way up, and longs on the way down).

## 4. Duration of Trend and Recovery
*   **Duration of the Anomaly:** The entire false-positive market cycle lasted less than **30 minutes**.
*   **Days to Recover (Narrative):** The event actually highlighted immense pent-up demand. While the intraday price recovered to baseline in an hour, it took **7 days** for BTC to organically trend back above $30,000 as real ETF anticipation built.

## 5. Core Market Psychology & System Directives
The system must dynamically adjust position sizing based on Source Credibility.
*   **Tier 1 (Multiplier 1.0):** SEC EDGAR, Reuters, Bloomberg, Official Corporate Press Releases. *Directive: Authorize maximum permitted capital allocation upon sentiment trigger.*
*   **Tier 2 (Multiplier 0.5):** Verified journalists on X, Tier-1 crypto media (CoinDesk), prominent on-chain analytics. *Directive: Authorize half-sizing; wait for Tier 1 confirmation to scale.*
*   **Tier 3 (Multiplier 0.0 - 0.1):** Reddit, 4chan, unverified Telegram groups, Cointelegraph social media. *Directive: Do not execute market orders. Flag for human review or wait for Tier 2/1 corroboration.*
*   **The FOMO Vulnerability:** Algorithms without source-weighting suffer from the same "FOMO" as retail traders. Waiting 3 minutes for Reuters to confirm a tweet may cost 1% of the initial move, but it saves 100% of the portfolio from a false-positive liquidation wick.
