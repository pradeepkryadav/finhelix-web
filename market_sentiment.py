"""
Market Sentiment Analyzer
==========================
Fetches news (NewsAPI + RSS) and social media (Reddit) data every N hours,
scores each headline/post with VADER, and produces a per-symbol sentiment report.

Usage:
    pip install vaderSentiment requests feedparser schedule

    # Run once (no loop):
    python market_sentiment.py --run-once

    # Run every 2 hours in the foreground:
    python market_sentiment.py --interval 2

    # Analyse specific symbols:
    python market_sentiment.py --symbols RELIANCE INFY SBIN --interval 1

Dependencies:
    vaderSentiment    pip install vaderSentiment
    feedparser        pip install feedparser
    requests          pip install requests
    schedule          pip install schedule

Optional (Twitter/X):  See the TWITTER section at the bottom — requires a
                        Bearer Token from developer.twitter.com (paid tier).

API keys needed:
    NEWS_API_KEY  — free at https://newsapi.org  (100 req/day on free tier)
    REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET — free at https://www.reddit.com/prefs/apps
    (Bearer Token for Twitter/X — optional, paid)
"""

import argparse
import json
import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

import feedparser
import requests
import schedule
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# ─────────────────────────── CONFIG ──────────────────────────────

NEWS_API_KEY = os.getenv("NEWS_API_KEY", "YOUR_NEWSAPI_KEY_HERE")

REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID", "YOUR_REDDIT_CLIENT_ID")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET", "YOUR_REDDIT_CLIENT_SECRET")
REDDIT_USER_AGENT = os.getenv("REDDIT_USER_AGENT", "MarketSentimentBot/1.0")

# Symbols to track — use NSE names, no suffix
DEFAULT_SYMBOLS = [
    "RELIANCE", "INFY", "TCS", "HDFCBANK", "ICICIBANK",
    "SBIN", "WIPRO", "TATAMOTORS", "NIFTY", "SENSEX",
]

# Subreddits to scan
SUBREDDITS = ["IndiaInvestments", "stocks", "StockMarket", "IndianStreetBets"]

# Indian financial RSS feeds (no API key needed)
RSS_FEEDS = {
    "Economic Times Markets": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
    "Moneycontrol Latest":    "https://www.moneycontrol.com/rss/latestnews.xml",
    "Livemint Markets":       "https://www.livemint.com/rss/markets",
    "BusinessLine Markets":   "https://www.thehindubusinessline.com/markets/feeder/default.rss",
    "NDTV Profit":            "https://feeds.feedburner.com/ndtvprofit-latest",
}

# How many Reddit posts to fetch per subreddit (max 100)
REDDIT_POST_LIMIT = 50

# Minimum compound VADER score to count as positive/negative (rest = neutral)
SENTIMENT_THRESHOLD = 0.05

# Output files
OUTPUT_FILE      = "sentiment_report.json"
OUTPUT_HTML_FILE = "sentiment_report.html"

# ─────────────────────────── DATA TYPES ──────────────────────────

@dataclass
class SentimentItem:
    source: str
    symbol: str
    headline: str
    url: str
    compound: float
    label: str          # positive / negative / neutral
    fetched_at: str


@dataclass
class SymbolSentiment:
    symbol: str
    total: int = 0
    positive: int = 0
    negative: int = 0
    neutral: int = 0
    avg_compound: float = 0.0
    overall: str = "neutral"
    items: list = field(default_factory=list)


# ─────────────────────────── HELPERS ─────────────────────────────

analyzer = SentimentIntensityAnalyzer()


def score(text: str) -> tuple[float, str]:
    """Return (compound, label) for a piece of text."""
    vs = analyzer.polarity_scores(text)
    c = vs["compound"]
    if c >= SENTIMENT_THRESHOLD:
        return c, "positive"
    if c <= -SENTIMENT_THRESHOLD:
        return c, "negative"
    return c, "neutral"


def symbol_in_text(symbol: str, text: str) -> bool:
    """True if the symbol (or common alias) appears in text (case-insensitive)."""
    text_upper = text.upper()
    if symbol.upper() in text_upper:
        return True
    # Aliases for indices
    aliases = {
        "NIFTY":   ["NIFTY 50", "NIFTY50", "NSE 50"],
        "SENSEX":  ["BSE SENSEX", "BSE 30", "SENSEX 30"],
        "BANKNIFTY": ["BANK NIFTY", "NIFTY BANK"],
    }
    for alias in aliases.get(symbol.upper(), []):
        if alias.upper() in text_upper:
            return True
    return False


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ─────────────────────────── FETCHERS ────────────────────────────

