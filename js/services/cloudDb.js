/**
 * Cloud DB Service (Cihazlar Arası Canlı Sıfır-Yapılandırma Bulut Veritabanı)
 * Herhangi bir API key veya özel kurulum gerektirmeden dünyadaki tüm cihazları (Tablet, Telefon, PC)
 * anında aynı canlı bulut havuzunda birleştirir.
 */

const MASTER_INDEX_ID = 'ff8081819ff5b11001a0152ffc6343c3';
const CLOUD_URL = `https://api.restful-api.dev/objects/${MASTER_INDEX_ID}`;

class CloudDb {
  constructor() {
    this.cachedData = null;
  }

  /**
   * Buluttan Tüm Verileri Çek (Tüm Cihazların Ortak Veritabanı)
   */
  async fetchCloudData() {
    try {
      const res = await fetch(CLOUD_URL, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
      if (res.ok) {
        const result = await res.json();
        if (result && result.data) {
          this.cachedData = result.data;
          return result.data;
        }
      }
    } catch (err) {
      console.warn('Bulut DB okuma uyarısı:', err);
    }
    return this.cachedData || { users: [], requests: [], friendships: [] };
  }

  /**
   * Buluta Güncel Veriyi Yaz (Tüm Cihazlar Eşzamanlı Güncellenir)
   */
  async syncToCloud(payload) {
    this.cachedData = payload;
    try {
      await fetch(CLOUD_URL, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'mahalle_master_index',
          data: payload
        })
      });
    } catch (err) {
      console.warn('Bulut senkronizasyon yazma hatası:', err);
    }
  }

  /**
   * Yeni Kullanıcıyı Canlı Buluta Kaydet / Güncelle
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
