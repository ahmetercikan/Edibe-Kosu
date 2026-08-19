/**
 * Cloud DB Service (Cihazlar Arası Canlı Sıfır-Yapılandırma Bulut Veritabanı)
 * Herhangi bir API key veya özel kurulum gerektirmeden dünyadaki tüm cihazları (Tablet, Telefon, PC)
 * anında aynı canlı bulut havuzunda birleştirir.
 */

const SYNC_TOPICS = ['mahalle_game_cloud_sync_v6', 'mahalle_game_global_cloud_v1'];
const PRIMARY_TOPIC = 'mahalle_game_cloud_sync_v6';

const CLOUD_PUB_URL = `https://ntfy.sh/${PRIMARY_TOPIC}`;
const CLOUD_SSE_URL = `https://ntfy.sh/${PRIMARY_TOPIC}/sse`;

class CloudDb {
  constructor() {
    this.cachedData = { users: [], requests: [], friendships: [] };
    this.listeners = [];
    this.eventSource = null;
    this._initRealtimeListener();
  }

  _initRealtimeListener() {
    try {
      if (typeof EventSource !== 'undefined') {
        this.eventSource = new EventSource(CLOUD_SSE_URL);
        this.eventSource.onmessage = (event) => {
          try {
            const msgObj = JSON.parse(event.data);
            if (msgObj && msgObj.message) {
              const payload = JSON.parse(msgObj.message);
              this._mergePayloadIntoCache(payload);
              this._notifyListeners();
            }
          } catch (e) {
            // Sessizce geç
          }
        };
      }
    } catch (e) {
      console.warn('Realtime SSE bağlantı uyarısı:', e);
    }
  }

  onCloudUpdate(callback) {
    this.listeners.push(callback);
  }

  _notifyListeners() {
    this.listeners.forEach(cb => {
      try { cb(this.cachedData); } catch (e) {}
    });
  }

  _mergePayloadIntoCache(payload) {
    if (!payload || typeof payload !== 'object') return;

    const userMap = new Map();
    (this.cachedData.users || []).forEach(u => {
      if (u && u.username) userMap.set(u.id || u.username.toLowerCase(), u);
    });

    (payload.users || []).forEach(u => {
      if (u && u.username) {
        const key = u.id || u.username.toLowerCase();
        if (!userMap.has(key) || (u.bestScore || 0) > (userMap.get(key).bestScore || 0)) {
          userMap.set(key, u);
        }
      }
    });

    const reqMap = new Map();
    (this.cachedData.requests || []).forEach(r => { if (r && r.id) reqMap.set(r.id, r); });
    (payload.requests || []).forEach(r => { if (r && r.id) reqMap.set(r.id, r); });

    const friendshipMap = new Map();
    (this.cachedData.friendships || []).forEach(f => { if (f && f.id) friendshipMap.set(f.id, f); });
    (payload.friendships || []).forEach(f => { if (f && f.id) friendshipMap.set(f.id, f); });

    this.cachedData = {
      users: Array.from(userMap.values()),
      requests: Array.from(reqMap.values()),
      friendships: Array.from(friendshipMap.values())
    };
  }

  /**
   * Buluttan Tüm Verileri Çek (Tüm Cihazların Ortak Veritabanı)
   */
  async fetchCloudData() {
    for (const topic of SYNC_TOPICS) {
      try {
        const url = `https://ntfy.sh/${topic}/json?poll=1`;
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const text = await res.text();
          const lines = text.trim().split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const msgObj = JSON.parse(line);
              if (msgObj && msgObj.message) {
                const payload = JSON.parse(msgObj.message);
                this._mergePayloadIntoCache(payload);
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn(`Bulut DB okuma uyarısı (${topic}):`, err);
      }
    }
    return this.cachedData;
  }

  /**
   * Buluta Güncel Veriyi Yaz (Tüm Cihazlar Eşzamanlı Güncellenir)
   */
  async syncToCloud(payload) {
    this._mergePayloadIntoCache(payload);
    try {
      await fetch(CLOUD_PUB_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      this._notifyListeners();
    } catch (err) {
      console.warn('Bulut senkronizasyon yazma hatası:', err);
    }
  }

  /**
   * Yeni Kullanıcıyı Canlı Buluta Kaydet / Güncelle
   */
  async saveUser(user) {
    return this.saveUsers([user]);
  }

  /**
   * Birden Fazla Kullanıcıyı Toplu Canlı Buluta Kaydet
   */
  async saveUsers(usersArray) {
    if (!usersArray || !usersArray.length) return this.cachedData.users;
    const data = await this.fetchCloudData();
    const users = [...(data.users || [])];
    const userMap = new Map();
    users.forEach(u => { if (u && u.username) userMap.set(u.id || u.username.toLowerCase(), u); });
    usersArray.forEach(u => {
      if (u && u.username) {
        const key = u.id || u.username.toLowerCase();
        if (!userMap.has(key) || (u.bestScore || 0) > (userMap.get(key).bestScore || 0)) {
          userMap.set(key, u);
        }
      }
    });
    const updatePayload = {
      users: Array.from(userMap.values()),
      requests: data.requests || [],
      friendships: data.friendships || []
    };
    await this.syncToCloud(updatePayload);
    return updatePayload.users;
  }

  /**
   * Arkadaşlık İsteği Kaydet / Güncelle
   */
  async saveRequest(request) {
    const data = await this.fetchCloudData();
    const requests = [...(data.requests || [])];
    const existingIndex = requests.findIndex(r => r.id === request.id);
    if (existingIndex !== -1) {
      requests[existingIndex] = request;
    } else {
      requests.push(request);
    }
    const updatePayload = { users: data.users || [], requests, friendships: data.friendships || [] };
    await this.syncToCloud(updatePayload);
  }

  /**
   * Arkadaşlık İlişkisi Kaydet
   */
  async saveFriendship(friendship) {
    const data = await this.fetchCloudData();
    const friendships = [...(data.friendships || [])];
    if (!friendships.some(f => f.id === friendship.id)) {
      friendships.push(friendship);
    }
    const updatePayload = { users: data.users || [], requests: data.requests || [], friendships };
    await this.syncToCloud(updatePayload);
  }
}

export const cloudDb = new CloudDb();
