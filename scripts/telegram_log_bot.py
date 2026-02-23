#!/usr/bin/env python3
import datetime as dt
import html
import json
import os
import re
import subprocess
import time
import urllib.parse
import urllib.request


DEFAULT_PATTERN = r"error|exception|fail(ed|ure)?|fatal|panic|traceback|outofmemory|oom|503|502|504"


def env(name: str, default: str = "") -> str:
    value = os.getenv(name)
    return value if value is not None else default


def detect_compose_cmd() -> list[str]:
    for cmd in (["docker", "compose"], ["docker-compose"]):
        try:
            subprocess.run(cmd + ["version"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return cmd
        except Exception:
            continue
    raise RuntimeError("Neither docker compose nor docker-compose is available")


def send_telegram(token: str, chat_id: str, text: str) -> None:
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = urllib.parse.urlencode(
        {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": "true",
        }
    ).encode("utf-8")
    request = urllib.request.Request(url, data=payload, method="POST")
    with urllib.request.urlopen(request, timeout=15):
        pass


def compose_logs(compose_cmd: list[str], compose_file: str, services: list[str], since_iso: str) -> str:
    cmd = compose_cmd + ["-f", compose_file, "logs", "--no-color", "--since", since_iso] + services
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        return ""
    return result.stdout


def parse_error_lines(raw: str, regex: re.Pattern) -> list[str]:
    lines = []
    for line in raw.splitlines():
        cleaned = line.strip()
        if not cleaned:
            continue
        if regex.search(cleaned):
            lines.append(cleaned)
    return lines


def load_state(path: str) -> dict:
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:
        return {}


def save_state(path: str, state: dict) -> None:
    tmp_path = f"{path}.tmp"
    with open(tmp_path, "w", encoding="utf-8") as handle:
        json.dump(state, handle)
    os.replace(tmp_path, path)


def make_message(host: str, compose_file: str, line: str) -> str:
    safe_line = html.escape(line)
    return (
        "🚨 <b>Chess prod log alert</b>\n"
        f"Host: <code>{html.escape(host)}</code>\n"
        f"Compose: <code>{html.escape(compose_file)}</code>\n\n"
        f"<code>{safe_line[:3200]}</code>"
    )


def main() -> int:
    token = env("TELEGRAM_BOT_TOKEN").strip()
    chat_id = env("TELEGRAM_CHAT_ID").strip()
    if not token or not chat_id:
        print("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID")
        return 1

    compose_file = env("TELEGRAM_COMPOSE_FILE", "docker-compose.prod.yml").strip()
    services_raw = env("TELEGRAM_LOG_SERVICES", "backend,nginx,frontend").strip()
    services = [part.strip() for part in services_raw.split(",") if part.strip()]
    interval_sec = int(env("TELEGRAM_LOG_INTERVAL_SEC", "20"))
    max_alerts_per_cycle = int(env("TELEGRAM_MAX_ALERTS_PER_CYCLE", "5"))
    pattern = env("TELEGRAM_ERROR_REGEX", DEFAULT_PATTERN)
    state_path = env("TELEGRAM_LOG_STATE_FILE", "/tmp/chess_telegram_log_bot_state.json")
    host = env("HOSTNAME", "unknown-host")

    regex = re.compile(pattern, flags=re.IGNORECASE)
    compose_cmd = detect_compose_cmd()
    state = load_state(state_path)

    # Start from recent logs on first launch.
    since_ts = int(state.get("since_ts", time.time() - 30))
    dedup_cache = set()

    send_telegram(
        token,
        chat_id,
        (
            "✅ <b>Chess prod log watcher started</b>\n"
            f"Host: <code>{html.escape(host)}</code>\n"
            f"Services: <code>{html.escape(','.join(services))}</code>\n"
            f"Interval: <code>{interval_sec}s</code>"
        ),
    )

    while True:
        now = int(time.time())
        since_iso = dt.datetime.utcfromtimestamp(max(0, since_ts)).isoformat() + "Z"
        raw_logs = compose_logs(compose_cmd, compose_file, services, since_iso)
        matched = parse_error_lines(raw_logs, regex)

        sent = 0
        for line in matched:
            signature = hash(line)
            if signature in dedup_cache:
                continue
            dedup_cache.add(signature)
            try:
                send_telegram(token, chat_id, make_message(host, compose_file, line))
                sent += 1
            except Exception as error:
                print(f"Telegram send failed: {error}")
            if sent >= max_alerts_per_cycle:
                break

        if len(dedup_cache) > 2000:
            dedup_cache = set(list(dedup_cache)[-1000:])

        since_ts = now
        save_state(state_path, {"since_ts": since_ts})
        time.sleep(max(5, interval_sec))


if __name__ == "__main__":
    raise SystemExit(main())
