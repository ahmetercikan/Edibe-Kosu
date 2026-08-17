# 🧴 Hacı Sadık & Edibe Teyze: Mahalle Kaçamağı

Three.js (WebGL) tabanlı, build adımı gerektirmeyen, kurulabilir bir **PWA 3D koşu oyunu**. Sarıkız suyu topla, hacı parfümü fırlat, uçan süpürgeyle torunu yakala!

Tamamen statik dosyalardan oluşur (`index.html` / `style.css` / `script.js` + `js/` modülleri) — GitHub Pages, Netlify, Vercel veya herhangi bir statik hosting'e doğrudan yayınlanabilir.

## ✨ Özellikler

- **İki oyun modu**
  - **Hacı Sadık** — Sarıkız sularını toplayıp geçici güç (süper hız / yenilmezlik kalkanı) kazan, hacı parfümü şişelerini fırlatarak engelleri patlat.
  - **Edibe Teyze** — Ultra elektrikli süpürgeyle uçarak engellere çarpmadan ilerle, sürekli kaçan torunu Devrim'i yakala.
- **Prosedürel 3D karakterler** — dışarıdan model/doku dosyası gerektirmeyen, kod içinde inşa edilmiş düşük-poligon rig'ler (toon/cel-shading gölgelendirme).
- **Sinematik takip kamerası** — üstel yumuşatma (frame-rate bağımsız), şerit değişiminde yatış (bank), çarpışmada kamera sarsıntısı.
- **Bloom / parlama post-processing**, parçacık patlamaları, ışık flaşları, dinamik gölgeler.
- **60 FPS hedefli performans** — nesne havuzlama (object pooling), delta-time tabanlı hareket, otomatik kalite düşürme kancası.
- **Tam PWA desteği** — `manifest.json` + servis çalışanı (`sw.js`) ile ana ekrana eklenebilir, çevrimdışı çalışabilir uygulama.
- **Mobil dokunmatik kontroller** (kaydırma + butonlar) ve klavye desteği.
- Dışa bağımlı **hiçbir ikili varlık yok** — sesler Web Audio API ile, dokular canvas ile anlık üretilir (repo hafif ve tamamen "self-contained").

## 🎨 Sanat yönü

Ortam, referans bir mobil oyun görseli örnek alınarak gündüz vakti bir Anadolu mahallesi teması etrafında kuruldu: parke taşı sokak, kiremit çatılı taş/tuğla evler, bir minare silüeti ve sarkan elektrik telleri (hepsi canvas ile prosedürel olarak üretiliyor — dış görsel dosyası yok). HUD, kalp şeklinde bir can barı, şimşek ikonlu bir enerji barı (Hacı modunda parfüm mühimmatı, Edibe modunda hızlanma şarjı), sağ üstte seviye sayacı, sesi kapatma butonu ve oyun başında beliren bir "kaydır" ok ipucu içerir. Hacı Sadık, Sarıkız suyu içtiğinde kollarını kaldırıp şişen kaslar + şimşek parçacıklarıyla kısa bir "güçlenme" pozuna geçer.

## 🐛 Hata ayıklama

Çalışma zamanında konsoldan `window.__game` ile `Game` örneğine erişilebilir (örn. `__game.player`, `__game._onWaterCollected(...)` ile efektleri elle tetiklemek gibi).

## 🕹️ Kontroller

| Aksiyon | Klavye | Dokunmatik |
|---|---|---|
| Şerit değiştir | `←` `→` veya `A` `D` | Sağa/sola kaydır ya da yan butonlar |
| Fırlat (Hacı) / Hızlan (Edibe) | `Boşluk` / `W` / `↑` | Ortadaki buton veya ekrana dokun |
| Duraklat | `Esc` / `P` | Sağ üstteki ⏸ butonu |

## 🏗️ Mimari

