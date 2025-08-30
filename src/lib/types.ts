// 店舗情報
export interface Store {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  phone: string;
}

// 従業員情報
export interface Worker {
  id: string;
  name: string;
  storeId: string;
  roles: string[];
  rating: number;
  experience: number; // 勤務月数
  avatar: string;
}

// シフト状態
export type ShiftStatus = 'normal' | 'shortage' | 'surplus';

// シフト情報
export interface Shift {
  id: string;
  storeId: string;
  workerId: string | null;
  role: string;
  start: string; // HH:MM形式
  end: string;   // HH:MM形式
  status: ShiftStatus;
  date: string;  // YYYY-MM-DD形式
  supportWorkerId: string | null; // 応援者ID
  notes: string;
}

// リクエストタイプ
export type RequestType = 'recruiting' | 'dispatch';

// リクエストステータス
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'invalid';

// リクエスト情報
export interface Request {
  id: string;
  from: string; // 送信元店舗ID
  to: string;   // 送信先店舗ID
  type: RequestType;
  targetIds: string[]; // 対象のWorkerIDまたはRecruitingID
  shiftId: string;
  targetShiftId?: string;
  status: RequestStatus;
  createdAt: number;
  approvedAt: number | null;
  message: string;
  estimatedTravelTime: number; // 移動時間（分）
}

// 募集情報
export interface Recruiting {
  id: string;
  storeId: string;
  shiftId: string;
  role: string;
  start: string;
  end: string;
  date: string;
  open: boolean;
  createdAt: number;
  message: string;
}

// 派遣可能情報
export interface Available {
  id: string;
  storeId: string;
  workerId: string;
  shiftId: string;
  role: string;
  start: string;
  end: string;
  date: string;
  open: boolean;
  createdAt: number;
  message: string;
}

// 公開エンティティ
export interface Publishing {
  recruitings: Recruiting[];
  availables: Available[];
}

// リクエスト作成パラメータ
export interface CreateRequestParams {
  from: string;
  to: string;
  type: RequestType;
  targetIds: string[];
  shiftId: string;
  targetShiftId?: string;
  message: string;
}

// 距離・移動時間情報
export interface DistanceInfo {
  distanceKm: number;
  estimatedMinutes: number;
}

// 検索候補（統合型）
export interface Candidate {
  id: string;
  type: 'worker' | 'recruiting';
  name?: string; // Workerの場合
  storeName: string;
  role: string;
  start: string;
  end: string;
  rating?: number; // Workerの場合
  experience?: number; // Workerの場合
  avatar?: string; // Workerの場合
  distance: DistanceInfo;
  message?: string;
}

// モーダル表示用のデータ
export interface ModalData {
  shift: Shift;
  type: RequestType;
  candidates: Candidate[];
}

// Toast通知タイプ
export type ToastType = 'success' | 'error' | 'info' | 'warning';

// Toast通知
export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

// アプリケーション状態
export interface AppState {
  currentUser: {
    storeId: string;
    storeName: string;
    role: 'manager' | 'staff';
  };
  selectedDate: string;
  requestLocks: Set<string>; // 競合制御用
}

// API Response型
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// 時間帯重複チェック用
export interface TimeRange {
  start: string;
  end: string;
}

// 統計情報
export interface ShiftSummary {
  totalShifts: number;
  shortageCount: number;
  surplusCount: number;
  normalCount: number;
  pendingRequests: number;
}
