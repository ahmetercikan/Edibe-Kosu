// Giriş noktası: PWA servis çalışanını kaydeder ve oyunu başlatır.
// Gerçek oyun mantığı ./js/ altındaki modüllerde yaşar.
import { Game } from './js/game.js';
import { uiFriends } from './js/uiFriends.js';

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service worker kaydı başarısız:', err);
    });
  });
}

// Güvenlik zamanlayıcısı: 2.5 saniye içinde yükleme ekranı kapanmazsa menüyü zorla aç
const safetyTimer = setTimeout(() => {
  const loadingScreen = document.getElementById('screen-loading');
  if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
    console.warn('Güvenlik zamanlayıcısı tetiklendi: Yükleme ekranı kapatılıyor.');
    loadingScreen.classList.add('hidden');
    document.getElementById('screen-menu')?.classList.remove('hidden');
    document.getElementById('overlay')?.classList.remove('hidden');
  }
}, 2500);

try {
  const game = new Game();
  window.__game = game;
  game.init().then(() => {
    clearTimeout(safetyTimer);
  }).catch((err) => {
    console.error('Oyun başlatılırken hata:', err);
    clearTimeout(safetyTimer);
    document.getElementById('screen-loading')?.classList.add('hidden');
    document.getElementById('screen-menu')?.classList.remove('hidden');
  });

  uiFriends.init();
} catch (err) {
  console.error('Kritik başlatma hatası:', err);
  clearTimeout(safetyTimer);
  document.getElementById('screen-loading')?.classList.add('hidden');
  document.getElementById('screen-menu')?.classList.remove('hidden');
}

