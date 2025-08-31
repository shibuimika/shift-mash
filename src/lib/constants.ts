// アプリケーション定数

// ロール定義
export const ROLES = {
  HALL: 'hall',
  KITCHEN: 'kitchen',
  CASHIER: 'cashier',
} as const;

export const ROLE_LABELS: Record<string, string> = {
  [ROLES.HALL]: 'ホール',
  [ROLES.KITCHEN]: 'キッチン',
  [ROLES.CASHIER]: 'レジ',
  'support': '応援スタッフ',
};

// シフトステータス
export const SHIFT_STATUS = {
  NORMAL: 'normal',
  SHORTAGE: 'shortage',
  SURPLUS: 'surplus',
} as const;

export const SHIFT_STATUS_LABELS: Record<string, string> = {
  [SHIFT_STATUS.NORMAL]: '正常',
  [SHIFT_STATUS.SHORTAGE]: '不足',
  [SHIFT_STATUS.SURPLUS]: '余剰',
};

// リクエストタイプ
export const REQUEST_TYPE = {
  RECRUITING: 'recruiting',
  DISPATCH: 'dispatch',
} as const;

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  [REQUEST_TYPE.RECRUITING]: '人員募集',
  [REQUEST_TYPE.DISPATCH]: '他店舗に派遣',
};

// リクエストステータス
export const REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  INVALID: 'invalid',
} as const;

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  [REQUEST_STATUS.PENDING]: '承認待ち',
  [REQUEST_STATUS.APPROVED]: '承認済み',
  [REQUEST_STATUS.REJECTED]: '拒否',
  [REQUEST_STATUS.INVALID]: '無効',
};

// Toast表示時間
export const TOAST_DURATION = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 8000,
} as const;

// API設定
export const API_CONFIG = {
  BASE_URL: '/mock',
  TIMEOUT: 5000,
} as const;

// ページ設定
export const ROUTES = {
  DAY: '/day',
  INBOX: '/inbox',
} as const;

export const PAGE_TITLES: Record<string, string> = {
  [ROUTES.DAY]: '当日シフト',
  [ROUTES.INBOX]: '受信リクエスト',
};

// 時間設定
export const TIME_CONFIG = {
  SHIFT_START: '06:00',
  SHIFT_END: '23:00',
  SLOT_DURATION: 30, // 分
  TRAVEL_SPEED_KMH: 4, // 徒歩速度
  TRAVEL_BUFFER_MIN: 5, // 移動時間バッファ
} as const;

// UI設定
export const UI_CONFIG = {
  MOBILE_BREAKPOINT: 768,
  MAX_DISTANCE_KM: 10,
  MIN_RATING: 3.0,
  MAX_CANDIDATES: 20,
} as const;

// メッセージテンプレート
export const MESSAGES = {
  NO_CANDIDATES_RECRUITING: '地域内に派遣可能なスタッフが見つかりませんでした。\n募集を公開しました。',
  NO_CANDIDATES_DISPATCH: '地域内に人員不足の店舗が見つかりませんでした。\n派遣可能人員として公開しました。',
  REQUEST_SENT: '地域内の他店舗にリクエストを送信しました。',
  REQUEST_APPROVED: 'リクエストが承認されました。',
  REQUEST_REJECTED: 'リクエストが拒否されました。',
  CONFLICT_ERROR: 'すでに他店舗で成立しました。募集/派遣可能を更新してください。',
  NETWORK_ERROR: 'ネットワークエラーが発生しました。',
  UNKNOWN_ERROR: '予期しないエラーが発生しました。',
} as const;

// バリデーション
export const VALIDATION = {
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 20,
  MIN_MESSAGE_LENGTH: 5,
  MAX_MESSAGE_LENGTH: 100,
  MIN_EXPERIENCE: 0,
  MAX_EXPERIENCE: 120, // 10年
} as const;
