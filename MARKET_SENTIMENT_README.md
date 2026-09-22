# Market Sentiment Analyzer

Fetches financial news and social media data on a scheduled interval, scores each headline/post using **VADER NLP**, and produces a per-symbol sentiment report in both **JSON** and **interactive HTML**.

---

## Features

- Pulls from **5 Indian financial RSS feeds** — no API key required
- Optionally pulls from **NewsAPI** (per-symbol search, free tier)
- Optionally pulls from **Reddit** (r/IndiaInvestments, r/stocks, r/StockMarket, r/IndianStreetBets)
- Optional **Twitter/X** support (commented out — requires paid Bearer Token)
- Scores every headline with **VADER** (offline, no LLM cost)
- Runs **every N hours** via `schedule` or once on demand
- Outputs `sentiment_report.json` + `sentiment_report.html` (click-to-drill interactive cards)

---

## Quick Start

### 1. Install dependencies

```bash
pip install vaderSentiment feedparser requests schedule
```

Or if the project uses `uv`:

```bash
uv add vaderSentiment feedparser requests schedule
```

### 2. Set API keys (optional but recommended)

```bash
# NewsAPI — free at https://newsapi.org (100 req/day)
export NEWS_API_KEY=your_key_here

# Reddit — free at https://www.reddit.com/prefs/apps (create a "script" app)
export REDDIT_CLIENT_ID=your_client_id
export REDDIT_CLIENT_SECRET=your_client_secret
```

> RSS feeds work immediately with **no keys**. They cover Economic Times, Moneycontrol, Livemint, BusinessLine, and NDTV Profit.

### 3. Run

```bash
# Run once and exit
python market_sentiment.py --run-once

# Run every 2 hours (default)
python market_sentiment.py

# Run every 1 hour for specific symbols
python market_sentiment.py --symbols RELIANCE INFY NIFTY HDFCBANK --interval 1
```

---

## CLI Reference

| Argument | Default | Description |
|---|---|---|
| `--symbols SYM [SYM ...]` | 10 large-caps + NIFTY/SENSEX | NSE symbols to track (no suffix) |
| `--interval HOURS` | `2` | How often to fetch and score |
| `--run-once` | — | Fetch once and exit immediately |

---

## Output Files

Both files are written to the **current working directory** after every run.

### `sentiment_report.json`

```json
{
  "generated_at": "2026-09-22T17:12:53Z",
  "symbols": {
    "NIFTY": {
      "overall": "positive",
      "avg_compound": 0.2931,
      "positive": 8,
      "negative": 4,
      "neutral": 0,
      "total": 12,
      "items": [
        {
          "source": "RSS:BusinessLine Markets",
          "symbol": "NIFTY",
          "headline": "Nifty Prediction Today — Bullish. Go long",
          "url": "https://...",
          "compound": 0.7964,
          "label": "positive",
          "fetched_at": "2026-09-22T17:12:53Z"
        }
      ]
    }
  }
}
```

### `sentiment_report.html`

Self-contained interactive report — open in any browser, no server needed.

- **Symbol cards** sorted by absolute sentiment strength
- Colour-coded badge: `POSITIVE` / `NEGATIVE` / `NEUTRAL`
- VADER compound score (`-1.0` to `+1.0`)
- Stacked bar showing positive / negative / neutral split
- **Click any card** → expands full headline table with source, link, and score

---

## Data Sources

| Source | Key needed | Cost | What it provides |
|---|---|---|---|
| RSS (ET, Moneycontrol, Livemint, BusinessLine, NDTV) | None | Free | Latest market headlines, ~150–200 per run |
| NewsAPI | `NEWS_API_KEY` | Free (100 req/day) | Per-symbol targeted search |
| Reddit | `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` | Free | Community posts from 4 investing subreddits |
| Twitter/X | `TWITTER_BEARER_TOKEN` | ~$100/mo (Basic plan) | Real-time tweet stream per symbol |

### Enabling Twitter/X

Uncomment the `fetch_twitter` function and `TWITTER_BEARER_TOKEN` lines near the bottom of `market_sentiment.py`, then set:

```bash
export TWITTER_BEARER_TOKEN=your_bearer_token
```

And add this line inside `run_analysis()`:

```python
all_items.extend(fetch_twitter(symbols))
```

---

## Sentiment Scoring — VADER