```
index.html          → PWA kabuğu: canvas, HUD, menü ekranları, importmap
style.css            → Tüm arayüz (HUD, menüler, dokunmatik kontroller, tema)
script.js            → Giriş noktası: servis çalışanını kaydeder, Game'i başlatır
sw.js                → Servis çalışanı (cache-first / stale-while-revalidate)
manifest.json        → PWA manifestosu (ikonlar, tema rengi, standalone mod)

js/
  constants.js        → Şerit genişliği, hız, can, güç süresi gibi paylaşılan sabitler
  sceneSetup.js        → Renderer, kamera, ışıklandırma, gökyüzü, bloom post-processing
  characters.js         → Hacı Sadık / Edibe Teyze / Devrim prosedürel 3D rig'leri + animasyon
  world.js               → Zemin, paralaks silüet, engel/toplanabilir fabrikaları, nesne havuzu
  effects.js               → Canvas tabanlı dokular (toon gradient, çiçekli desen, gökyüzü, parıltı) ve parçacık sistemi
  input.js                  → Klavye + dokunmatik/kaydırma girişi
  audio.js                   → Web Audio API ile üretilen efekt sesleri
  game.js                     → Durum makinesi, spawn/skor/çarpışma mantığı, HUD güncellemeleri

icons/                → PWA ikonları (tools/make_icons.py ile üretildi)
tools/make_icons.py   → İkonları yeniden üretmek için Pillow betiği (opsiyonel, tekrar çalıştırmak zorunlu değil)
```

**Neden `three.js` build aracı olmadan çalışıyor?** `index.html` içindeki bir [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) sayesinde `three` ve `three/addons/` doğrudan `unpkg` CDN'inden ES modülü olarak import ediliyor. Bu, npm/webpack/vite kurmadan, tek bir `git clone` sonrası tarayıcıda doğrudan çalışan bir proje anlamına gelir.

**Performans notları:**
- Tüm engel / toplanabilir / mermi / parçacık nesneleri **havuzlanır** (oluşturulup gizlenir, her spawn'da yeniden kullanılır) — çalışma zamanında `new Mesh()` / GC baskısı yok.
- Kamera ve şerit geçişleri delta-time bağımsız üstel yumuşatma (`1 - e^(-dt/τ)`) ile hesaplanır, bu yüzden farklı FPS'lerde tutarlı hareket eder.
- `Game.degradeQuality()` bloom ve gölgeleri kapatıp pixel oranını düşürerek düşük performanslı cihazlar için hazır bir kanca sağlar (isteğe bağlı olarak bir FPS-izleyiciye bağlanabilir).

## 🚀 Yerel çalıştırma

ES modülleri `file://` üzerinden CORS kısıtlaması nedeniyle çalışmaz — basit bir statik sunucu gerekir:

```bash
# Python ile
python -m http.server 8080

# veya Node ile
npx serve .
```

Sonra tarayıcıda `http://localhost:8080` adresini açın.

## 🌐 GitHub Pages'e yayınlama

1. Bu klasörü bir GitHub reposuna push edin.
2. **Settings → Pages** → *Source*: `Deploy from a branch` → `main` / `/ (root)` seçin.
3. Birkaç dakika içinde `https://<kullanıcı-adınız>.github.io/<repo-adı>/` adresinde yayında olacak.
4. Telefonda siteyi açıp tarayıcı menüsünden **"Ana Ekrana Ekle"** diyerek PWA olarak kurabilirsiniz.

> `manifest.json` içindeki `start_url`/`scope` değerleri göreli (`./`) olduğu için alt dizin (`/repo-adı/`) altında yayınlansa bile doğru çalışır.

## 🎨 İkonları yeniden üretmek

Repo, ikili bir görsel dosyası elle eklemek yerine `tools/make_icons.py` betiğiyle üretilen PNG ikonları içerir (Pillow gerektirir):

```bash
pip install pillow
python tools/make_icons.py
```

## 🧩 Genişletme fikirleri

- Karakterleri `characters.js` içinde gerçek `.glb` modellerle değiştirip `GLTFLoader` ile yüklemek (mevcut mimari bunu kolaylaştırır — `createHaciSadik()` gibi fabrika fonksiyonlarını bir loader'a yönlendirmek yeterli).
- Çok sayıda aynı tip engel için `InstancedMesh` kullanarak çizim çağrılarını daha da azaltmak.
- Liderlik tablosu için bir backend/Firebase entegrasyonu (şu an skor sadece `localStorage`'da tutuluyor).
- Selective bloom (katman tabanlı) ile sadece gerçekten emissive nesnelerin ışıldamasını sağlamak.

## Lisans

MIT — bkz. [LICENSE](LICENSE). Karakter isimleri ve tema kurgusaldır.
