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

const game = new Game();
game.init();

// Giriş & Arkadaşlık arayüzünü başlat
uiFriends.init();

// Geliştirme/hata ayıklama için konsoldan erişim (window.__game).
window.__game = game;

