import requests
import pandas as pd
import numpy as np
import json
import time
import os
import math
import warnings
from datetime import datetime

warnings.filterwarnings("ignore", category=RuntimeWarning)

session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0"})

def get_futures_symbols():
    for i in range(3):
        try:
            url = "https://fapi.binance.com/fapi/v1/exchangeInfo"
            response = session.get(url, timeout=20)
            data = response.json()
            symbols = [s["symbol"] for s in data["symbols"]
                     if s["contractType"] == "PERPETUAL" and s["quoteAsset"] == "USDT"]
            return symbols
        except Exception as e:
            print(f"⚠️ Liste alınamadı ({i+1}): {e}")
            time.sleep(2)
    return []

def get_klines(symbol):
    try:
        url = f"https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1h&limit=50"
        response = session.get(url, timeout=10)
        data = response.json()
        if not isinstance(data, list) or len(data) < 20: return None
        df = pd.DataFrame(data, columns=["OT","O","H","L","C","V","CT","QV","T","BBV","QBV","I"])
        df["C"] = df["C"].astype(float)
        df["V"] = df["V"].astype(float)
        return df
    except: return None

def calc_rsi(prices):
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
    rs = gain / loss.replace(0, 0.000001)
    return 100 - (100 / (1 + rs))

def analyze_symbol(symbol):
    df = get_klines(symbol)
    if df is None: return None
    
    rsi_series = calc_rsi(df["C"])
    rsi = rsi_series.iloc[-1]
    if math.isnan(rsi): return None
    
    price = df["C"].iloc[-1]
    price_change = (price / df["C"].iloc[-2] - 1) * 100
    
    v_now = df["V"].iloc[-1]
    v_prev = df["V"].iloc[-2] if df["V"].iloc[-2] != 0 else 0.000001
    volume_change = (v_now / v_prev - 1) * 100
    
    # 🚫 ÖLÜ COİN FİLTRESİ: Hacmi sıfırlanmış olanları at
    if volume_change <= -99.0:
        return None
    
    score = price_change + (70 - abs(rsi - 50)) / 5 + volume_change / 10
    pos = "Short" if rsi > 65 else "Long" if rsi < 35 else "Bekle"
    
    return {
        "symbol": symbol, "price": round(price, 8) if price < 1 else round(price, 4),
        "rsi": round(rsi, 2), "price_change": round(price_change, 2),
        "volume_change": round(volume_change, 2), "score": round(score, 2), "position": pos
    }

def run_analysis():
    print(f"\n🚀 --- [{datetime.now().strftime('%H:%M:%S')}] Temiz Analiz Başlatıldı ---")
    symbols = get_futures_symbols()
    if not symbols: return

    results = []
    total = len(symbols)
    print(f"📊 {total} sembol taranıyor (Ölü coinler elenecek)...")

    for idx, s in enumerate(symbols):
        r = analyze_symbol(s)
        if r: results.append(r)
        if idx % 50 == 0: print(f"⏳ İlerleme: %{round((idx/total)*100)}")
        time.sleep(0.02)

    output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data.json")
    data = {"last_update": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "coins": results}
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

    print(f"✅ Analiz bitti. {len(results)} canlı coin kaydedildi.")

if __name__ == "__main__":
    while True:
        try: run_analysis()
        except Exception as e: print(f"🛑 Hata: {e}")
        print("😴 15 dakika bekleniyor...")
        time.sleep(900)