#!/usr/bin/env python3
"""每天 8:00 自动抓取每日信息，输出 daily.json 供工作台网页读取。"""
import datetime
import json
import os
import time
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_FILE = os.path.join(BASE_DIR, "daily.json")
FETCH_HOUR = 8


def http_get(url, timeout=15):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", "ignore")


def fetch_weather():
    """返回 wttr.in 原始 JSON（结构与前端一致）。"""
    for url in ("https://wttr.in/?format=j1&lang=zh", "https://wttr.in/?format=j1"):
        try:
            data = json.loads(http_get(url))
            if data.get("current_condition"):
                return data
        except Exception as e:
            print(f"[weather] {url} 失败: {e}")
    return {"error": "天气获取失败"}


def fetch_hitokoto():
    try:
        return json.loads(http_get("https://v1.hitokoto.cn/?c=i&encode=json"))
    except Exception as e:
        print(f"[hitokoto] 失败: {e}")
        return {"error": "一言获取失败"}


def run_once():
    payload = {
        "date": datetime.date.today().isoformat(),
        "updated_at": datetime.datetime.now().isoformat(timespec="seconds"),
        "weather": fetch_weather(),
        "hitokoto": fetch_hitokoto(),
    }
    tmp = OUT_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    os.replace(tmp, OUT_FILE)
    print(f"[{datetime.datetime.now():%Y-%m-%d %H:%M:%S}] 已更新 daily.json")


def next_run_at(now):
    target = now.replace(hour=FETCH_HOUR, minute=0, second=0, microsecond=0)
    if target <= now:
        target += datetime.timedelta(days=1)
    return target


def main():
    # 启动时：如果今天还没有数据，立即抓取一次
    today = datetime.date.today().isoformat()
    need_run = True
    if os.path.exists(OUT_FILE):
        try:
            with open(OUT_FILE, encoding="utf-8") as f:
                need_run = json.load(f).get("date") != today
        except Exception:
            need_run = True

    if need_run:
        run_once()

    print(f"每日 {FETCH_HOUR}:00 自动抓取已启动，下次执行: {next_run_at(datetime.datetime.now()):%Y-%m-%d %H:%M}")
    while True:
        now = datetime.datetime.now()
        wait = (next_run_at(now) - now).total_seconds()
        time.sleep(max(wait, 1))
        run_once()


if __name__ == "__main__":
    main()