def fetch_newsapi(symbols: list[str]) -> list[SentimentItem]:
    """Fetch recent headlines from NewsAPI for given symbols."""
    if NEWS_API_KEY == "YOUR_NEWSAPI_KEY_HERE":
        print("  [NewsAPI] Skipped — NEWS_API_KEY not set.")
        return []

    items: list[SentimentItem] = []
    for symbol in symbols:
        url = (
            "https://newsapi.org/v2/everything"
            f"?q={symbol}+stock+NSE+BSE"
            "&language=en"
            "&sortBy=publishedAt"
            "&pageSize=20"
            f"&apiKey={NEWS_API_KEY}"
        )
        try:
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            articles = resp.json().get("articles", [])
            for a in articles:
                headline = (a.get("title") or "") + " " + (a.get("description") or "")
                c, label = score(headline)
                items.append(SentimentItem(
                    source="NewsAPI",
                    symbol=symbol,
                    headline=(a.get("title") or "")[:200],
                    url=a.get("url", ""),
                    compound=round(c, 4),
                    label=label,
                    fetched_at=now_iso(),
                ))
        except requests.RequestException as e:
            print(f"  [NewsAPI] Error for {symbol}: {e}")

    print(f"  [NewsAPI] Fetched {len(items)} articles.")
    return items


def fetch_rss(symbols: list[str]) -> list[SentimentItem]:
    """Scrape Indian financial RSS feeds and match headlines to symbols."""
    items: list[SentimentItem] = []
    for feed_name, feed_url in RSS_FEEDS.items():
        try:
            # feedparser needs a real User-Agent; many feeds block the default
            raw = requests.get(
                feed_url,
                timeout=10,
                headers={"User-Agent": "Mozilla/5.0 (MarketSentimentBot)"},
            )
            feed = feedparser.parse(raw.text)
            for entry in feed.entries[:50]:
                title = entry.get("title", "")
                summary = entry.get("summary", "")
                full_text = title + " " + summary
                link = entry.get("link", "")

                # Find which symbols this article mentions
                matched = [s for s in symbols if symbol_in_text(s, full_text)]
                if not matched:
                    matched = ["MARKET"]   # general market sentiment

                c, label = score(full_text)
                for sym in matched:
                    items.append(SentimentItem(
                        source=f"RSS:{feed_name}",
                        symbol=sym,
                        headline=title[:200],
                        url=link,
                        compound=round(c, 4),
                        label=label,
                        fetched_at=now_iso(),
                    ))
        except Exception as e:
            print(f"  [RSS:{feed_name}] Error: {e}")

    print(f"  [RSS] Fetched {len(items)} items across all feeds.")
    return items


def _get_reddit_token() -> Optional[str]:
    """Exchange client credentials for a Reddit OAuth2 token."""
    if REDDIT_CLIENT_ID == "YOUR_REDDIT_CLIENT_ID":
        return None
    try:
        resp = requests.post(
            "https://www.reddit.com/api/v1/access_token",
            auth=(REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET),
            data={"grant_type": "client_credentials"},
            headers={"User-Agent": REDDIT_USER_AGENT},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get("access_token")
    except requests.RequestException as e:
        print(f"  [Reddit] Auth error: {e}")
        return None


def fetch_reddit(symbols: list[str]) -> list[SentimentItem]:
    """Fetch top/new posts from financial subreddits and match symbols."""
    token = _get_reddit_token()
    if token is None:
        print("  [Reddit] Skipped — REDDIT_CLIENT_ID not set or auth failed.")
        return []

    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": REDDIT_USER_AGENT,
    }
    items: list[SentimentItem] = []

    for subreddit in SUBREDDITS:
        for sort in ("hot", "new"):
            url = (
                f"https://oauth.reddit.com/r/{subreddit}/{sort}"
                f"?limit={REDDIT_POST_LIMIT}"
            )
            try:
                resp = requests.get(url, headers=headers, timeout=10)
                resp.raise_for_status()
                posts = resp.json().get("data", {}).get("children", [])
                for post in posts:
                    d = post.get("data", {})
                    title = d.get("title", "")
                    selftext = d.get("selftext", "")[:300]
                    full_text = title + " " + selftext
                    link = "https://reddit.com" + d.get("permalink", "")

                    matched = [s for s in symbols if symbol_in_text(s, full_text)]
                    if not matched:
                        matched = ["MARKET"]

                    c, label = score(full_text)
                    for sym in matched:
                        items.append(SentimentItem(
                            source=f"Reddit:r/{subreddit}",
                            symbol=sym,
                            headline=title[:200],
                            url=link,
                            compound=round(c, 4),
                            label=label,
                            fetched_at=now_iso(),
                        ))
            except requests.RequestException as e:
                print(f"  [Reddit:r/{subreddit}/{sort}] Error: {e}")

    print(f"  [Reddit] Fetched {len(items)} posts.")
    return items