[VADER](https://github.com/cjhutto/vaderSentiment) (Valence Aware Dictionary and sEntiment Reasoner) is a rule-based model tuned for short, informal financial text.

| Score range | Label |
|---|---|
| `compound >= +0.05` | `positive` |
| `compound <= -0.05` | `negative` |
| `-0.05 < compound < +0.05` | `neutral` |

The threshold (`SENTIMENT_THRESHOLD = 0.05`) is configurable at the top of the script.

**Per-symbol aggregation:**

```
avg_compound = mean(compound scores for all articles mentioning the symbol)
overall      = positive / negative / neutral based on avg_compound vs threshold
```

Articles that don't mention any tracked symbol are bucketed under `"MARKET"` for general market sentiment.

---

## Symbol Matching

Symbols are matched case-insensitively. Built-in aliases:

| Symbol | Also matches |
|---|---|
| `NIFTY` | NIFTY 50, NIFTY50, NSE 50 |
| `SENSEX` | BSE SENSEX, BSE 30, SENSEX 30 |
| `BANKNIFTY` | BANK NIFTY, NIFTY BANK |

Add more aliases inside `symbol_in_text()` in the script.

---

## Integrating into Another Project

### Import as a module

```python
from market_sentiment import run_analysis, aggregate, fetch_rss, fetch_newsapi, fetch_reddit

# Fetch and score, get structured result back
import market_sentiment as ms

symbols = ["RELIANCE", "NIFTY", "INFY"]
items = ms.fetch_rss(symbols) + ms.fetch_newsapi(symbols)
buckets = ms.aggregate(items)

for sym, b in buckets.items():
    print(f"{sym}: {b.overall}  avg={b.avg_compound:+.4f}  n={b.total}")
```

### Use the JSON output in another script

```python
import json

with open("sentiment_report.json") as f:
    report = json.load(f)

nifty = report["symbols"].get("NIFTY", {})
print(nifty["overall"])        # "positive"
print(nifty["avg_compound"])   # 0.2931
print(nifty["total"])          # 12
```

### Scheduled background job (APScheduler)

```python
from apscheduler.schedulers.background import BackgroundScheduler
from market_sentiment import run_analysis

scheduler = BackgroundScheduler()
scheduler.add_job(run_analysis, "interval", hours=2, args=[["NIFTY", "RELIANCE"]])
scheduler.start()
```

---

## Configuration Reference

All constants are at the top of `market_sentiment.py`:

| Constant | Default | Description |
|---|---|---|
| `NEWS_API_KEY` | env `NEWS_API_KEY` | NewsAPI key |
| `REDDIT_CLIENT_ID` | env `REDDIT_CLIENT_ID` | Reddit app client ID |
| `REDDIT_CLIENT_SECRET` | env `REDDIT_CLIENT_SECRET` | Reddit app secret |
| `REDDIT_USER_AGENT` | `"MarketSentimentBot/1.0"` | Reddit API user-agent string |
| `DEFAULT_SYMBOLS` | 10 large-caps + indices | Symbols when none passed via CLI |
| `SUBREDDITS` | 4 investing subreddits | Reddit communities to scan |
| `RSS_FEEDS` | 5 Indian financial feeds | Dict of `name → URL` |
| `REDDIT_POST_LIMIT` | `50` | Posts per subreddit per sort (max 100) |
| `SENTIMENT_THRESHOLD` | `0.05` | VADER compound cutoff for pos/neg |
| `OUTPUT_FILE` | `"sentiment_report.json"` | JSON output path |
| `OUTPUT_HTML_FILE` | `"sentiment_report.html"` | HTML output path |

---

## Project Structure

```
market_sentiment.py        # Main script — all logic in one file
sentiment_report.json      # Generated after each run
sentiment_report.html      # Generated after each run (interactive)
```

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| `vaderSentiment` | `>=3.3.2` | NLP sentiment scoring |
| `feedparser` | `>=6.0` | RSS/Atom feed parsing |
| `requests` | `>=2.28` | HTTP — NewsAPI, Reddit, RSS fetch |
| `schedule` | `>=1.2` | Interval scheduling |

All are available on PyPI. No C extensions, no GPU required, runs fully offline once packages are installed (RSS/Reddit/NewsAPI calls obviously need internet at run time).

---

## Limitations

- **VADER is rule-based** — it can misread sarcasm, mixed signals, or domain-specific jargon. For higher accuracy, replace `score()` with a call to an LLM (Claude, GPT-4) or a finance-tuned model (FinBERT).
- **RSS articles aren't real-time** — typical delay is 10–30 minutes behind publication.
- **Symbol matching is keyword-based** — a headline about "Tata Motors sales" will match if `TATAMOTORS` is in the alias list, but only if spelled close enough. Short ticker names (`TCS`, `SBI`) can produce false positives.
- **NewsAPI free tier** caps at 100 requests/day and returns articles up to 1 month old.
- **Reddit API** rate-limits unauthenticated apps; client-credentials OAuth (used here) is well within limits for personal use.
