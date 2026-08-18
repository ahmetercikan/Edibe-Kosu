/**
 * Auth Service (Kimlik Doğrulama & Kullanıcı Yönetimi)
 * Tablet, Telefon ve PC arası 100% Canlı Bulut Senkronizasyonlu Auth Servisi.
 */

import { APP_CONFIG } from '../config.js';
import { cloudDb } from './cloudDb.js';

const USERS_STORAGE_KEY = 'mahalle_game_users_db';
const CURRENT_USER_KEY = 'mahalle_game_current_user';

class AuthService {
  constructor() {
    this.currentUser = this._loadCurrentUser();
    this._listeners = [];
    this._ensureInitialData();
  }

  _ensureInitialData() {
    const existingUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (!existingUsers) {
      const initialUsers = [
        {
          id: 'user_edibe_demo',
          username: 'EdibeTeyze',
          username_lower: 'edibeteyze',
          email: 'edibe@mahalle.com',
          password: '123',
          avatar: '👵',
          bestScore: 12500,
          createdAt: Date.now() - 86400000 * 5
        },
        {
          id: 'user_haci_demo',
          username: 'HaciSadik',
          username_lower: 'hacisadik',
          email: 'haci@mahalle.com',
          password: '123',
          avatar: '🧓',
          bestScore: 18900,
          createdAt: Date.now() - 86400000 * 3
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
   * Yeni Kullanıcı Kaydı veya Akıllı Giriş (Canlı Bulut Senkronizeli)
   */
  async register({ username, email, password, avatar = '🧓' }) {
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsernameLower = cleanUsername.toLowerCase();

    if (!cleanUsername || cleanUsername.length < 3) {
      throw new Error('Kullanıcı adı en az 3 karakter olmalıdır.');
    }
    if (!password || password.length < 4) {
      throw new Error('Şifre en az 4 karakter olmalıdır.');
    }

    // 1. Canlı Bulut DB Çakışma / Otomatik Giriş Kontrolü
    const cloudData = await cloudDb.fetchCloudData();
    const cloudUsers = cloudData.users || [];
    const existingCloudUser = cloudUsers.find(u => u.username.toLowerCase() === cleanUsernameLower);

    if (existingCloudUser) {
      if (existingCloudUser.password === password) {
        this._saveCurrentUser(existingCloudUser);
        return { ...existingCloudUser, isAutoLoggedIn: true };
      } else {
        throw new Error('Bu kullanıcı adı başka bir cihazda zaten kayıtlı! Eğer senin hesabınsa lütfen "Giriş Yap" sekmesini kullanın.');
      }
    }

    // 2. Yerel Kontrol
    const localDb = this._getUsersDB();
    const existingLocalUser = localDb.find(u => u.username.toLowerCase() === cleanUsernameLower);
    if (existingLocalUser) {
      if (existingLocalUser.password === password) {
        this._saveCurrentUser(existingLocalUser);
        return { ...existingLocalUser, isAutoLoggedIn: true };
      } else {
        throw new Error('Bu kullanıcı adı zaten alınmış. Lütfen "Giriş Yap" sekmesini kullanın.');
      }
    }

    const newUser = {
      id: 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      username: cleanUsername,
      username_lower: cleanUsernameLower,
      email: cleanEmail,
      password: password,
      avatar: avatar,
      bestScore: 0,
      createdAt: Date.now()
    };

    // Buluta ve Yerel DB'ye Kaydet
    await cloudDb.saveUser(newUser);

    localDb.push(newUser);
    this._saveUsersDB(localDb);

    this._saveCurrentUser(newUser);
    return newUser;
  }

  /**
   * Kullanıcı Girişi (Canlı Bulut & Yerel Kontrol)
   */
  async login({ usernameOrEmail, password }) {
    const queryStr = usernameOrEmail.trim().toLowerCase();

    // 1. Canlı Bulut DB'de Ara
    const cloudData = await cloudDb.fetchCloudData();
    const cloudUsers = cloudData.users || [];
    const cloudUser = cloudUsers.find(u => 
      (u.username.toLowerCase() === queryStr || u.email?.toLowerCase() === queryStr) &&
      u.password === password
    );

    if (cloudUser) {
      const localDb = this._getUsersDB();
      if (!localDb.some(u => u.id === cloudUser.id)) {
        localDb.push(cloudUser);
        this._saveUsersDB(localDb);
      }
      this._saveCurrentUser(cloudUser);
      return cloudUser;
    }

    // 2. Yerel DB'de Ara
    const localDb = this._getUsersDB();
    const localUser = localDb.find(u => 
      (u.username.toLowerCase() === queryStr || u.email?.toLowerCase() === queryStr) &&
      u.password === password
    );

    if (!localUser) {
      throw new Error('Kullanıcı adı/e-posta veya şifre hatalı! Henüz hesabınız yoksa "Kayıt Ol" sekmesini kullanın.');
    }

    this._saveCurrentUser(localUser);
    return localUser;
  }

  async logout() {
    this._saveCurrentUser(null);
  }

  async updateBestScore(newScore) {
    if (!this.currentUser) return;

    if (newScore > (this.currentUser.bestScore || 0)) {
      this.currentUser.bestScore = newScore;
      this._saveCurrentUser(this.currentUser);

      // Buluta yaz
      await cloudDb.saveUser(this.currentUser);

      // Yerel DB yaz
      const localDb = this._getUsersDB();
      const index = localDb.findIndex(u => u.id === this.currentUser.id);
      if (index !== -1) {
        localDb[index].bestScore = newScore;
        this._saveUsersDB(localDb);
      }
    }
  }

  async getAllUsers() {
    const cloudData = await cloudDb.fetchCloudData();
    if (cloudData.users && cloudData.users.length > 0) {
      return cloudData.users;
    }
    return this._getUsersDB();
  }

  getUserById(userId) {
    if (cloudDb.cachedData && cloudDb.cachedData.users) {
      const cloudMatch = cloudDb.cachedData.users.find(u => u.id === userId);
      if (cloudMatch) return cloudMatch;
    }
    const localUsers = this._getUsersDB();
    return localUsers.find(u => u.id === userId) || null;
  }
}

export const authService = new AuthService();
