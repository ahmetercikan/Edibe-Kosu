/**
 * Room Service (Çok Oyunculu Düello & Gerçek Zamanlı Sinyalleşme)
 * BroadcastChannel ve Storage eventleri kullanarak sekmeler/cihazlar arası sıfır gecikmeli haberleşme.
 */

import { authService } from './authService.js';

class RoomService {
  constructor() {
    this.channelName = 'mahalle_duel_broadcast_channel';
    this.channel = null;
    this.currentRoomId = null;
    this.opponentUser = null;

    this.onInviteCallbacks = [];
    this.onAcceptCallbacks = [];
    this.onRejectCallbacks = [];
    this.onFrameCallbacks = [];
    this.onOpponentLeaveCallbacks = [];

    this.initChannel();
  }

  initChannel() {
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(this.channelName);
      this.channel.onmessage = (e) => this._handleMessage(e.data);
    }

    // Fallback: LocalStorage storage eventleri (tüm tarayıcılarda çapraz sekme desteği)
    window.addEventListener('storage', (e) => {
      if (e.key === 'mahalle_duel_msg_bus' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          this._handleMessage(data);
        } catch (err) {}
      }
    });
  }

  _postMessage(msg) {
    const payload = { ...msg, timestamp: Date.now() };
    if (this.channel) {
      this.channel.postMessage(payload);
    }
    // Storage fallback için de yaz
    localStorage.setItem('mahalle_duel_msg_bus', JSON.stringify(payload));
  }

  _handleMessage(data) {
    if (!data || !data.type) return;

    const currentUser = authService.getCurrentUser();

    switch (data.type) {
      case 'DUEL_INVITE':
        if (currentUser && data.targetUserId === currentUser.id) {
          this.onInviteCallbacks.forEach(cb => cb(data));
        }
        break;

      case 'DUEL_ACCEPT':
        if (currentUser && data.targetUserId === currentUser.id) {
          this.currentRoomId = data.roomId;
          this.opponentUser = data.fromUser;
          this.onAcceptCallbacks.forEach(cb => cb(data));
        }
        break;

      case 'DUEL_REJECT':
        if (currentUser && data.targetUserId === currentUser.id) {
          this.onRejectCallbacks.forEach(cb => cb(data));
        }
        break;

      case 'DUEL_FRAME':
        if (this.currentRoomId && data.roomId === this.currentRoomId && data.userId !== currentUser?.id) {
          this.onFrameCallbacks.forEach(cb => cb(data));
        }
        break;

      case 'DUEL_LEAVE':
        if (this.currentRoomId && data.roomId === this.currentRoomId && data.userId !== currentUser?.id) {
          this.onOpponentLeaveCallbacks.forEach(cb => cb(data));
        }
        break;
    }
  }

  /**
   * Arkadaşa Düello Daveti Gönder
   */
  sendInvite(targetUser) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('Davet göndermek için giriş yapmalısınız.');

    const roomId = 'room_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    this.currentRoomId = roomId;
    this.opponentUser = targetUser;

    this._postMessage({
      type: 'DUEL_INVITE',
      roomId,
      fromUser: currentUser,
      targetUserId: targetUser.id
    });

    return roomId;
  }

  /**
   * Gelen Daveti Kabul Et
   */
  acceptInvite(inviteData) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return;

    this.currentRoomId = inviteData.roomId;
    this.opponentUser = inviteData.fromUser;

    this._postMessage({
      type: 'DUEL_ACCEPT',
      roomId: inviteData.roomId,
      fromUser: currentUser,
      targetUserId: inviteData.fromUser.id
    });
  }

  /**
   * Gelen Daveti Reddet
   */
  rejectInvite(inviteData) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return;

    this._postMessage({
      type: 'DUEL_REJECT',
      roomId: inviteData.roomId,
      fromUser: currentUser,
      targetUserId: inviteData.fromUser.id
    });
  }

  /**
   * Canlı Oyun Çerçevesi (Frame) Yayınla (Pozisyon, Şerit, Skor, Durum)
   */
  broadcastFrame(frameData) {
    const currentUser = authService.getCurrentUser();
    if (!this.currentRoomId || !currentUser) return;

    this._postMessage({
      type: 'DUEL_FRAME',
      roomId: this.currentRoomId,
      userId: currentUser.id,
      ...frameData
    });
  }

  /**
   * Düellodan Ayrıl
   */
  leaveRoom() {
    const currentUser = authService.getCurrentUser();
    if (this.currentRoomId && currentUser) {
      this._postMessage({
        type: 'DUEL_LEAVE',
        roomId: this.currentRoomId,
        userId: currentUser.id
      });
    }
    this.currentRoomId = null;
    this.opponentUser = null;
  }

  // Dinleyiciler
  onInvite(cb) { this.onInviteCallbacks.push(cb); }
  onAccept(cb) { this.onAcceptCallbacks.push(cb); }
  onReject(cb) { this.onRejectCallbacks.push(cb); }
  onFrame(cb) { this.onFrameCallbacks.push(cb); }
  onOpponentLeave(cb) { this.onOpponentLeaveCallbacks.push(cb); }
}

export const roomService = new RoomService();
