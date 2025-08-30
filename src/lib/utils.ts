import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Store, TimeRange, DistanceInfo } from './types';
import { TIME_CONFIG } from './constants';

// Tailwind クラス結合ユーティリティ
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 距離計算（簡易版）
export function calculateDistance(store1: Store, store2: Store): number {
  const latDiff = store1.lat - store2.lat;
  const lngDiff = store1.lng - store2.lng;
  // 簡易的な距離計算（1度≈111km）
  return Math.sqrt(latDiff ** 2 + lngDiff ** 2) * 111;
}

// 移動時間計算
export function calculateTravelTime(distanceKm: number): number {
  return Math.ceil(distanceKm / TIME_CONFIG.TRAVEL_SPEED_KMH * 60 + TIME_CONFIG.TRAVEL_BUFFER_MIN);
}

// 距離情報生成
export function getDistanceInfo(store1: Store, store2: Store): DistanceInfo {
  const distanceKm = calculateDistance(store1, store2);
  const estimatedMinutes = calculateTravelTime(distanceKm);
  
  return {
    distanceKm: Math.round(distanceKm * 10) / 10, // 小数点1桁
    estimatedMinutes,
  };
}

// 時間文字列を分に変換
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// 分を時間文字列に変換
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// 時間帯重複チェック
export function isTimeOverlap(range1: TimeRange, range2: TimeRange): boolean {
  const start1 = timeToMinutes(range1.start);
  const end1 = timeToMinutes(range1.end);
  const start2 = timeToMinutes(range2.start);
  const end2 = timeToMinutes(range2.end);
  
  return start1 < end2 && start2 < end1;
}

// 時間差分計算（分）
export function getTimeDiffMinutes(time1: string, time2: string): number {
  return Math.abs(timeToMinutes(time1) - timeToMinutes(time2));
}

// 日付文字列フォーマット
export function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });
}

// 相対時間表示
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  return `${days}日前`;
}

// 評価星表示
export function formatRating(rating: number): string {
  const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
  return `${stars} (${rating.toFixed(1)})`;
}

// 移動時間表示
export function formatTravelTime(minutes: number): string {
  if (minutes < 60) return `徒歩${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `徒歩${hours}時間${remainingMinutes}分` : `徒歩${hours}時間`;
}

// 距離表示
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

// ランダムID生成
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

// デバウンス関数
export function debounce<T extends (...args: never[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// スロットル関数
export function throttle<T extends (...args: never[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// 配列のランダムシャッフル
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 配列の重複除去
export function uniqueArray<T>(array: T[], keyFn?: (item: T) => string | number): T[] {
  if (!keyFn) return [...new Set(array)];
  
  const seen = new Set();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// オブジェクトのディープコピー
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as T;
  if (typeof obj === 'object') {
    const copy = {} as T;
    Object.keys(obj).forEach(key => {
      (copy as Record<string, unknown>)[key] = deepClone((obj as Record<string, unknown>)[key]);
    });
    return copy;
  }
  return obj;
}

// 空文字・nullチェック
export function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

// 数値範囲チェック
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}