# ──────────────────────── OPTIONAL: TWITTER/X ────────────────────
# Requires a Bearer Token from developer.twitter.com (Basic plan ~$100/mo).
# Uncomment and set TWITTER_BEARER_TOKEN to enable.
#
# TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN", "")
#
# def fetch_twitter(symbols: list[str]) -> list[SentimentItem]:
#     items = []
#     headers = {"Authorization": f"Bearer {TWITTER_BEARER_TOKEN}"}
#     for symbol in symbols:
#         url = (
#             "https://api.twitter.com/2/tweets/search/recent"
#             f"?query={symbol}%20NSE%20stock%20lang:en&max_results=50"
#             "&tweet.fields=created_at,text"
#         )
#         try:
#             resp = requests.get(url, headers=headers, timeout=10)
#             resp.raise_for_status()
#             for tweet in resp.json().get("data", []):
#                 c, label = score(tweet["text"])
#                 items.append(SentimentItem(
#                     source="Twitter",
#                     symbol=symbol,
#                     headline=tweet["text"][:200],
#                     url="",
#                     compound=round(c, 4),
#                     label=label,
#                     fetched_at=now_iso(),
#                 ))
#         except requests.RequestException as e:
#             print(f"  [Twitter] Error for {symbol}: {e}")
#     print(f"  [Twitter] Fetched {len(items)} tweets.")
#     return items


# ─────────────────────────── AGGREGATOR ──────────────────────────

def aggregate(items: list[SentimentItem]) -> dict[str, SymbolSentiment]:
    """Group items by symbol and compute aggregate scores."""
    buckets: dict[str, SymbolSentiment] = {}
    for item in items:
        if item.symbol not in buckets:
            buckets[item.symbol] = SymbolSentiment(symbol=item.symbol)
        b = buckets[item.symbol]
        b.total += 1
        b.items.append(item.__dict__)
        if item.label == "positive":
            b.positive += 1
        elif item.label == "negative":
            b.negative += 1
        else:
            b.neutral += 1

    for sym, b in buckets.items():
        if b.total:
            total_compound = sum(i["compound"] for i in b.items)
            b.avg_compound = round(total_compound / b.total, 4)
        if b.avg_compound >= SENTIMENT_THRESHOLD:
            b.overall = "positive"
        elif b.avg_compound <= -SENTIMENT_THRESHOLD:
            b.overall = "negative"
        else:
            b.overall = "neutral"

    return buckets


def print_report(buckets: dict[str, SymbolSentiment]) -> None:
    """Print a nicely formatted console summary."""
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n{'='*60}")
    print(f"  MARKET SENTIMENT REPORT  —  {ts}")
    print(f"{'='*60}")
    print(f"{'SYMBOL':<16} {'OVERALL':<10} {'AVG':<8} {'POS':>5} {'NEG':>5} {'NEU':>5} {'TOTAL':>7}")
    print(f"{'-'*60}")
    for sym, b in sorted(buckets.items(), key=lambda x: abs(x[1].avg_compound), reverse=True):
        icon = "+" if b.overall == "positive" else ("-" if b.overall == "negative" else "~")
        print(
            f"{sym:<16} [{icon}]{b.overall:<8} {b.avg_compound:>+.4f}  "
            f"{b.positive:>5} {b.negative:>5} {b.neutral:>5} {b.total:>7}"
        )
    print(f"{'='*60}\n")


