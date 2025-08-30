import type {
  Store,
  Worker,
  Shift,
  Publishing,
  Request,
  CreateRequestParams,
  ApiResponse,
} from './types';
import { API_CONFIG } from './constants';

// 擬似API実装

class MockAPI {
  private baseUrl = API_CONFIG.BASE_URL;

  // データフェッチ用ヘルパー
  private async fetchJSON<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}/${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch ${endpoint}:`, error);
      throw error;
    }
  }

  // 店舗一覧取得
  async getStores(): Promise<ApiResponse<Store[]>> {
    try {
      const data = await this.fetchJSON<Store[]>('stores.json');
      return { data, success: true };
    } catch (error) {
      return {
        data: [],
        success: false,
        message: error instanceof Error ? error.message : '店舗データの取得に失敗しました',
      };
    }
  }

  // 従業員一覧取得
  async getWorkers(): Promise<ApiResponse<Worker[]>> {
    try {
      const data = await this.fetchJSON<Worker[]>('workers.json');
      return { data, success: true };
    } catch (error) {
      return {
        data: [],
        success: false,
        message: error instanceof Error ? error.message : '従業員データの取得に失敗しました',
      };
    }
  }

  // 当日シフト取得
  async getTodayShifts(date?: string): Promise<ApiResponse<Shift[]>> {
    try {
      const data = await this.fetchJSON<Shift[]>('shifts.json');
      const targetDate = date || new Date().toISOString().split('T')[0];
      const filteredData = data.filter(shift => shift.date === targetDate);
      return { data: filteredData, success: true };
    } catch (error) {
      return {
        data: [],
        success: false,
        message: error instanceof Error ? error.message : 'シフトデータの取得に失敗しました',
      };
    }
  }

  // 公開情報取得
  async getPublishings(): Promise<ApiResponse<Publishing>> {
    try {
      const data = await this.fetchJSON<Publishing>('publishings.json');
      return { data, success: true };
    } catch (error) {
      return {
        data: { recruitings: [], availables: [] },
        success: false,
        message: error instanceof Error ? error.message : '公開情報の取得に失敗しました',
      };
    }
  }

  // リクエスト一覧取得
  async getRequests(): Promise<ApiResponse<Request[]>> {
    try {
      const data = await this.fetchJSON<Request[]>('requests.json');
      return { data, success: true };
    } catch (error) {
      return {
        data: [],
        success: false,
        message: error instanceof Error ? error.message : 'リクエストデータの取得に失敗しました',
      };
    }
  }

  // ローカルストレージ操作用ヘルパー
  private getLocalData<T>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setLocalData<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Failed to save ${key} to localStorage:`, error);
    }
  }

  // シフト更新
  async updateShift(shiftId: string, updates: Partial<Shift>): Promise<ApiResponse<Shift>> {
    try {
      // ローカルストレージから現在のシフトを取得
      const shifts = this.getLocalData<Shift[]>('shifts', []);
      const index = shifts.findIndex(shift => shift.id === shiftId);
      
      if (index === -1) {
        throw new Error('シフトが見つかりません');
      }

      const updatedShift = { ...shifts[index], ...updates };
      shifts[index] = updatedShift;
      
      this.setLocalData('shifts', shifts);
      
      return { data: updatedShift, success: true };
    } catch (error) {
      return {
        data: {} as Shift,
        success: false,
        message: error instanceof Error ? error.message : 'シフトの更新に失敗しました',
      };
    }
  }

  // リクエスト作成
  async createRequest(params: CreateRequestParams): Promise<ApiResponse<Request>> {
    try {
      const requests = this.getLocalData<Request[]>('requests', []);
      
      const newRequest: Request = {
        id: `req_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        ...params,
        status: 'pending',
        createdAt: Date.now(),
        approvedAt: null,
        estimatedTravelTime: 15, // 仮の値
      };

      requests.push(newRequest);
      this.setLocalData('requests', requests);

      return { data: newRequest, success: true };
    } catch (error) {
      return {
        data: {} as Request,
        success: false,
        message: error instanceof Error ? error.message : 'リクエストの作成に失敗しました',
      };
    }
  }

  // リクエスト更新
  async updateRequest(requestId: string, updates: Partial<Request>): Promise<ApiResponse<Request>> {
    try {
      const requests = this.getLocalData<Request[]>('requests', []);
      const index = requests.findIndex(req => req.id === requestId);
      
      if (index === -1) {
        throw new Error('リクエストが見つかりません');
      }

      const updatedRequest = { ...requests[index], ...updates };
      requests[index] = updatedRequest;
      
      this.setLocalData('requests', requests);
      
      return { data: updatedRequest, success: true };
    } catch (error) {
      return {
        data: {} as Request,
        success: false,
        message: error instanceof Error ? error.message : 'リクエストの更新に失敗しました',
      };
    }
  }

  // 公開情報更新
  async updatePublishing(updates: Partial<Publishing>): Promise<ApiResponse<Publishing>> {
    try {
      const current = this.getLocalData<Publishing>('publishings', { recruitings: [], availables: [] });
      const updated = { ...current, ...updates };
      
      this.setLocalData('publishings', updated);
      
      return { data: updated, success: true };
    } catch (error) {
      return {
        data: { recruitings: [], availables: [] },
        success: false,
        message: error instanceof Error ? error.message : '公開情報の更新に失敗しました',
      };
    }
  }

  // 先着制御のためのロック機構
  private locks = new Set<string>();

  async acquireLock(lockKey: string): Promise<boolean> {
    if (this.locks.has(lockKey)) {
      return false;
    }
    this.locks.add(lockKey);
    return true;
  }

  releaseLock(lockKey: string): void {
    this.locks.delete(lockKey);
  }

  // 承認されたリクエストに基づいてシフトを更新
  private async updateShiftsForApprovedRequest(request: Request): Promise<void> {
    const shifts = this.getLocalData<Shift[]>('shifts', []);
    
    if (request.type === 'recruiting') {
      // 人員募集の場合：targetIds[0]のワーカーを応援者として設定
      const shiftIndex = shifts.findIndex(s => s.id === request.shiftId);
      if (shiftIndex !== -1) {
        // 支援先のシフトに応援者を設定
        shifts[shiftIndex] = {
          ...shifts[shiftIndex],
          supportWorkerId: request.targetIds[0], // 最初のターゲットワーカー
          status: 'normal', // 不足解消
          notes: shifts[shiftIndex].notes + ' （他店応援により解決）'
        };
      }
    } else {
      // 派遣希望の場合：request.fromの店舗のワーカーがrequest.targetIds[0]の募集に応援
      // 派遣元のシフトステータスを更新
      const sourceShiftIndex = shifts.findIndex(s => s.id === request.shiftId);
      if (sourceShiftIndex !== -1) {
        shifts[sourceShiftIndex] = {
          ...shifts[sourceShiftIndex],
          status: 'normal', // 余剰解消
          notes: shifts[sourceShiftIndex].notes + ' （他店応援により活用）'
        };
      }
    }
    
    this.setLocalData('shifts', shifts);
  }

  // Publishing（recruitings/availables）承認（先着制御付き）
  async approvePublishing(publishingId: string, type: 'recruiting' | 'available'): Promise<ApiResponse<any>> {
    const lockKey = `approve_${type}_${publishingId}`;
    
    if (!await this.acquireLock(lockKey)) {
      return {
        data: {},
        success: false,
        message: 'このリクエストは既に処理中です',
      };
    }

    try {
      const publishings = this.getLocalData<{ recruitings: any[], availables: any[] }>('publishings', { recruitings: [], availables: [] });
      
      let targetItem: any = null;
      if (type === 'recruiting') {
        targetItem = publishings.recruitings.find(r => r.id === publishingId);
      } else {
        targetItem = publishings.availables.find(a => a.id === publishingId);
      }

      if (!targetItem) {
        throw new Error('対象が見つかりません');
      }

      if (!targetItem.open) {
        throw new Error('この募集は既に終了しています');
      }

      // publishingを無効化
      targetItem.open = false;
      targetItem.approvedAt = Date.now();

      // シフトデータを更新
      await this.updateShiftsForPublishing(targetItem, type);
      
      this.setLocalData('publishings', publishings);
      
      return { data: targetItem, success: true };
    } catch (error) {
      return {
        data: {},
        success: false,
        message: error instanceof Error ? error.message : '承認処理に失敗しました',
      };
    } finally {
      this.releaseLock(lockKey);
    }
  }

  // Publishingに基づくシフト更新
  private async updateShiftsForPublishing(item: any, type: 'recruiting' | 'available'): Promise<void> {
    const shifts = this.getLocalData<Shift[]>('shifts', []);
    
    if (type === 'recruiting') {
      // 人員募集の場合: itemの店舗に自店舗から派遣
      const shiftIndex = shifts.findIndex(s => s.id === item.shiftId);
      if (shiftIndex !== -1) {
        shifts[shiftIndex] = {
          ...shifts[shiftIndex],
          supportWorkerId: 'w1', // 自店舗の適当なワーカー（デモ用）
          status: 'normal',
          notes: shifts[shiftIndex].notes + ' （地域内応援により解決）'
        };
      }
    } else {
      // 派遣可能の場合: itemのワーカーを自店舗で受け入れ
      // 自店舗の不足シフトを解決
      const shortageShift = shifts.find(s => s.storeId === 's1' && s.status === 'shortage');
      if (shortageShift) {
        const shiftIndex = shifts.findIndex(s => s.id === shortageShift.id);
        shifts[shiftIndex] = {
          ...shifts[shiftIndex],
          supportWorkerId: item.workerId,
          status: 'normal',
          notes: shifts[shiftIndex].notes + ' （地域内応援により解決）'
        };
      }
    }
    
    this.setLocalData('shifts', shifts);
  }

  // 旧リクエスト承認（後方互換性のため残す）
  async approveRequest(requestId: string): Promise<ApiResponse<Request>> {
    const lockKey = `approve_${requestId}`;
    
    if (!await this.acquireLock(lockKey)) {
      return {
        data: {} as Request,
        success: false,
        message: 'このリクエストは既に処理中です',
      };
    }

    try {
      const requests = this.getLocalData<Request[]>('requests', []);
      const targetRequest = requests.find(req => req.id === requestId);
      
      if (!targetRequest) {
        throw new Error('リクエストが見つかりません');
      }

      if (targetRequest.status !== 'pending') {
        throw new Error('このリクエストは既に処理済みです');
      }

      // 承認処理
      const approvedAt = Date.now();
      const updatedRequest = { ...targetRequest, status: 'approved' as const, approvedAt };
      
      // シフトデータを更新して応援勤務を反映
      await this.updateShiftsForApprovedRequest(targetRequest);
      
      // リクエスト更新
      const requestIndex = requests.findIndex(req => req.id === requestId);
      requests[requestIndex] = updatedRequest;
      
      // 同じshiftIdの他のリクエストを無効化
      requests.forEach((req, index) => {
        if (req.id !== requestId && req.shiftId === targetRequest.shiftId && req.status === 'pending') {
          requests[index] = { ...req, status: 'invalid' };
        }
      });
      
      this.setLocalData('requests', requests);
      
      return { data: updatedRequest, success: true };
    } catch (error) {
      return {
        data: {} as Request,
        success: false,
        message: error instanceof Error ? error.message : 'リクエストの承認に失敗しました',
      };
    } finally {
      this.releaseLock(lockKey);
    }
  }
}

// シングルトンインスタンス
export const api = new MockAPI();

// React Query用のクエリキー
export const queryKeys = {
  stores: ['stores'] as const,
  workers: ['workers'] as const,
  shifts: (date?: string) => ['shifts', date] as const,
  publishings: ['publishings'] as const,
  requests: ['requests'] as const,
} as const;
