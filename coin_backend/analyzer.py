import requests
import json
import time
import os
from datetime import datetime

def get_market_data():
    try:
        # Binance üzerinden tek seferde tüm 24 saatlik verileri çek (Çok daha hızlı)
        url = "https://fapi.binance.com/fapi/v1/ticker/24hr"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        results = []
        for item in data:
            if item['symbol'].endswith('USDT'):
                results.append({
                    "symbol": item['symbol'],
                    "price": float(item['lastPrice']),
                    "price_change": float(item['priceChangePercent']),
                    "volume": float(item['quoteVolume'])
                })
        
        # Gelecekte buraya Yahoo Finance vb. hisse API'leri de eklenecek
        
        return sorted(results, key=lambda x: x['volume'], reverse=True) # Hacme göre sırala
    except Exception as e:
        print(f"Hata: {e}")
        return []

def run_scraper():
    print(f"\n🚀 [{datetime.now().strftime('%H:%M:%S')}] Fiyatlar Çekiliyor...")
    market_data = get_market_data()
    
    if market_data:
        output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data.json")
        data = {
            "last_update": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), 
            "assets": market_data
        }
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"✅ Başarılı! {len(market_data)} varlık güncellendi.")

if __name__ == "__main__":
    while True:
        run_scraper()
        time.sleep(60) # Artık sadece fiyat güncellediğimiz için her dakika çalışabilir