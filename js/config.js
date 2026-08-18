/**
 * Oyun Yapılandırma Dosyası
 * Canlı ortamda Firebase hesabı bağlamak isterseniz aşağıdaki bilgileri doldurabilirsiniz.
 * Firebase bilgileri boş bırakıldığında sistem otomatik olarak "local" (LocalStorage Mock) modunda çalışır.
 */

export const APP_CONFIG = {
  // 'local' veya 'firebase'
  mode: 'local',

  // Firebase Yapılandırması (Opsiyonel)
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  }
};
