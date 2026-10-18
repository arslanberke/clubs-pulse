# Clubs Pulse

IONIA FC (EA FC 27 Pro Clubs) için detaylı istatistik sitesi: oyuncu karşılaştırma, gece raporu, eğlence sıralamaları, WhatsApp görseli, takım puanları.

- `scripts/collect.py`: EA'dan veriyi çeker, yeni maçları `data/raw/matches/` altına kaydeder (EA sadece son 10 maçı veriyor), `site/data.json` dosyasını üretir.
- `site/`: statik site.
- `.github/workflows/update.yml`: her 30 dakikada bir veriyi günceller ve siteyi GitHub Pages'e yayınlar.

Yerelde çalıştırma:

```bash
pip install -r requirements.txt
python scripts/collect.py          # veya --build-only (EA'ya istek atmadan)
cd site && python -m http.server
```

EA olay kodlarının çözümü [fc27-clubs-api](https://github.com/1erkandogan/fc27-clubs-api) (MIT) kütüphanesinden.
