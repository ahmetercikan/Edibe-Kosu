// Klavye + dokunmatik (kaydırma ve buton) girişlerini tek bir arayüzde toplar.
const SWIPE_MIN_DIST = 32;
const SWIPE_MAX_TIME = 550;

export class InputController {
  constructor() {
    this.listeners = { laneChange: [], action: [], pauseToggle: [] };
    this._touchStart = null;
    this._bind();
  }

  on(event, cb) {
    this.listeners[event]?.push(cb);
  }

  _emit(event, payload) {
    for (const cb of this.listeners[event] || []) cb(payload);
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this._emit('laneChange', -1);
          break;
        case 'ArrowRight':
        case 'KeyD':
          this._emit('laneChange', 1);
          break;
        case 'Space':
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault();
          this._emit('action');
          break;
        case 'Escape':
        case 'KeyP':
          this._emit('pauseToggle');
          break;
      }
    });

    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      this._touchStart = { x: t.clientX, y: t.clientY, time: performance.now() };
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
      if (!this._touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this._touchStart.x;
      const dy = t.clientY - this._touchStart.y;
      const dt = performance.now() - this._touchStart.time;
      this._touchStart = null;
      if (dt > SWIPE_MAX_TIME) {
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) this._emit('action');
        return;
      }
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_MIN_DIST) {
        this._emit('laneChange', dx > 0 ? 1 : -1);
      } else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
        this._emit('action');
      }
    }, { passive: true });

    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnAction = document.getElementById('btn-action');
    btnLeft?.addEventListener('touchstart', (e) => { e.preventDefault(); this._emit('laneChange', -1); }, { passive: false });
    btnRight?.addEventListener('touchstart', (e) => { e.preventDefault(); this._emit('laneChange', 1); }, { passive: false });
    btnAction?.addEventListener('touchstart', (e) => { e.preventDefault(); this._emit('action'); }, { passive: false });
    btnLeft?.addEventListener('click', () => this._emit('laneChange', -1));
    btnRight?.addEventListener('click', () => this._emit('laneChange', 1));
    btnAction?.addEventListener('click', () => this._emit('action'));
  }
}
