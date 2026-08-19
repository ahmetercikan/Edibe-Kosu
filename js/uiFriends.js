/**
 * UI Friends (Kullanıcı Girişi ve Arkadaşlık Modalları Arayüz Yönetimi)
 */

import { authService } from './services/authService.js';
import { friendsService } from './services/friendsService.js';
import { roomService } from './services/roomService.js';
import { cloudDb } from './services/cloudDb.js';

class UIFriends {
  constructor() {
    this.activeTab = 'friends'; // 'friends', 'requests', 'search'
    this.authTab = 'login'; // 'login', 'register'
  }

  init() {
    this._bindEvents();
    
    // Auth durum değişikliklerini dinle
    authService.onAuthStateChanged((user) => {
      this.updateHeaderUI(user);
      this.refreshFriendsModal();
    });

    // Bulut canlı güncelleme dinleyicisi (Farklı cihazlardan gelen istek/kullanıcı sinyalleri)
    cloudDb.onCloudUpdate(() => {
      const user = authService.getCurrentUser();
      this.updateHeaderUI(user);
      this.refreshFriendsModal();
    });

    // Düello davet dinleyicileri
    roomService.onInvite((data) => this.handleIncomingDuelInvite(data));
    roomService.onAccept((data) => {
      this.showToast(`${data.fromUser.username} düello davetini kabul etti! ⚔️ Başlıyor...`, 'success');
      this.closeFriendsModal();
      if (window.__game) {
        window.__game.startDuel(data.fromUser);
      }
    });
    roomService.onReject((data) => {
      this.showToast('Rakip düello davetini reddetti.', 'error');
    });
  }

