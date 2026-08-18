/**
 * Friends Service (Arkadaşlık ve Kullanıcı Arama Mantığı)
 * Kullanıcı arama, arkadaşlık isteği gönderme/kabul/red ve arkadaş listesi yönetimi.
 */

import { authService } from './authService.js';

const REQUESTS_KEY = 'mahalle_game_friend_requests_db';
const FRIENDSHIPS_KEY = 'mahalle_game_friendships_db';

class FriendsService {
  constructor() {
    this._ensureInitialData();
  }

  /**
   * Başlangıçta test için demo arkadaşlık verileri tanımlar
   */
  _ensureInitialData() {
    if (!localStorage.getItem(REQUESTS_KEY)) {
      localStorage.setItem(REQUESTS_KEY, JSON.stringify([]));
    }

    if (!localStorage.getItem(FRIENDSHIPS_KEY)) {
      // Örnek: EdibeTeyze ve HaciSadik başlangıçta arkadaştır
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
   * Kullanıcı Arama
   * Mevcut kullanıcıyı hariç tutar ve arkadaşlık durumunu (none, pending_sent, pending_received, friend) ekler.
   */
  searchUsers(query) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return [];

    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    const allUsers = authService.getAllUsers();
    const requests = this._getRequests();
    const friendships = this._getFriendships();

    return allUsers
      .filter(u => u.id !== currentUser.id && u.username.toLowerCase().includes(cleanQuery))
      .map(user => {
        let status = 'none';

        // Arkadaşlık kontrolü
        const isFriend = friendships.some(f => 
          (f.user1Id === currentUser.id && f.user2Id === user.id) ||
          (f.user2Id === currentUser.id && f.user1Id === user.id)
        );

        if (isFriend) {
          status = 'friend';
        } else {
          // İstek kontrolü
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
   * Arkadaşlık İsteği Gönder
   */
  sendFriendRequest(targetUserId) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('İstek göndermek için önce giriş yapmalısınız.');
    if (currentUser.id === targetUserId) throw new Error('Kendinize arkadaşlık isteği gönderemezsiniz.');

    const requests = this._getRequests();
    const friendships = this._getFriendships();

    // Arkadaşlık kontrolü
    const isFriend = friendships.some(f => 
      (f.user1Id === currentUser.id && f.user2Id === targetUserId) ||
      (f.user2Id === currentUser.id && f.user1Id === targetUserId)
    );
    if (isFriend) throw new Error('Bu kullanıcı ile zaten arkadaşsınız.');

    // Mevcut istek kontrolü
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

    requests.push(newRequest);
    this._saveRequests(requests);
    return newRequest;
  }

  /**
   * Bekleyen İstekleri Listele (Gelen ve Giden)
   */
  getPendingRequests() {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return { incoming: [], outgoing: [] };

    const requests = this._getRequests();

    const incoming = requests
      .filter(r => r.receiverId === currentUser.id && r.status === 'pending')
      .map(r => {
        const sender = authService.getUserById(r.senderId);
        return {
          ...r,
          sender
        };
      })
      .filter(r => r.sender !== null);

    const outgoing = requests
      .filter(r => r.senderId === currentUser.id && r.status === 'pending')
      .map(r => {
        const receiver = authService.getUserById(r.receiverId);
        return {
          ...r,
          receiver
        };
      })
      .filter(r => r.receiver !== null);

    return { incoming, outgoing };
  }

  /**
   * Arkadaşlık İsteğini Kabul Et
   */
  acceptFriendRequest(requestId) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('Lütfen önce giriş yapın.');

    const requests = this._getRequests();
    const reqIndex = requests.findIndex(r => r.id === requestId && r.receiverId === currentUser.id);

    if (reqIndex === -1) throw new Error('Arkadaşlık isteği bulunamadı.');

    const request = requests[reqIndex];
    request.status = 'accepted';
    this._saveRequests(requests);

    // Arkadaşlık ilişkisi ekle
    const friendships = this._getFriendships();
    friendships.push({
      id: 'rel_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      user1Id: request.senderId,
      user2Id: request.receiverId,
      createdAt: Date.now()
    });
    this._saveFriendships(friendships);
  }

  /**
   * Arkadaşlık İsteğini Reddet
   */
  rejectFriendRequest(requestId) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('Lütfen önce giriş yapın.');

    const requests = this._getRequests();
    const reqIndex = requests.findIndex(r => r.id === requestId && r.receiverId === currentUser.id);

    if (reqIndex !== -1) {
      requests[reqIndex].status = 'rejected';
      this._saveRequests(requests);
    }
  }

  /**
   * Onaylanmış Arkadaş Listesi (En Yüksek Skora Göre Sıralı)
   */
  getFriendsList() {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return [];

    const friendships = this._getFriendships();
    const friendUserIds = friendships
      .filter(f => f.user1Id === currentUser.id || f.user2Id === currentUser.id)
      .map(f => f.user1Id === currentUser.id ? f.user2Id : f.user1Id);

    const friends = friendUserIds
      .map(id => authService.getUserById(id))
      .filter(u => u !== null);

    // Kendi profilimizi de liderlik tablosu mantığıyla ekleyelim
    const listWithMe = [...friends, currentUser];

    // En yüksek skora göre sırala
    return listWithMe.sort((a, b) => (b.bestScore || 0) - (a.bestScore || 0));
  }

  /**
   * Arkadaşı Çıkar
   */
  removeFriend(friendUserId) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return;

    let friendships = this._getFriendships();
    friendships = friendships.filter(f => 
      !( (f.user1Id === currentUser.id && f.user2Id === friendUserId) ||
         (f.user2Id === currentUser.id && f.user1Id === friendUserId) )
    );
    this._saveFriendships(friendships);
  }

  /**
   * Bekleyen Gelen İstek Sayısı (Rozet İçin)
   */
  getUnreadIncomingCount() {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return 0;

    const requests = this._getRequests();
    return requests.filter(r => r.receiverId === currentUser.id && r.status === 'pending').length;
  }
}

export const friendsService = new FriendsService();
