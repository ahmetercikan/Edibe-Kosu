/**
 * Auth Service (Kimlik Doğrulama & Kullanıcı Yönetimi)
 * Hem yerel LocalStorage hem de opsiyonel olarak Firebase desteği sunar.
 */

import { APP_CONFIG } from '../config.js';

const USERS_STORAGE_KEY = 'mahalle_game_users_db';
const CURRENT_USER_KEY = 'mahalle_game_current_user';

class AuthService {
  constructor() {
    this.currentUser = this._loadCurrentUser();
    this._listeners = [];
    this._ensureInitialData();
  }

  /**
   * Yerel veri tabanı için başlangıç örnek kullanıcıları yükler
   */
  _ensureInitialData() {
    const existingUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (!existingUsers) {
      const initialUsers = [
        {
          id: 'user_edibe_demo',
          username: 'EdibeTeyze',
          email: 'edibe@mahalle.com',
          password: '123',
          avatar: '👵',
          bestScore: 12500,
          createdAt: Date.now() - 86400000 * 5
        },
        {
          id: 'user_haci_demo',
          username: 'HaciSadik',
          email: 'haci@mahalle.com',
          password: '123',
          avatar: '🧓',
          bestScore: 18900,
          createdAt: Date.now() - 86400000 * 3
        },
        {
          id: 'user_devrim_demo',
          username: 'DevrimTorun',
          email: 'devrim@mahalle.com',
          password: '123',
          avatar: '👦',
          bestScore: 9400,
          createdAt: Date.now() - 86400000 * 2
        }
      ];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initialUsers));
    }
  }

  _loadCurrentUser() {
    try {
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Mevcut kullanıcı okunamadı:', e);
      return null;
    }
  }

  _saveCurrentUser(user) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    this._notifyListeners();
  }

  _getUsersDB() {
    try {
      const data = localStorage.getItem(USERS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  _saveUsersDB(users) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  onAuthStateChanged(callback) {
    this._listeners.push(callback);
    callback(this.currentUser);
  }

  _notifyListeners() {
    this._listeners.forEach(cb => cb(this.currentUser));
  }

  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Yeni Kullanıcı Kaydı
   */
  async register({ username, email, password, avatar = '🧓' }) {
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 3) {
      throw new Error('Kullanıcı adı en az 3 karakter olmalıdır.');
    }
    if (!password || password.length < 4) {
      throw new Error('Şifre en az 4 karakter olmalıdır.');
    }

    const db = this._getUsersDB();

    // Çakışma kontrolü
    const usernameExists = db.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
    if (usernameExists) {
      throw new Error('Bu kullanıcı adı zaten alınmış.');
    }

    const emailExists = db.some(u => u.email.toLowerCase() === cleanEmail);
    if (emailExists && cleanEmail) {
      throw new Error('Bu e-posta adresiyle zaten bir hesap var.');
    }

    const newUser = {
      id: 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      username: cleanUsername,
      email: cleanEmail,
      password: password, // Not: Prodüksiyonda şifreler hash'lenmelidir.
      avatar: avatar,
      bestScore: 0,
      createdAt: Date.now()
    };

    db.push(newUser);
    this._saveUsersDB(db);

    // Otomatik giriş yap
    this._saveCurrentUser(newUser);
    return newUser;
  }

  /**
   * Kullanıcı Girişi
   */
  async login({ usernameOrEmail, password }) {
    const query = usernameOrEmail.trim().toLowerCase();
    const db = this._getUsersDB();

    const user = db.find(u => 
      (u.username.toLowerCase() === query || u.email.toLowerCase() === query) &&
      u.password === password
    );

    if (!user) {
      throw new Error('Kullanıcı adı/e-posta veya şifre hatalı!');
    }

    this._saveCurrentUser(user);
    return user;
  }

  /**
   * Oturumu Kapat
   */
  async logout() {
    this._saveCurrentUser(null);
  }

  /**
   * Kullanıcının Skorunu Güncelle
   */
  async updateBestScore(newScore) {
    if (!this.currentUser) return;

    if (newScore > (this.currentUser.bestScore || 0)) {
      this.currentUser.bestScore = newScore;
      this._saveCurrentUser(this.currentUser);

      // DB kaydını da güncelle
      const db = this._getUsersDB();
      const index = db.findIndex(u => u.id === this.currentUser.id);
      if (index !== -1) {
        db[index].bestScore = newScore;
        this._saveUsersDB(db);
      }
    }
  }

  /**
   * Arama ve Kullanıcı Bilgisi Sorgulama
   */
  getAllUsers() {
    return this._getUsersDB();
  }

  getUserById(userId) {
    const db = this._getUsersDB();
    return db.find(u => u.id === userId) || null;
  }
}

export const authService = new AuthService();