  _bindEvents() {
    // Menü Butonları
    const btnAuth = document.getElementById('btn-auth-modal');
    const btnFriends = document.getElementById('btn-friends-modal');

    if (btnAuth) btnAuth.addEventListener('click', () => this.openAuthModal());
    if (btnFriends) btnFriends.addEventListener('click', () => this.openFriendsModal());

    // Kapatma Butonları
    const closeAuthBtn = document.getElementById('close-auth-modal');
    const closeFriendsBtn = document.getElementById('close-friends-modal');

    if (closeAuthBtn) closeAuthBtn.addEventListener('click', () => this.closeAuthModal());
    if (closeFriendsBtn) closeFriendsBtn.addEventListener('click', () => this.closeFriendsModal());

    // Modal Arka Planına Tıklayınca Kapatma
    const authModal = document.getElementById('modal-auth');
    const friendsModal = document.getElementById('modal-friends');

    if (authModal) {
      authModal.addEventListener('click', (e) => {
        if (e.target === authModal) this.closeAuthModal();
      });
    }
    if (friendsModal) {
      friendsModal.addEventListener('click', (e) => {
        if (e.target === friendsModal) this.closeFriendsModal();
      });
    }

    // Auth Sekme Geçişleri (Giriş / Kayıt)
    const tabAuthLogin = document.getElementById('tab-auth-login');
    const tabAuthRegister = document.getElementById('tab-auth-register');
    const linkGotoRegister = document.getElementById('link-goto-register');
    const linkGotoLogin = document.getElementById('link-goto-login');

    if (tabAuthLogin) tabAuthLogin.addEventListener('click', () => this.switchAuthTab('login'));
    if (tabAuthRegister) tabAuthRegister.addEventListener('click', () => this.switchAuthTab('register'));

    if (linkGotoRegister) {
      linkGotoRegister.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchAuthTab('register');
      });
    }
    if (linkGotoLogin) {
      linkGotoLogin.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchAuthTab('login');
      });
    }

    // Auth Formları
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleLogin();
      });
    }

    if (formRegister) {
      formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleRegister();
      });
    }

    // Çıkış Yap Butonu
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        authService.logout();
        this.closeAuthModal();
      });
    }

    // Arkadaşlık Modal Sekme Geçişleri
    const tabFriendsList = document.getElementById('tab-friends-list');
    const tabFriendsReqs = document.getElementById('tab-friends-requests');
    const tabFriendsSearch = document.getElementById('tab-friends-search');

    if (tabFriendsList) tabFriendsList.addEventListener('click', () => this.switchFriendsTab('friends'));
    if (tabFriendsReqs) tabFriendsReqs.addEventListener('click', () => this.switchFriendsTab('requests'));
    if (tabFriendsSearch) tabFriendsSearch.addEventListener('click', () => this.switchFriendsTab('search'));

    // Arama Çubuğu
    const inputSearch = document.getElementById('input-user-search');
    const btnSearch = document.getElementById('btn-user-search');

    if (btnSearch && inputSearch) {
      btnSearch.addEventListener('click', () => this.handleSearch(inputSearch.value));
      inputSearch.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') this.handleSearch(inputSearch.value);
      });
    }
  }

  async updateHeaderUI(user) {
    const btnAuth = document.getElementById('btn-auth-modal');
    const btnFriends = document.getElementById('btn-friends-modal');
    const badge = document.getElementById('friends-badge');

    if (user) {
      if (btnAuth) btnAuth.innerHTML = `${user.avatar || '👤'} ${user.username}`;
      if (btnFriends) btnFriends.style.display = 'inline-flex';

      // Rozet Güncelleme
      const unreadCount = await friendsService.getUnreadIncomingCount();
      if (badge) {
        if (unreadCount > 0) {
          badge.textContent = unreadCount;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
    } else {
      if (btnAuth) btnAuth.innerHTML = `👤 Giriş Yap / Kayıt Ol`;
      if (btnFriends) btnFriends.style.display = 'none';
      if (badge) badge.classList.add('hidden');
    }
  }

  // ================= AUTH MODAL =================

  openAuthModal() {
    const user = authService.getCurrentUser();
    const modal = document.getElementById('modal-auth');
    if (!modal) return;

    const loggedInView = document.getElementById('auth-logged-in-view');
    const loggedOutView = document.getElementById('auth-logged-out-view');

    if (user) {
      if (loggedInView) loggedInView.classList.remove('hidden');
      if (loggedOutView) loggedOutView.classList.add('hidden');
      
      const usernameSpan = document.getElementById('profile-username');
      const avatarSpan = document.getElementById('profile-avatar');
      const scoreSpan = document.getElementById('profile-score');

      if (usernameSpan) usernameSpan.textContent = user.username;
      if (avatarSpan) avatarSpan.textContent = user.avatar || '👤';
      if (scoreSpan) scoreSpan.textContent = (user.bestScore || 0).toLocaleString('tr-TR');
    } else {
      if (loggedInView) loggedInView.classList.add('hidden');
      if (loggedOutView) loggedOutView.classList.remove('hidden');
      this.switchAuthTab('login');
    }

    modal.classList.remove('hidden');
  }

  closeAuthModal() {
    const modal = document.getElementById('modal-auth');
    if (modal) modal.classList.add('hidden');
    this.clearAuthErrors();
  }

  switchAuthTab(tab) {
    this.authTab = tab;
    const tabLogin = document.getElementById('tab-auth-login');
    const tabRegister = document.getElementById('tab-auth-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

    this.clearAuthErrors();

    if (tab === 'login') {
      tabLogin?.classList.add('active');
      tabRegister?.classList.remove('active');
      formLogin?.classList.remove('hidden');
      formRegister?.classList.add('hidden');
    } else {
      tabRegister?.classList.add('active');
      tabLogin?.classList.remove('active');
      formRegister?.classList.remove('hidden');
      formLogin?.classList.add('hidden');
    }
  }

  clearAuthErrors() {
    const errorEl = document.getElementById('auth-error-msg');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    }
  }

  showAuthError(msg) {
    const errorEl = document.getElementById('auth-error-msg');
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.add('hidden');
    }
  }

  async handleLogin() {
    const usernameInput = document.getElementById('login-username-input')?.value;
    const passwordInput = document.getElementById('login-password-input')?.value;

    try {
      await authService.login({ usernameOrEmail: usernameInput, password: passwordInput });
      this.closeAuthModal();
      this.showToast('Giriş yapıldı! Hoş geldin 👋', 'success');
    } catch (err) {
      this.showAuthError(err.message);
    }
  }

  async handleRegister() {
    const username = document.getElementById('reg-username-input')?.value;
    const email = document.getElementById('reg-email-input')?.value;
    const password = document.getElementById('reg-password-input')?.value;
    const avatar = document.querySelector('input[name="reg-avatar"]:checked')?.value || '🧓';

    try {
      const res = await authService.register({ username, email, password, avatar });
      this.closeAuthModal();
      if (res && res.isAutoLoggedIn) {
        this.showToast('👋 Bu hesap mevcut olduğu için doğrudan giriş yapıldı!', 'success');
      } else {
        this.showToast('Kayıt oluşturuldu! Hoş geldin 🚀', 'success');
      }
    } catch (err) {
      this.showAuthError(err.message);
    }
  }

  // ================= FRIENDS MODAL =================

  openFriendsModal() {
    const user = authService.getCurrentUser();
    if (!user) {
      this.openAuthModal();
      return;
    }

    const modal = document.getElementById('modal-friends');
    if (!modal) return;

    this.switchFriendsTab(this.activeTab);
    modal.classList.remove('hidden');
  }

  closeFriendsModal() {
    const modal = document.getElementById('modal-friends');
    if (modal) modal.classList.add('hidden');
  }

  async switchFriendsTab(tab) {
    this.activeTab = tab;
    const btnList = document.getElementById('tab-friends-list');
    const btnReqs = document.getElementById('tab-friends-requests');
    const btnSearch = document.getElementById('tab-friends-search');

    const viewList = document.getElementById('view-friends-list');
    const viewReqs = document.getElementById('view-friends-requests');
    const viewSearch = document.getElementById('view-friends-search');

    [btnList, btnReqs, btnSearch].forEach(btn => btn?.classList.remove('active'));
    [viewList, viewReqs, viewSearch].forEach(view => view?.classList.add('hidden'));

    if (tab === 'friends') {
      btnList?.classList.add('active');
      viewList?.classList.remove('hidden');
      await this.renderFriendsList();
    } else if (tab === 'requests') {
      btnReqs?.classList.add('active');
      viewReqs?.classList.remove('hidden');
      await this.renderPendingRequests();
    } else if (tab === 'search') {
      btnSearch?.classList.add('active');
      viewSearch?.classList.remove('hidden');
      const inputSearch = document.getElementById('input-user-search');
      if (inputSearch && inputSearch.value.trim()) {
        await this.handleSearch(inputSearch.value);
      } else {
        this.renderSearchResults([]);
      }
    }
  }

  refreshFriendsModal() {
    const modal = document.getElementById('modal-friends');
    if (modal && !modal.classList.contains('hidden')) {
      this.switchFriendsTab(this.activeTab);
    }
  }

  async renderFriendsList() {
    const container = document.getElementById('container-friends-list');
    if (!container) return;

    const friends = await friendsService.getFriendsList();
    const currentUser = authService.getCurrentUser();

    if (friends.length === 0) {
      container.innerHTML = `<div class="empty-state">Henüz arkadaşınız yok. "Arkadaş Ara" sekmesinden mahalleden insanları ekleyebilirsiniz!</div>`;
      return;
    }

    let html = '';
    friends.forEach((user, index) => {
      const isMe = user.id === currentUser?.id;
      let medal = '';
      if (index === 0) medal = '🥇';
      else if (index === 1) medal = '🥈';
      else if (index === 2) medal = '🥉';

      html += `
        <div class="user-card ${isMe ? 'card-me' : ''}">
          <div class="user-card-left">
            <span class="user-rank">${medal || (index + 1) + '.'}</span>
            <span class="user-avatar">${user.avatar || '👤'}</span>
            <div class="user-info">
              <span class="user-name">${user.username} ${isMe ? '<small>(Sen)</small>' : ''}</span>
              <span class="user-score">Skor: ${user.bestScore.toLocaleString('tr-TR')}</span>
            </div>
          </div>
          <div class="user-card-right">
            ${!isMe ? `
              <button class="btn btn-sm btn-duel send-duel-btn" data-id="${user.id}" title="Canlı Düello Başlat">⚔️ Düello</button>
              <button class="btn-icon-danger remove-friend-btn" data-id="${user.id}" title="Arkadaşlıktan Çıkar">❌</button>
            ` : ''}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Düello butonlarını bağla
    container.querySelectorAll('.send-duel-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const friendsList = await friendsService.getFriendsList();
        const friend = friendsList.find(u => u.id === id);
        if (friend) {
          try {
            roomService.sendInvite(friend);
            this.closeFriendsModal();
            this.showToast(`${friend.username} kullanıcısına düello daveti gönderildi! ⚔️ Bekleniyor...`, 'info', 5000);
          } catch (err) {
            this.showToast(err.message, 'error');
          }
        }
      });
    });

    // Silme butonlarını bağla
    container.querySelectorAll('.remove-friend-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const confirmed = await this.showConfirm({
          title: 'Arkadaşı Çıkar',
          message: 'Bu kullanıcıyı arkadaşlarınızdan çıkarmak istediğinize emin misiniz?',
          confirmText: 'Evet, Çıkar',
          cancelText: 'Vazgeç',
          icon: '🗑️'
        });
        if (confirmed) {
          await friendsService.removeFriend(id);
          await this.renderFriendsList();
          await this.updateHeaderUI(currentUser);
          this.showToast('Arkadaş listenizden çıkarıldı.', 'info');
        }
      });
    });
  }

  async renderPendingRequests() {
    const containerIncoming = document.getElementById('container-incoming-requests');
    const containerOutgoing = document.getElementById('container-outgoing-requests');

    if (!containerIncoming || !containerOutgoing) return;

    const { incoming, outgoing } = await friendsService.getPendingRequests();

    // Gelen istekler
    if (incoming.length === 0) {
      containerIncoming.innerHTML = `<div class="empty-state-small">Gelen arkadaşlık isteği yok.</div>`;
    } else {
      let html = '';
      incoming.forEach(req => {
        html += `
          <div class="user-card">
            <div class="user-card-left">
              <span class="user-avatar">${req.sender.avatar || '👤'}</span>
              <div class="user-info">
                <span class="user-name">${req.sender.username}</span>
                <span class="user-sub">Sana arkadaşlık isteği gönderdi.</span>
              </div>
            </div>
            <div class="user-card-right">
              <button class="btn btn-sm btn-success accept-req-btn" data-id="${req.id}">Kabul Et</button>
              <button class="btn btn-sm btn-danger reject-req-btn" data-id="${req.id}">Reddet</button>
            </div>
          </div>
        `;
      });
      containerIncoming.innerHTML = html;

      containerIncoming.querySelectorAll('.accept-req-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const reqId = e.currentTarget.getAttribute('data-id');
          await friendsService.acceptFriendRequest(reqId);
          await this.renderPendingRequests();
          await this.updateHeaderUI(authService.getCurrentUser());
          this.showToast('Arkadaşlık isteği kabul edildi! 🎉', 'success');
        });
      });

      containerIncoming.querySelectorAll('.reject-req-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const reqId = e.currentTarget.getAttribute('data-id');
          await friendsService.rejectFriendRequest(reqId);
          await this.renderPendingRequests();
          await this.updateHeaderUI(authService.getCurrentUser());
          this.showToast('İstek reddedildi.', 'info');
        });
      });
    }

    // Giden istekler
    if (outgoing.length === 0) {
      containerOutgoing.innerHTML = `<div class="empty-state-small">Giden bekleyen istek yok.</div>`;
    } else {
      let html = '';
      outgoing.forEach(req => {
        html += `
          <div class="user-card">
            <div class="user-card-left">
              <span class="user-avatar">${req.receiver.avatar || '👤'}</span>
              <div class="user-info">
                <span class="user-name">${req.receiver.username}</span>
                <span class="user-sub">İstek gönderildi (Yanıt bekleniyor...)</span>
              </div>
            </div>
          </div>
        `;
      });
      containerOutgoing.innerHTML = html;
    }
  }

  async handleSearch(query) {
    if (!query || !query.trim()) {
      this.renderSearchResults([]);
      return;
    }
    const container = document.getElementById('container-search-results');
    if (container) container.innerHTML = `<div class="empty-state">Aranıyor…</div>`;

    try {
      const results = await friendsService.searchUsers(query);
      this.renderSearchResults(results);
    } catch (err) {
      this.renderSearchResults([]);
    }
  }

  renderSearchResults(results) {
    const container = document.getElementById('container-search-results');
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = `<div class="empty-state">Kullanıcı bulunamadı.</div>`;
      return;
    }

    let html = '';
    results.forEach(user => {
      let actionBtn = '';

      if (user.friendshipStatus === 'friend') {
        actionBtn = `<span class="badge-status badge-friend">✓ Arkadaşsınız</span>`;
      } else if (user.friendshipStatus === 'pending_sent') {
        actionBtn = `<span class="badge-status badge-pending">İstek Gönderildi</span>`;
      } else if (user.friendshipStatus === 'pending_received') {
        actionBtn = `<span class="badge-status badge-pending">İstek Geldi</span>`;
      } else {
        actionBtn = `<button class="btn btn-sm btn-primary send-req-btn" data-id="${user.id}">+ Arkadaş Ekle</button>`;
      }

      html += `
        <div class="user-card">
          <div class="user-card-left">
            <span class="user-avatar">${user.avatar || '👤'}</span>
            <div class="user-info">
              <span class="user-name">${user.username}</span>
              <span class="user-score">En Yüksek Skor: ${user.bestScore.toLocaleString('tr-TR')}</span>
            </div>
          </div>
          <div class="user-card-right">
            ${actionBtn}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.send-req-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const targetId = e.currentTarget.getAttribute('data-id');
        try {
          await friendsService.sendFriendRequest(targetId);
          const searchInput = document.getElementById('input-user-search');
          await this.handleSearch(searchInput ? searchInput.value : '');
          await this.updateHeaderUI(authService.getCurrentUser());
          this.showToast('Arkadaşlık isteği gönderildi! ✨', 'success');
        } catch (err) {
          this.showToast(err.message, 'error');
        }
      });
    });
  }

  /**
   * Modern Toast Bildirimi Göster
   */
  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-hiding');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Modern Confirm Diyalogu Göster (Promise Döndürür)
   */
  showConfirm({ title = 'Onay Gerekli', message, confirmText = 'Evet, Onayla', cancelText = 'Vazgeç', icon = '⚠️' }) {
    return new Promise((resolve) => {
      const modal = document.getElementById('modal-confirm');
      const titleEl = document.getElementById('confirm-title');
      const messageEl = document.getElementById('confirm-message');
      const iconEl = document.getElementById('confirm-icon');
      const btnOk = document.getElementById('btn-confirm-ok');
      const btnCancel = document.getElementById('btn-confirm-cancel');

      if (!modal || !btnOk || !btnCancel) {
        resolve(window.confirm(message));
        return;
      }

      if (titleEl) titleEl.textContent = title;
      if (messageEl) messageEl.textContent = message;
      if (iconEl) iconEl.textContent = icon;
      if (btnOk) btnOk.textContent = confirmText;
      if (btnCancel) btnCancel.textContent = cancelText;

      const cleanup = (result) => {
        modal.classList.add('hidden');
        btnOk.removeEventListener('click', onOk);
        btnCancel.removeEventListener('click', onCancel);
        modal.removeEventListener('click', onBackdrop);
        resolve(result);
      };

      const onOk = () => cleanup(true);
      const onCancel = () => cleanup(false);
      const onBackdrop = (e) => {
        if (e.target === modal) cleanup(false);
      };

      btnOk.addEventListener('click', onOk);
      btnCancel.addEventListener('click', onCancel);
      modal.addEventListener('click', onBackdrop);

      modal.classList.remove('hidden');
    });
  }

  /**
   * Gelen Düello Daveti Modalı
   */
  handleIncomingDuelInvite(inviteData) {
    const modal = document.getElementById('modal-duel-invite');
    const msgEl = document.getElementById('duel-invite-msg');
    const btnAccept = document.getElementById('btn-accept-duel');
    const btnReject = document.getElementById('btn-reject-duel');

    if (!modal) return;

    if (msgEl) {
      msgEl.textContent = `${inviteData.fromUser.avatar || '🧓'} ${inviteData.fromUser.username} seni Mahalle Düellosuna davet ediyor! ⚔️`;
    }

    const cleanup = () => {
      modal.classList.add('hidden');
    };

    if (btnAccept) {
      btnAccept.onclick = () => {
        cleanup();
        roomService.acceptInvite(inviteData);
        this.closeFriendsModal();
        if (window.__game) {
          window.__game.startDuel(inviteData.fromUser);
        }
      };
    }

    if (btnReject) {
      btnReject.onclick = () => {
        cleanup();
        roomService.rejectInvite(inviteData);
      };
    }

    modal.classList.remove('hidden');
  }
}

export const uiFriends = new UIFriends();
