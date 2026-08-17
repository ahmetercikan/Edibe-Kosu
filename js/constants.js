// Oyun genelinde paylaşılan sabitler.
export const LANE_COUNT = 3;
export const LANE_WIDTH = 2.4;
export const LANE_X = [-LANE_WIDTH, 0, LANE_WIDTH];

export const SPAWN_Z = -70;      // Nesnelerin belirdiği uzak nokta (kameradan ileride)
export const DESPAWN_Z = 9;      // Bu noktayı geçen nesneler havuza geri döner
export const PLAYER_Z = 0;

export const BASE_SPEED = 9.5;       // birim/saniye, dünyanın oyuncuya doğru kayma hızı
export const MAX_SPEED_BONUS = 11;   // zamanla eklenen üst sınır
export const SPEED_RAMP_PER_SEC = 0.045;

export const LANE_SMOOTH_TIME = 0.13;   // saniye - şerit geçiş yumuşatması
export const CAMERA_SMOOTH_TIME = 0.18;

export const PLAYER_HIT_RADIUS = 0.62;
export const OBSTACLE_HIT_RADIUS = 0.7;
export const PICKUP_HIT_RADIUS = 0.85;
export const PROJECTILE_HIT_RADIUS = 0.9;

export const START_LIVES = 3;
export const INVULN_TIME = 1.4; // çarpışma sonrası dokunulmazlık süresi

export const MODE = { HACI: 'haci', EDIBE: 'edibe' };

export const POWER_TYPE = { SPEED: 'speed', SHIELD: 'shield' };
export const POWER_DURATION = 6.5;

export const THROW_COOLDOWN = 0.55;
export const MAX_AMMO = 5;
export const AMMO_REGEN_SEC = 3.2;

export const CHASE_CATCH_DISTANCE = 3.4;   // Devrim'i yakalamak için gereken mesafe
export const CHASE_MAX_GAP = 26;
export const CHASE_START_GAP = 14;
export const CHASE_CLOSE_RATE = 4.2;       // oyuncu Devrim'den ne kadar hızlı yaklaşabilir (birim/sn)
export const CHASE_DRIFT_RATE = 2.0;       // Devrim'in doğal olarak açtığı mesafe

// Frame'ler arası çok büyük sıçramaları önlemek için (sekme/arka plana alma).
export const MAX_DELTA = 1 / 20;

export const BOOST_COOLDOWN = 2.6;   // Edibe modunda hızlanma hamlesinin şarj süresi
export const LEVEL_INTERVAL_SEC = 18; // Her kaç saniyede bir "seviye" artsın
