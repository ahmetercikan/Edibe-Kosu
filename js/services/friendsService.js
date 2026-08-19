/**
 * Friends Service (Arkadaşlık ve Kullanıcı Arama Mantığı)
 * Cihazlar arası Canlı Bulut Senkronizasyonlu Arkadaşlık Servisi.
 */

import { authService } from './authService.js';
import { cloudDb } from './cloudDb.js';

const REQUESTS_KEY = 'mahalle_game_friend_requests_db';
const FRIENDSHIPS_KEY = 'mahalle_game_friendships_db';

function normalizeStr(str) {
  if (!str) return '';
  return str
    .toString()
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/i̇/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

class FriendsService {
  constructor() {
    this._ensureInitialData();
  }

  _ensureInitialData() {
    if (!localStorage.getItem(REQUESTS_KEY)) {
      localStorage.setItem(REQUESTS_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(FRIENDSHIPS_KEY)) {
      const demoFriendships = [
        {
          id: 'rel_demo_1',
          user1Id: 'user_edibe_demo',
          user2Id: 'user_haci_demo',
          createdAt: Date.now() - 86400000
        }
      ];
      localStorage.setItem(FRIENDSHIPS_KEY, JSON.stringify(demoFriendships));
    }
  }

  _getRequests() {
    try {
      const data = localStorage.getItem(REQUESTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  _saveRequests(requests) {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
  }

  _getFriendships() {
    try {
      const data = localStorage.getItem(FRIENDSHIPS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  _saveFriendships(friendships) {
    localStorage.setItem(FRIENDSHIPS_KEY, JSON.stringify(friendships));
  }

  /**
   * Cihazlar Arası Canlı Kullanıcı Arama
   */
  async searchUsers(queryStr) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return [];

    const normQuery = normalizeStr(queryStr);
    if (!normQuery) return [];

    // Kendi hesabı ve yerel kullanıcıları buluta senkronize et
    await authService.syncLocalUsersToCloud();

    // Buluttan ve Yerelden Tüm Verileri Çek
    const cloudData = await cloudDb.fetchCloudData();
    const cloudUsers = cloudData.users || [];
    const localUsers = await authService.getAllUsers();

    // Birleştir ve benzersizleştir
    const userMap = new Map();
    localUsers.forEach(u => { if (u && u.username) userMap.set(u.id || u.username.toLowerCase(), u); });
    cloudUsers.forEach(u => { if (u && u.username) userMap.set(u.id || u.username.toLowerCase(), u); });

    const allUsers = Array.from(userMap.values());
    const requests = [...this._getRequests(), ...(cloudData.requests || [])];
    const friendships = [...this._getFriendships(), ...(cloudData.friendships || [])];

    const normCurrentUsername = normalizeStr(currentUser.username);

    return allUsers
      .filter(u => {
        if (!u || !u.username) return false;
        const normName = normalizeStr(u.username);
        const normNameLower = normalizeStr(u.username_lower);
        return normName !== normCurrentUsername && (normName.includes(normQuery) || normNameLower.includes(normQuery));
      })
      .map(user => {
        let status = 'none';

        const isFriend = friendships.some(f => 
          (f.user1Id === currentUser.id && f.user2Id === user.id) ||
          (f.user2Id === currentUser.id && f.user1Id === user.id)
        );

        if (isFriend) {
          status = 'friend';
        } else {
          const sentReq = requests.find(r => r.senderId === currentUser.id && r.receiverId === user.id && r.status === 'pending');
          const recvReq = requests.find(r => r.senderId === user.id && r.receiverId === currentUser.id && r.status === 'pending');

          if (sentReq) status = 'pending_sent';
          else if (recvReq) status = 'pending_received';
        }

        return {
          ...user,
          friendshipStatus: status
        };
      });
  }

  /**
   * Arkadaşlık İsteği Gönder (Canlı Bulut + Yerel)
   */
  async sendFriendRequest(targetUserId) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('İstek göndermek için önce giriş yapmalısınız.');
    if (currentUser.id === targetUserId) throw new Error('Kendinize arkadaşlık isteği gönderemezsiniz.');

    const cloudData = await cloudDb.fetchCloudData();
    const requests = [...this._getRequests(), ...(cloudData.requests || [])];
    const friendships = [...this._getFriendships(), ...(cloudData.friendships || [])];

    const isFriend = friendships.some(f => 
      (f.user1Id === currentUser.id && f.user2Id === targetUserId) ||
      (f.user2Id === currentUser.id && f.user1Id === targetUserId)
    );
    if (isFriend) throw new Error('Bu kullanıcı ile zaten arkadaşsınız.');

    const existingReq = requests.find(r => 
      ((r.senderId === currentUser.id && r.receiverId === targetUserId) ||
       (r.senderId === targetUserId && r.receiverId === currentUser.id)) &&
      r.status === 'pending'
    );
    if (existingReq) throw new Error('Zaten bekleyen bir arkadaşlık isteği mevcut.');

    const newRequest = {
      id: 'req_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      senderId: currentUser.id,
      receiverId: targetUserId,
      status: 'pending',
      createdAt: Date.now()
    };

    // Buluta Kaydet
    await cloudDb.saveRequest(newRequest);

    // Yerel DB'ye Kaydet
    const localReqs = this._getRequests();
    localReqs.push(newRequest);
    this._saveRequests(localReqs);

    return newRequest;
  }

  async getPendingRequests() {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return { incoming: [], outgoing: [] };

    const cloudData = await cloudDb.fetchCloudData();
    const cloudReqs = cloudData.requests || [];
    const cloudUsers = cloudData.users || [];
    const localReqs = this._getRequests();

    const reqMap = new Map();
    localReqs.forEach(r => reqMap.set(r.id, r));
    cloudReqs.forEach(r => reqMap.set(r.id, r));
    const requests = Array.from(reqMap.values());

    const incoming = requests
      .filter(r => r.receiverId === currentUser.id && r.status === 'pending')
      .map(r => ({ ...r, sender: authService.getUserById(r.senderId, cloudUsers) }))
      .filter(r => r.sender !== null);

    const outgoing = requests
      .filter(r => r.senderId === currentUser.id && r.status === 'pending')
      .map(r => ({ ...r, receiver: authService.getUserById(r.receiverId, cloudUsers) }))
      .filter(r => r.receiver !== null);

    return { incoming, outgoing };
  }

  async acceptFriendRequest(requestId) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('Lütfen önce giriş yapın.');

    const cloudData = await cloudDb.fetchCloudData();
    const requests = [...(cloudData.requests || this._getRequests())];
    const targetReq = requests.find(r => r.id === requestId);

    if (targetReq) {
      targetReq.status = 'accepted';
    }

    const friendships = [...(cloudData.friendships || this._getFriendships())];
    const newFriendship = {
      id: 'rel_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      user1Id: targetReq ? targetReq.senderId : currentUser.id,
      user2Id: targetReq ? targetReq.receiverId : currentUser.id,
      createdAt: Date.now()
    };
    friendships.push(newFriendship);

    cloudData.requests = requests;
    cloudData.friendships = friendships;
    await cloudDb.syncToCloud(cloudData);

    this._saveRequests(requests);
    this._saveFriendships(friendships);
  }

  async rejectFriendRequest(requestId) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return;

    const cloudData = await cloudDb.fetchCloudData();
    const requests = [...(cloudData.requests || this._getRequests())];
    const targetReq = requests.find(r => r.id === requestId);

    if (targetReq) {
      targetReq.status = 'rejected';
      cloudData.requests = requests;
      await cloudDb.syncToCloud(cloudData);
      this._saveRequests(requests);
    }
  }

  async getFriendsList() {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return [];

    const cloudData = await cloudDb.fetchCloudData();
    const cloudFriendships = cloudData.friendships || [];
    const cloudUsers = cloudData.users || [];
    const localFriendships = this._getFriendships();

    const friendshipMap = new Map();
    localFriendships.forEach(f => friendshipMap.set(f.id, f));
    cloudFriendships.forEach(f => friendshipMap.set(f.id, f));
    const friendships = Array.from(friendshipMap.values());

    const friendUserIds = friendships
      .filter(f => f.user1Id === currentUser.id || f.user2Id === currentUser.id)
      .map(f => f.user1Id === currentUser.id ? f.user2Id : f.user1Id);

    const friends = friendUserIds
      .map(id => authService.getUserById(id, cloudUsers))
      .filter(u => u !== null);

    const userMap = new Map();
    friends.forEach(u => userMap.set(u.id, u));
    userMap.set(currentUser.id, currentUser);

    return Array.from(userMap.values()).sort((a, b) => (b.bestScore || 0) - (a.bestScore || 0));
  }

  async removeFriend(friendUserId) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return;

    const cloudData = await cloudDb.fetchCloudData();
    let friendships = cloudData.friendships || this._getFriendships();

    friendships = friendships.filter(f => 
      !( (f.user1Id === currentUser.id && f.user2Id === friendUserId) ||
         (f.user2Id === currentUser.id && f.user1Id === friendUserId) )
    );

    cloudData.friendships = friendships;
    await cloudDb.syncToCloud(cloudData);
    this._saveFriendships(friendships);
  }

  async getUnreadIncomingCount() {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return 0;

    const cloudData = await cloudDb.fetchCloudData();
    const requests = cloudData.requests || this._getRequests();
    return requests.filter(r => r.receiverId === currentUser.id && r.status === 'pending').length;
  }
}

export const friendsService = new FriendsService();
