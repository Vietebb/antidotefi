#!/usr/bin/env python3
"""
scripts/register_webhook.py
1-Click CLI Manager to Inspect, Set, or Remove the Telegram Bot Webhook.
Usage:
    python scripts/register_webhook.py                     # Inspect current webhook status
    python scripts/register_webhook.py --set <VERCEL_URL>  # Set webhook (e.g. https://antidote-eight.vercel.app)
    python scripts/register_webhook.py --delete            # Remove webhook and switch to manual polling
"""

import os
import sys
import json
import urllib.request
import urllib.parse
from pathlib import Path

def find_bot_token():
    # 1. Environment variable
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if token:
        return token.strip()

    # 2. Check local .env files
    search_paths = [
        Path(".env"),
        Path(".env.local"),
        Path("../.env"),
        Path("../.env.local"),
        Path(__file__).resolve().parent.parent / ".env",
        Path(__file__).resolve().parent.parent / ".env.local",
    ]

    for p in search_paths:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("TELEGRAM_BOT_TOKEN="):
                            return line.split("=", 1)[1].strip().strip('"').strip("'")
            except Exception:
                pass

    return None

BOT_TOKEN = find_bot_token()

def call_telegram_api(method, payload=None):
    if not BOT_TOKEN:
        print("[-] ERROR: TELEGRAM_BOT_TOKEN not found in environment or .env files.")
        sys.exit(1)

    url = f"https://api.telegram.org/bot{BOT_TOKEN}/{method}"
    data = json.dumps(payload).encode("utf-8") if payload else None
    headers = {"Content-Type": "application/json"} if payload else {}

    req = urllib.request.Request(url, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            return json.loads(res_body)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return json.loads(err_body)
        except Exception:
            return {"ok": False, "error_code": e.code, "description": err_body}
    except Exception as e:
        return {"ok": False, "description": str(e)}

def print_banner():
    print("=" * 60)
    print(" QUANT TERMINAL // TELEGRAM WEBHOOK MANAGER (1-CLICK)")
    print("=" * 60)

def main():
    print_banner()

    if len(sys.argv) > 2 and sys.argv[1] == "--set":
        raw_url = sys.argv[2].strip()
        if not raw_url.startswith("http://") and not raw_url.startswith("https://"):
            raw_url = "https://" + raw_url
        if not raw_url.endswith("/api/webhook"):
            webhook_url = raw_url.rstrip("/") + "/api/webhook"
        else:
            webhook_url = raw_url

        print(f"[*] Registering Telegram Webhook to:")
        print(f"    -> {webhook_url}")
        res = call_telegram_api("setWebhook", {
            "url": webhook_url,
            "drop_pending_updates": True,
            "allowed_updates": ["message", "edited_message"]
        })
        if res.get("ok"):
            print("[+] SUCCESS: Webhook registered and active!")
            print(f"    Result: {res.get('description', 'OK')}")
        else:
            print(f"[-] FAILED: {res.get('description')}")
            print(f"    Code: {res.get('error_code')}")

    elif len(sys.argv) > 1 and sys.argv[1] == "--delete":
        print("[*] Deleting Telegram Webhook...")
        res = call_telegram_api("deleteWebhook", {"drop_pending_updates": True})
        if res.get("ok"):
            print("[+] SUCCESS: Webhook deleted! Bot is ready for polling or re-assignment.")
        else:
            print(f"[-] FAILED: {res.get('description')}")

    else:
        print("[*] Querying current Webhook status via getWebhookInfo...")
        info = call_telegram_api("getWebhookInfo")
        if info.get("ok"):
            data = info.get("result", {})
            url = data.get("url")
            pending = data.get("pending_update_count", 0)
            last_err = data.get("last_error_message")
            last_err_date = data.get("last_error_date")

            print("[+] TELEGRAM WEBHOOK INFO:")
            print(f"    - URL: {url if url else '(None - Webhook is NOT set)'}")
            print(f"    - Pending Updates: {pending}")
            print(f"    - Has Custom Certificate: {data.get('has_custom_certificate', False)}")
            if last_err:
                print(f"    - Last Error: {last_err} (timestamp: {last_err_date})")
            else:
                print("    - Last Error: None (Clean)")
            print("-" * 60)
            print("Usage Options:")
            print("  python scripts/register_webhook.py --set https://antidote-lake.vercel.app")
            print("  python scripts/register_webhook.py --delete")
        else:
            print(f"[-] Error querying webhook info: {info.get('description')}")

if __name__ == "__main__":
    main()
