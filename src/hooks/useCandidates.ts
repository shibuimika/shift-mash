import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import type { Shift, Candidate, Worker, Store, Recruiting, Available } from '@/lib/types';
import { getDistanceInfo, isTimeOverlap } from '@/lib/utils';
import { UI_CONFIG } from '@/lib/constants';

/**
 * 候補検索のカスタムフック
 */
export function useCandidates(shift: Shift | null, type: 'recruiting' | 'dispatch') {
  // 必要なデータを取得
  const { data: storesResponse } = useQuery({
    queryKey: queryKeys.stores,
    queryFn: () => api.getStores(),
  });

  const { data: workersResponse } = useQuery({
    queryKey: queryKeys.workers,
    queryFn: () => api.getWorkers(),
  });

  const { data: publishingsResponse } = useQuery({
    queryKey: queryKeys.publishings,
    queryFn: () => api.getPublishings(),
  });

  const stores = storesResponse?.data || [];
  const workers = workersResponse?.data || [];
  const publishings = publishingsResponse?.data || { recruitings: [], availables: [] };

  // 候補を計算
  const candidates = useMemo(() => {
    if (!shift) return [];

    const currentStore = stores.find(store => store.id === shift.storeId);
    if (!currentStore) return [];

    if (type === 'recruiting') {
      // 人員募集の場合：派遣可能な人材を検索
      return findAvailableWorkers(shift, currentStore, stores, workers, publishings.availables);
    } else {
      // 派遣の場合：募集中の枠を検索
      return findRecruitingOpportunities(shift, currentStore, stores, publishings.recruitings);
    }
  }, [shift, type, stores, workers, publishings]);

  return {
    candidates,
    isLoading: !storesResponse || !workersResponse || !publishingsResponse,
  };
}

/**
 * 派遣可能な人材を検索
 */
function findAvailableWorkers(
  shift: Shift,
  currentStore: Store,
  allStores: Store[],
  allWorkers: Worker[],
  availables: Available[]
): Candidate[] {
  const candidates: Candidate[] = [];

  availables.forEach(available => {
    // 基本条件チェック
    if (!available.open) return;
    if (available.storeId === shift.storeId) return; // 同じ店舗は除外
    
    // ロールマッチング：完全一致のみ
    const roleMatch = available.role === shift.role;
    if (!roleMatch) return;

    // 時間重複チェック（実際に重複している時間帯が必要）
    const timeOverlap = isTimeOverlap(
      { start: shift.start, end: shift.end },
      { start: available.start, end: available.end }
    );
    if (!timeOverlap) return; // 重複なしは除外

    const worker = allWorkers.find(w => w.id === available.workerId);
    const store = allStores.find(s => s.id === available.storeId);
    
    if (!worker || !store) return;

    // 距離制限は緩和（デモ用）
    const distance = getDistanceInfo(currentStore, store);
    if (distance.distanceKm > 15) return; // 15km以内に拡大

    candidates.push({
      id: available.id,
      type: 'worker',
      name: worker.name,
      storeName: store.name,
      role: available.role,
      start: available.start,
      end: available.end,
      rating: worker.rating,
      experience: worker.experience,
      avatar: worker.avatar,
      distance,
      message: available.message,
    });
  });

  // 並び替え：距離 → 評価 → 経験
  return candidates
    .sort((a, b) => {
      // 距離で並び替え
      if (a.distance.distanceKm !== b.distance.distanceKm) {
        return a.distance.distanceKm - b.distance.distanceKm;
      }
      // 評価で並び替え（高い順）
      if (a.rating !== b.rating) {
        return (b.rating || 0) - (a.rating || 0);
      }
      // 経験で並び替え（高い順）
      return (b.experience || 0) - (a.experience || 0);
    })
    .slice(0, UI_CONFIG.MAX_CANDIDATES);
}

/**
 * 募集中の機会を検索
 */
function findRecruitingOpportunities(
  shift: Shift,
  currentStore: Store,
  allStores: Store[],
  recruitings: Recruiting[]
): Candidate[] {
  const candidates: Candidate[] = [];

  recruitings.forEach(recruiting => {
    // 基本条件チェック
    if (!recruiting.open) return;
    if (recruiting.storeId === shift.storeId) return; // 同じ店舗は除外
    
    // ロールマッチング：完全一致のみ
    const roleMatch = recruiting.role === shift.role;
    if (!roleMatch) return;

    // 時間重複チェック（実際に重複している時間帯が必要）
    const timeOverlap = isTimeOverlap(
      { start: shift.start, end: shift.end },
      { start: recruiting.start, end: recruiting.end }
    );
    if (!timeOverlap) return; // 重複なしは除外

    const store = allStores.find(s => s.id === recruiting.storeId);
    if (!store) return;

    // 距離制限は緩和（デモ用）
    const distance = getDistanceInfo(currentStore, store);
    if (distance.distanceKm > 15) return; // 15km以内に拡大

    candidates.push({
      id: recruiting.id,
      type: 'recruiting',
      storeName: store.name,
      role: recruiting.role,
      start: recruiting.start,
      end: recruiting.end,
      distance,
      message: recruiting.message,
    });
  });

  // 並び替え：距離 → 作成日時（新しい順）
  return candidates
    .sort((a, b) => {
      // 距離で並び替え
      if (a.distance.distanceKm !== b.distance.distanceKm) {
        return a.distance.distanceKm - b.distance.distanceKm;
      }
      // 作成日時で並び替え（仮で名前順）
      return a.storeName.localeCompare(b.storeName);
    })
    .slice(0, UI_CONFIG.MAX_CANDIDATES);
}

/**
 * 候補検索用のヘルパーフック（検索条件指定版）
 */
export function useSearchCandidates() {
  const { data: storesResponse } = useQuery({
    queryKey: queryKeys.stores,
    queryFn: () => api.getStores(),
  });

  const { data: workersResponse } = useQuery({
    queryKey: queryKeys.workers,
    queryFn: () => api.getWorkers(),
  });

  const stores = storesResponse?.data || [];
  const workers = workersResponse?.data || [];

  const searchWorkerByName = (name: string): Worker[] => {
    return workers.filter(worker =>
      worker.name.toLowerCase().includes(name.toLowerCase())
    );
  };

  const getWorkersByStore = (storeId: string): Worker[] => {
    return workers.filter(worker => worker.storeId === storeId);
  };

  const getWorkersByRole = (role: string): Worker[] => {
    return workers.filter(worker => worker.roles.includes(role));
  };

  return {
    stores,
    workers,
    searchWorkerByName,
    getWorkersByStore,
    getWorkersByRole,
    isLoading: !storesResponse || !workersResponse,
  };
}