def save_html_report(buckets: dict[str, SymbolSentiment], generated_at: str) -> None:
    """Write a self-contained interactive HTML report."""

    def badge(label: str) -> str:
        colors = {"positive": "#16a34a", "negative": "#dc2626", "neutral": "#6b7280"}
        return (
            f'<span style="background:{colors.get(label,"#6b7280")};color:#fff;'
            f'padding:2px 8px;border-radius:99px;font-size:0.75rem;font-weight:600;">'
            f'{label.upper()}</span>'
        )

    def bar(pos: int, neg: int, neu: int, total: int) -> str:
        if total == 0:
            return ""
        pw = round(pos / total * 100)
        nw = round(neg / total * 100)
        ew = 100 - pw - nw
        return (
            f'<div style="display:flex;height:8px;border-radius:4px;overflow:hidden;min-width:120px;">'
            f'<div style="width:{pw}%;background:#16a34a;"></div>'
            f'<div style="width:{nw}%;background:#dc2626;"></div>'
            f'<div style="width:{ew}%;background:#d1d5db;"></div>'
            f'</div>'
        )

    # Summary cards
    sorted_syms = sorted(buckets.items(), key=lambda x: abs(x[1].avg_compound), reverse=True)
    cards_html = ""
    for sym, b in sorted_syms:
        arrow = "▲" if b.overall == "positive" else ("▼" if b.overall == "negative" else "◆")
        arrow_color = "#16a34a" if b.overall == "positive" else ("#dc2626" if b.overall == "negative" else "#6b7280")
        cards_html += f"""
        <div class="card" onclick="showDetails('{sym}')">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:1.1rem;font-weight:700;">{sym}</span>
            <span style="font-size:1.4rem;color:{arrow_color};font-weight:700;">{arrow}</span>
          </div>
          <div style="margin:8px 0;">{badge(b.overall)}</div>
          <div style="font-size:1.6rem;font-weight:800;color:{arrow_color};">{b.avg_compound:+.3f}</div>
          <div style="font-size:0.75rem;color:#6b7280;margin:4px 0;">{b.total} articles</div>
          {bar(b.positive, b.negative, b.neutral, b.total)}
          <div style="display:flex;gap:12px;margin-top:6px;font-size:0.72rem;">
            <span style="color:#16a34a;">▲ {b.positive}</span>
            <span style="color:#dc2626;">▼ {b.negative}</span>
            <span style="color:#6b7280;">◆ {b.neutral}</span>
          </div>
        </div>"""

    # Detail panels (hidden by default)
    details_html = ""
    for sym, b in sorted_syms:
        rows = ""
        for item in sorted(b.items, key=lambda x: abs(x["compound"]), reverse=True):
            c = item["compound"]
            lbl = item["label"]
            c_color = "#16a34a" if lbl == "positive" else ("#dc2626" if lbl == "negative" else "#6b7280")
            src_short = item["source"].replace("RSS:", "").replace("Reddit:", "")
            link = f'<a href="{item["url"]}" target="_blank" style="color:#2563eb;text-decoration:none;">{item["headline"]}</a>' if item["url"] else item["headline"]
            rows += f"""
            <tr>
              <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:0.78rem;color:#64748b;white-space:nowrap;">{src_short}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:0.82rem;">{link}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:{c_color};white-space:nowrap;">{c:+.3f}</td>
            </tr>"""
        details_html += f"""
        <div id="detail-{sym}" class="detail-panel" style="display:none;">
          <h3 style="margin:0 0 12px;font-size:1rem;">{sym} — {b.total} articles &nbsp; {badge(b.overall)}</h3>
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#f8fafc;font-size:0.75rem;color:#64748b;text-transform:uppercase;">
                  <th style="padding:6px 8px;text-align:left;">Source</th>
                  <th style="padding:6px 8px;text-align:left;">Headline</th>
                  <th style="padding:6px 8px;text-align:right;">Score</th>
                </tr>
              </thead>
              <tbody>{rows}</tbody>
            </table>
          </div>
        </div>"""

    # Source breakdown for footer
    all_items_flat = [i for b in buckets.values() for i in b.items]
    source_counts: dict[str, int] = {}
    for i in all_items_flat:
        k = i["source"].split(":")[0]
        source_counts[k] = source_counts.get(k, 0) + 1
    sources_str = " &nbsp;|&nbsp; ".join(
        f'<span style="color:#94a3b8;">{k}</span> <strong>{v}</strong>' for k, v in source_counts.items()
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Market Sentiment — {generated_at[:10]}</title>
<style>
  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
         background: #f8fafc; color: #1e293b; min-height: 100vh; }}
  .header {{ background: #0f172a; color: #f1f5f9; padding: 20px 32px;
             display: flex; align-items: center; justify-content: space-between; }}
  .header h1 {{ font-size: 1.25rem; font-weight: 700; letter-spacing: -0.02em; }}
  .header .ts {{ font-size: 0.8rem; color: #94a3b8; }}
  .main {{ max-width: 1200px; margin: 0 auto; padding: 24px 20px; }}
  .cards {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 14px; margin-bottom: 24px; }}
  .card {{ background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
           padding: 16px; cursor: pointer; transition: box-shadow .15s, transform .15s; }}
  .card:hover {{ box-shadow: 0 4px 16px rgba(0,0,0,.1); transform: translateY(-2px); }}
  .card.active {{ border-color: #2563eb; box-shadow: 0 0 0 2px #bfdbfe; }}
  .detail-box {{ background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
                 padding: 20px; margin-bottom: 24px; min-height: 60px; }}
  .detail-placeholder {{ color: #94a3b8; font-size: 0.9rem; text-align: center; padding: 20px; }}
  .footer {{ font-size: 0.75rem; color: #94a3b8; text-align: center; padding: 16px;
             border-top: 1px solid #e2e8f0; margin-top: 8px; }}
  a:hover {{ text-decoration: underline !important; }}
</style>
</head>
<body>
<div class="header">
  <h1>📊 Market Sentiment Report</h1>
  <span class="ts">Generated {generated_at} UTC &nbsp;|&nbsp; VADER NLP &nbsp;|&nbsp; {len(buckets)} symbols</span>
</div>
<div class="main">
  <div class="cards">{cards_html}</div>
  <div class="detail-box" id="detail-box">
    <div class="detail-placeholder" id="detail-placeholder">Click a symbol card to see all headlines ↑</div>
    {details_html}
  </div>
</div>
<div class="footer">
  Sources &nbsp;|&nbsp; {sources_str}
  &nbsp;&nbsp;·&nbsp;&nbsp; Threshold ±{SENTIMENT_THRESHOLD}
  &nbsp;&nbsp;·&nbsp;&nbsp; OpenAlgo Market Sentiment
</div>
<script>
  let active = null;
  function showDetails(sym) {{
    if (active) {{
      document.getElementById('detail-' + active).style.display = 'none';
      document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
    }}
    if (active === sym) {{ active = null; document.getElementById('detail-placeholder').style.display=''; return; }}
    active = sym;
    document.getElementById('detail-placeholder').style.display = 'none';
    document.getElementById('detail-' + sym).style.display = 'block';
    document.querySelectorAll('.card').forEach(c => {{
      if (c.onclick.toString().includes("'" + sym + "'")) c.classList.add('active');
    }});
    document.getElementById('detail-box').scrollIntoView({{behavior:'smooth', block:'nearest'}});
  }}
</script>
</body>
</html>"""

    with open(OUTPUT_HTML_FILE, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"  HTML report saved to {OUTPUT_HTML_FILE}")


def save_report(buckets: dict[str, SymbolSentiment]) -> None:
    """Write the full report to OUTPUT_FILE as JSON and HTML."""
    ts = now_iso()
    report = {
        "generated_at": ts,
        "symbols": {
            sym: {
                "overall": b.overall,
                "avg_compound": b.avg_compound,
                "positive": b.positive,
                "negative": b.negative,
                "neutral": b.neutral,
                "total": b.total,
                "items": b.items,
            }
            for sym, b in buckets.items()
        },
    }
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"  Report saved to {OUTPUT_FILE}")
    save_html_report(buckets, ts)


# ─────────────────────────── MAIN RUN ────────────────────────────

def run_analysis(symbols: list[str]) -> None:
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Starting sentiment fetch for: {', '.join(symbols)}")

    all_items: list[SentimentItem] = []
    all_items.extend(fetch_newsapi(symbols))
    all_items.extend(fetch_rss(symbols))
    all_items.extend(fetch_reddit(symbols))
    # all_items.extend(fetch_twitter(symbols))   # uncomment when Twitter enabled

    if not all_items:
        print("  No items fetched — check API keys and network connectivity.")
        return

    buckets = aggregate(all_items)
    print_report(buckets)
    save_report(buckets)


# ─────────────────────────── ENTRY POINT ─────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Market Sentiment Analyzer")
    parser.add_argument(
        "--symbols", nargs="+", default=DEFAULT_SYMBOLS,
        metavar="SYMBOL",
        help="NSE symbols to track (default: 10 large-caps + indices)",
    )
    parser.add_argument(
        "--interval", type=float, default=2.0, metavar="HOURS",
        help="How often to run (hours). Default: 2",
    )
    parser.add_argument(
        "--run-once", action="store_true",
        help="Run once and exit (ignores --interval)",
    )
    args = parser.parse_args()

    symbols = [s.upper() for s in args.symbols]

    if args.run_once:
        run_analysis(symbols)
        return

    interval_hours = max(0.1, args.interval)
    interval_seconds = interval_hours * 3600

    print(f"Sentiment analyzer starting — running every {interval_hours}h for {', '.join(symbols)}")
    print(f"Press Ctrl+C to stop.\n")

    # Run immediately, then on schedule
    run_analysis(symbols)

    schedule.every(interval_hours).hours.do(run_analysis, symbols=symbols)

    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == "__main__":
    main()
