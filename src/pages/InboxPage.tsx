import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { MESSAGES, ROLE_LABELS } from '@/lib/constants';
import { isTimeOverlap } from '@/lib/utils';



export default function InboxPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  
  // 自店舗ID（デモ用に固定）
  const currentStoreId = 's1'; // 北浦和店
  const today = '2024-08-31'; // デモ用固定日付

  // データ取得 - polling対応
  const { isLoading: requestsLoading } = useQuery({
    queryKey: queryKeys.requests,
    queryFn: () => api.getRequests(),
    refetchInterval: 7000, // 7秒ごとに自動更新
  });

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
    refetchInterval: 7000, // 7秒ごとに自動更新
  });

  const { data: shiftsResponse } = useQuery({
    queryKey: queryKeys.shifts(today),
    queryFn: () => api.getTodayShifts(today),
  });

  const stores = storesResponse?.data || [];
  const workers = workersResponse?.data || [];
  const publishings = publishingsResponse?.data || { recruitings: [], availables: [] };
  const allShifts = shiftsResponse?.data || [];

  // 承認/拒否ミューテーション
  const approveMutation = useMutation({
    mutationFn: ({ id, type }: { id: string; type: 'recruiting' | 'available' }) => 
      api.approvePublishing(id, type),
    onMutate: ({ id, type }) => {
      // Optimistic update: 即座にリストから削除
      const previousPublishings = queryClient.getQueryData(queryKeys.publishings);
      queryClient.setQueryData(queryKeys.publishings, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            recruitings: type === 'recruiting' 
              ? old.data.recruitings.filter((r: any) => r.id !== id)
              : old.data.recruitings,
            availables: type === 'available'
              ? old.data.availables.filter((a: any) => a.id !== id)
              : old.data.availables,
          }
        };
      });
      return { previousPublishings };
    },
    onSuccess: (response) => {
      if (response.success) {
        showToast('success', '承認完了', MESSAGES.REQUEST_APPROVED);
        queryClient.invalidateQueries({ queryKey: queryKeys.publishings });
        queryClient.invalidateQueries({ queryKey: queryKeys.shifts() });
      } else {
        showToast('error', 'エラー', response.message || MESSAGES.CONFLICT_ERROR);
      }
    },
    onError: (_, __, context) => {
      // エラー時は元に戻す
      if (context?.previousPublishings) {
        queryClient.setQueryData(queryKeys.publishings, context.previousPublishings);
      }
      showToast('error', 'エラー', MESSAGES.UNKNOWN_ERROR);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, type }: { id: string; type: 'recruiting' | 'available' }) => {
      // 拒否の場合は単純にopen=falseにする
      const publishings = publishingsResponse?.data || { recruitings: [], availables: [] };
      
      if (type === 'recruiting') {
        const item = publishings.recruitings.find(r => r.id === id);
        if (item) item.open = false;
      } else {
        const item = publishings.availables.find(a => a.id === id);
        if (item) item.open = false;
      }
      
      return api.updatePublishing(publishings);
    },
    onMutate: ({ id, type }) => {
      // Optimistic update: 即座にリストから削除
      const previousPublishings = queryClient.getQueryData(queryKeys.publishings);
      queryClient.setQueryData(queryKeys.publishings, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            recruitings: type === 'recruiting' 
              ? old.data.recruitings.filter((r: any) => r.id !== id)
              : old.data.recruitings,
            availables: type === 'available'
              ? old.data.availables.filter((a: any) => a.id !== id)
              : old.data.availables,
          }
        };
      });
      return { previousPublishings };
    },
    onSuccess: (response) => {
      if (response.success) {
        showToast('info', '拒否完了', MESSAGES.REQUEST_REJECTED);
        queryClient.invalidateQueries({ queryKey: queryKeys.publishings });
      } else {
        showToast('error', 'エラー', response.message || MESSAGES.UNKNOWN_ERROR);
      }
    },
    onError: (_, __, context) => {
      // エラー時は元に戻す
      if (context?.previousPublishings) {
        queryClient.setQueryData(queryKeys.publishings, context.previousPublishings);
      }
      showToast('error', 'エラー', MESSAGES.UNKNOWN_ERROR);
    },
  });

  const handleApprove = (id: string, type: 'recruiting' | 'available') => {
    approveMutation.mutate({ id, type });
  };

  const handleReject = (id: string, type: 'recruiting' | 'available') => {
    rejectMutation.mutate({ id, type });
  };

  // 自店の不足/余剰枠を抽出
  const myShifts = allShifts.filter(shift => shift.storeId === currentStoreId);
  const shortageSlots = useMemo(() => {
    return myShifts.filter(shift => shift.status === 'shortage').map(shift => ({
      id: shift.id,
      role: shift.role,
      start: shift.start,
      end: shift.end,
      display: `${ROLE_LABELS[shift.role]} ${shift.start}-${shift.end}`
    }));
  }, [myShifts]);

  const surplusSlots = useMemo(() => {
    return myShifts.filter(shift => shift.status === 'surplus').map(shift => ({
      id: shift.id,
      role: shift.role,
      start: shift.start,
      end: shift.end,
      display: `${ROLE_LABELS[shift.role]} ${shift.start}-${shift.end}`
    }));
  }, [myShifts]);

  // 条件セレクタの状態
  const [selectedCondition, setSelectedCondition] = useState<{
    type: 'shortage' | 'surplus' | null;
    slotId: string | null;
  }>({ type: null, slotId: null });

  // デフォルトの条件を設定（最も早い開始時刻の枠）
  useMemo(() => {
    if (selectedCondition.type === null && (shortageSlots.length > 0 || surplusSlots.length > 0)) {
      const allSlots = [...shortageSlots.map(s => ({ ...s, type: 'shortage' as const })), 
                       ...surplusSlots.map(s => ({ ...s, type: 'surplus' as const }))];
      allSlots.sort((a, b) => a.start.localeCompare(b.start));
      if (allSlots.length > 0) {
        setSelectedCondition({ type: allSlots[0].type, slotId: allSlots[0].id });
      }
    }
  }, [shortageSlots, surplusSlots, selectedCondition.type]);

  const selectedSlot = useMemo(() => {
    if (!selectedCondition.type || !selectedCondition.slotId) return null;
    const slots = selectedCondition.type === 'shortage' ? shortageSlots : surplusSlots;
    return slots.find(slot => slot.id === selectedCondition.slotId) || null;
  }, [selectedCondition, shortageSlots, surplusSlots]);

  // 役割一致&時間重なりでフィルタされたリスト
  const filteredDispatchRequests = useMemo(() => {
    if (!selectedSlot || selectedCondition.type !== 'surplus') return [];
    
    return publishings.recruitings.filter(recruiting => {
      // 基本条件：他店、オープン、成立済みでない
      if (recruiting.storeId === currentStoreId || !recruiting.open || (recruiting as any).approvedAt) {
        return false;
      }
      
      // 役割一致
      if (recruiting.role !== selectedSlot.role) return false;
      
      // 時間重なり
      return isTimeOverlap(
        { start: selectedSlot.start, end: selectedSlot.end },
        { start: recruiting.start, end: recruiting.end }
      );
    });
  }, [publishings.recruitings, selectedSlot, selectedCondition.type, currentStoreId]);

  const filteredAvailableStaff = useMemo(() => {
    if (!selectedSlot || selectedCondition.type !== 'shortage') return [];
    
    return publishings.availables.filter(available => {
      // 基本条件：他店、オープン、成立済みでない
      if (available.storeId === currentStoreId || !available.open || (available as any).approvedAt) {
        return false;
      }
      
      // 役割一致
      if (available.role !== selectedSlot.role) return false;
      
      // 時間重なり
      return isTimeOverlap(
        { start: selectedSlot.start, end: selectedSlot.end },
        { start: available.start, end: available.end }
      );
    });
  }, [publishings.availables, selectedSlot, selectedCondition.type, currentStoreId]);

  // 店名表示用ヘルパー関数
  const getStoreName = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    return store ? store.name : '不明な店舗';
  };

  if (requestsLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          地域内シフト調整
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          地域内の他店舗との人員調整が可能です（7秒ごと自動更新）
        </p>
      </div>

      {/* 条件セレクタ */}
      {(shortageSlots.length > 0 || surplusSlots.length > 0) && (
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">対象条件</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                状況
              </label>
              <select
                value={selectedCondition.type || ''}
                onChange={(e) => {
                  const type = e.target.value as 'shortage' | 'surplus';
                  const slots = type === 'shortage' ? shortageSlots : surplusSlots;
                  setSelectedCondition({
                    type,
                    slotId: slots.length > 0 ? slots[0].id : null
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {shortageSlots.length > 0 && (
                  <option value="shortage">人員不足({shortageSlots.length}件)</option>
                )}
                {surplusSlots.length > 0 && (
                  <option value="surplus">人員余剰({surplusSlots.length}件)</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                時間帯・役割
              </label>
              <select
                value={selectedCondition.slotId || ''}
                onChange={(e) => {
                  setSelectedCondition(prev => ({
                    ...prev,
                    slotId: e.target.value
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {(selectedCondition.type === 'shortage' ? shortageSlots : surplusSlots).map(slot => (
                  <option key={slot.id} value={slot.id}>
                    {slot.display}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {selectedSlot && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">
                  {selectedCondition.type === 'shortage' ? '📥 不足枠' : '📤 余剰枠'}：
                </span>
                {selectedSlot.display} の条件に合う{selectedCondition.type === 'shortage' ? '派遣可能な他店人材' : '人員不足の他店'}を表示
              </p>
            </div>
          )}
        </div>
      )}

      {/* 条件に応じたコンテンツ表示（タブナビゲーション削除） */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">

        {/* 条件に応じたコンテンツ */}
        <div className="p-6">
          {!selectedSlot ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-2xl mb-2">⚙️</div>
              <p className="text-gray-500">条件を選択してください</p>
            </div>
          ) : selectedCondition.type === 'surplus' ? (
            /* 余剰枠選択時：人員不足の他店を表示 */
            <div>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  条件に合う人員不足の他店舗
                </h4>
                <p className="text-xs text-gray-600">
                  承認すると自分の店のスタッフを派遣します（余剰枠: {selectedSlot.display}）
                </p>
              </div>
              
              {filteredDispatchRequests.length > 0 ? (
                <div className="space-y-4">
                  {filteredDispatchRequests.map((recruiting) => {
                    return (
                      <div
                        key={recruiting.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-2">
                              <h5 className="font-medium text-gray-900">
                                {getStoreName(recruiting.storeId)}
                              </h5>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 w-fit">
                                人員不足
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>役割: {ROLE_LABELS[recruiting.role]}</p>
                              <p>時間: {recruiting.start} - {recruiting.end}</p>
                              <p>人数: 1名</p>
                              {recruiting.message && (
                                <p className="text-xs italic">「{recruiting.message}」</p>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2 sm:ml-4">
                            <button
                              onClick={() => handleApprove(recruiting.id, 'recruiting')}
                              disabled={approveMutation.isPending}
                              className="flex-1 sm:flex-none px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              承認
                            </button>
                            <button
                              onClick={() => handleReject(recruiting.id, 'recruiting')}
                              disabled={rejectMutation.isPending}
                              className="flex-1 sm:flex-none px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:opacity-50"
                            >
                              拒否
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-2xl mb-2">🔍</div>
                  <p className="text-gray-500">該当の時間帯・役割に合う募集はありません</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedSlot.display} の条件に合致する他店の募集が見つかりませんでした
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* 不足枠選択時：派遣可能な他店人材を表示 */
            <div>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  条件に合う派遣可能な他店人材
                </h4>
                <p className="text-xs text-gray-600">
                  承認するとその人材を受け入れます（不足枠: {selectedSlot.display}）
                </p>
              </div>
              
              {filteredAvailableStaff.length > 0 ? (
                <div className="space-y-4">
                  {filteredAvailableStaff.map((available) => {
                    const worker = workers.find(w => w.id === available.workerId);
                    return (
                      <div
                        key={available.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              {worker?.avatar && (
                                <img
                                  src={worker.avatar}
                                  alt={worker.name}
                                  className="w-10 h-10 rounded-full object-cover shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-gray-900 truncate">
                                  {worker?.name || '人材不明'}
                                </h5>
                                <p className="text-sm text-gray-600 truncate">
                                  {getStoreName(available.storeId)}
                                </p>
                              </div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 shrink-0">
                                派遣可能
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>役割: {ROLE_LABELS[available.role]}</p>
                              <p>時間: {available.start} - {available.end}</p>
                              {available.message && (
                                <p className="text-xs italic">「{available.message}」</p>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2 sm:ml-4">
                            <button
                              onClick={() => handleApprove(available.id, 'available')}
                              disabled={approveMutation.isPending}
                              className="flex-1 sm:flex-none px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              承認
                            </button>
                            <button
                              onClick={() => handleReject(available.id, 'available')}
                              disabled={rejectMutation.isPending}
                              className="flex-1 sm:flex-none px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:opacity-50"
                            >
                              拒否
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-2xl mb-2">🔍</div>
                  <p className="text-gray-500">該当の時間帯に派遣可能な人材が見つかりませんでした</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedSlot.display} の条件に合致する他店の人材が見つかりませんでした
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
