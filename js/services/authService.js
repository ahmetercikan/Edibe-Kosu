/**
 * Auth Service (Kimlik Doğrulama & Kullanıcı Yönetimi)
 * Cihazlar arası Firebase Cloud Firestore ve yerel LocalStorage desteği.
 */

import { APP_CONFIG } from '../config.js';
import { 
  db, 
  isFirebaseActive, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc 
} from './firebase.js';

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
   * Yeni Kullanıcı Kaydı veya Akıllı Otomatik Giriş
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

    // 1. Firebase Canlı Kontrol Yap
    if (isFirebaseActive && db) {
      try {
        const q = query(collection(db, 'users'), where('username_lower', '==', cleanUsernameLower));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const existingUser = querySnapshot.docs[0].data();
          // Eğer kullanıcının girdiği şifre mevcut hesapla eşleşiyorsa HATA VERME, doğrudan giriş yap!
          if (existingUser.password === password) {
            this._saveCurrentUser(existingUser);
            return { ...existingUser, isAutoLoggedIn: true };
          } else {
            throw new Error('Bu kullanıcı adı zaten kayıtlı! Eğer senin hesabınsa lütfen "Giriş Yap" sekmesini kullanın.');
          }
        }
      } catch (err) {
        if (err.message.includes('kayıtlı')) throw err;
        console.warn('Firebase sorgulama hatası:', err);
      }
    }

    // 2. Yerel DB Çakışma ve Otomatik Giriş Kontrolü
    const localDb = this._getUsersDB();
    const existingLocalUser = localDb.find(u => u.username.toLowerCase() === cleanUsernameLower);
    if (existingLocalUser) {
      if (existingLocalUser.password === password) {
        this._saveCurrentUser(existingLocalUser);
        return { ...existingLocalUser, isAutoLoggedIn: true };
      } else {
        throw new Error('Bu kullanıcı adı zaten kayıtlı! Lütfen "Giriş Yap" sekmesinden şifrenizi girin.');
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

    // Firebase'e Yaz
    if (isFirebaseActive && db) {
      try {
        await setDoc(doc(db, 'users', newUser.id), newUser);
      } catch (err) {
        console.warn('Firebase yazma hatası:', err);
      }
    }

    // Yerel DB'ye Yaz
    localDb.push(newUser);
    this._saveUsersDB(localDb);

    this._saveCurrentUser(newUser);
    return newUser;
  }

  /**
   * Kullanıcı Girişi (Firebase / LocalStorage)
   */
  async login({ usernameOrEmail, password }) {
    const queryStr = usernameOrEmail.trim().toLowerCase();

    // 1. Firebase Canlı Kontrol
    if (isFirebaseActive && db) {
      try {
        const qUsername = query(collection(db, 'users'), where('username_lower', '==', queryStr), where('password', '==', password));
        const qEmail = query(collection(db, 'users'), where('email', '==', queryStr), where('password', '==', password));

        const [snapUser, snapEmail] = await Promise.all([getDocs(qUsername), getDocs(qEmail)]);

        let matchedDoc = null;
        if (!snapUser.empty) matchedDoc = snapUser.docs[0].data();
        else if (!snapEmail.empty) matchedDoc = snapEmail.docs[0].data();

        if (matchedDoc) {
          this._saveCurrentUser(matchedDoc);
          return matchedDoc;
        }
      } catch (err) {
        console.warn('Firebase giriş hatası, yerelde deneniyor:', err);
      }
    }

    // 2. Yerel DB Kontrolü
    const dbUsers = this._getUsersDB();
    const user = dbUsers.find(u => 
      (u.username.toLowerCase() === queryStr || u.email.toLowerCase() === queryStr) &&
      u.password === password
    );

    if (!user) {
      throw new Error('Kullanıcı adı/e-posta veya şifre hatalı! Henüz hesabınız yoksa "Kayıt Ol" sekmesini kullanın.');
    }

    this._saveCurrentUser(user);
    return user;
  }

  async logout() {
    this._saveCurrentUser(null);
  }

  async updateBestScore(newScore) {
    if (!this.currentUser) return;

    if (newScore > (this.currentUser.bestScore || 0)) {
      this.currentUser.bestScore = newScore;
      this._saveCurrentUser(this.currentUser);

      if (isFirebaseActive && db) {
        try {
          await updateDoc(doc(db, 'users', this.currentUser.id), { bestScore: newScore });
        } catch (e) {}
      }

      const localDb = this._getUsersDB();
      const index = localDb.findIndex(u => u.id === this.currentUser.id);
      if (index !== -1) {
        localDb[index].bestScore = newScore;
        this._saveUsersDB(localDb);
      }
    }
  }

  async getAllUsers() {
    if (isFirebaseActive && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const remoteUsers = [];
        querySnapshot.forEach(docSnap => remoteUsers.push(docSnap.data()));
        if (remoteUsers.length > 0) return remoteUsers;
      } catch (e) {}
    }
    return this._getUsersDB();
  }

  getUserById(userId) {
    const localUsers = this._getUsersDB();
    return localUsers.find(u => u.id === userId) || null;
  }
}

export const authService = new AuthService();
