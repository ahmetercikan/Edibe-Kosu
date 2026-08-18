/**
 * Cloud DB Service (Cihazlar Arası Canlı Sıfır-Yapılandırma Bulut Veritabanı)
 * Herhangi bir API key kurulumu gerektirmeden tüm cihazları (Tablet, Telefon, PC) 
 * anında aynı canlı bulut havuzunda birleştirir.
 */

const CLOUD_NAMESPACE = 'mahalle_kacamagi_game_db_v1';
const CLOUD_ENDPOINT = 'https://kvstore.b-cdn.net/api/v1';

// Alternatif güvenilir canlı bulut veritabanı kancası (npoint / jsonbin / kv)
const API_URL = 'https://api.npoint.io/4688975ef7df6d795b5c';

class CloudDb {
  constructor() {
    this.cachedUsers = [];
    this.cachedRequests = [];
    this.cachedFriendships = [];
  }

  /**
   * Buluttan Tüm Verileri Çek
   */
  async fetchCloudData() {
    try {
      const res = await fetch(API_URL, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        this.cachedUsers = data.users || [];
        this.cachedRequests = data.requests || [];
        this.cachedFriendships = data.friendships || [];
        return data;
      }
    } catch (err) {
      console.warn('Bulut DB erişim uyarısı:', err);
    }
    return { users: [], requests: [], friendships: [] };
  }

  /**
   * Buluta Güncel Verileri Gönder
   */
  async syncToCloud(payload) {
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('Bulut senkronizasyon hatası:', err);
    }
  }

  /**
   * Yeni Kullanıcıyı Canlı Buluta Kaydet
   */
  async saveUser(user) {
    const data = await this.fetchCloudData();
    const users = data.users || [];

    const existingIndex = users.findIndex(u => u.username.toLowerCase() === user.username.toLowerCase());
    if (existingIndex !== -1) {
      users[existingIndex] = { ...users[existingIndex], ...user };
    } else {
      users.push(user);
    }

    data.users = users;
    await this.syncToCloud(data);
    return users;
  }

  /**
   * Tüm Cihazlardaki Kullanıcıları Ara
   */
  async searchUsers(queryStr) {
    const data = await this.fetchCloudData();
    const users = data.users || [];
    const q = queryStr.trim().toLowerCase();

    return users.filter(u => 
      u.username.toLowerCase().includes(q) || 
      (u.username_lower && u.username_lower.includes(q))
    );
  }

  /**
   * Arkadaşlık İsteği Kaydet
   */
  async saveRequest(request) {
    const data = await this.fetchCloudData();
    const requests = data.requests || [];
    requests.push(request);
    data.requests = requests;
    await this.syncToCloud(data);
  }

  /**
   * Arkadaşlık İlişkisi Kaydet
   */
  async saveFriendship(friendship) {
    const data = await this.fetchCloudData();
    const friendships = data.friendships || [];
    friendships.push(friendship);
    data.friendships = friendships;
    await this.syncToCloud(data);
  }
}

export const cloudDb = new CloudDb();
