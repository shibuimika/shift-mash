import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
// import { useToast } from '@/components/ToastProvider';
import { TelModal } from '@/components/TelModal';
import { ROLE_LABELS } from '@/lib/constants';
import type { Recruiting, Available } from '@/lib/types';

export default function InboxPage() {
  // const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [telModalData, setTelModalData] = useState<{ phoneNumber: string; storeName: string } | null>(null);
  const [viewMode, setViewMode] = useState<'menu' | 'help-others' | 'request-help'>('menu');
  const [hiddenRecruitings, setHiddenRecruitings] = useState<Set<string>>(new Set());
  const [hiddenAvailables, setHiddenAvailables] = useState<Set<string>>(new Set());
  
  // 自店舗ID（デモ用に固定）
  const currentStoreId = 's1'; // 北浦和店

  // データ取得 - 3秒ごとに自動更新
  const { data: storesResponse } = useQuery({
    queryKey: queryKeys.stores,
    queryFn: () => api.getStores(),
  });

  const { data: workersResponse } = useQuery({
    queryKey: queryKeys.workers,
    queryFn: () => api.getWorkers(),
  });

  const { data: publishingsResponse, isLoading: publishingsLoading } = useQuery({
    queryKey: queryKeys.publishings,
    queryFn: () => api.getPublishings(),
    refetchInterval: 3000, // 3秒ごとに自動更新
  });

  const stores = storesResponse?.data || [];
  const workers = workersResponse?.data || [];
  const publishings = publishingsResponse?.data || { recruitings: [], availables: [] };

  // 他店舗の募集情報（自分が応援する場合）- 非表示にしたものを除外
  const otherStoreRecruitings = publishings.recruitings.filter(r => 
    r.storeId !== currentStoreId && r.open && !hiddenRecruitings.has(r.id)
  );

  // 他店舗の派遣可能人材（自分が応援をお願いする場合）- 非表示にしたものを除外
  const otherStoreAvailables = publishings.availables.filter(a => 
    a.storeId !== currentStoreId && a.open && !hiddenAvailables.has(a.id)
  );

  // 承認ミューテーション（recruiting用）
  const approveRecruitingMutation = useMutation({
    mutationFn: async (recruiting: Recruiting) => {
      return api.approvePublishing(recruiting.id, 'recruiting');
    },
    onSuccess: (response, recruiting) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.publishings });
        queryClient.invalidateQueries({ queryKey: queryKeys.shifts() });
        
        // TELモーダルを表示
        const store = stores.find(s => s.id === recruiting.storeId);
        if (store) {
          setTelModalData({
            phoneNumber: store.phone,
            storeName: store.name,
          });
        }
      }
    },
  });

  // 承認ミューテーション（available用）
  const approveAvailableMutation = useMutation({
    mutationFn: async (available: Available) => {
      return api.approvePublishing(available.id, 'available');
    },
    onSuccess: (response, available) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.publishings });
        queryClient.invalidateQueries({ queryKey: queryKeys.shifts() });
        
        // TELモーダルを表示
        const store = stores.find(s => s.id === available.storeId);
        if (store) {
          setTelModalData({
            phoneNumber: store.phone,
            storeName: store.name,
          });
        }
      }
    },
  });

  // 拒否ミューテーション（recruiting用）
  const rejectRecruitingMutation = useMutation({
    mutationFn: async (recruiting: Recruiting) => {
      // UI上で即座に非表示
      setHiddenRecruitings(prev => new Set(prev).add(recruiting.id));
      
      const updatedPublishings = { ...publishings };
      const targetItem = updatedPublishings.recruitings.find(r => r.id === recruiting.id);
      if (targetItem) targetItem.open = false;
      return api.updatePublishing(updatedPublishings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.publishings });
    },
  });

  // 拒否ミューテーション（available用）
  const rejectAvailableMutation = useMutation({
    mutationFn: async (available: Available) => {
      // UI上で即座に非表示
      setHiddenAvailables(prev => new Set(prev).add(available.id));
      
      const updatedPublishings = { ...publishings };
      const targetItem = updatedPublishings.availables.find(a => a.id === available.id);
      if (targetItem) targetItem.open = false;
      return api.updatePublishing(updatedPublishings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.publishings });
    },
  });

  // ヘルパー関数
  const getStoreName = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    return store ? store.name : '不明な店舗';
  };

  const getWorkerName = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    return worker ? worker.name : 'スタッフ';
  };

  // 評価を絵文字に変換
  const getRatingEmoji = (rating: number) => {
    if (rating >= 4.5) return '☀️ 直近3回高評価';
    if (rating >= 4.0) return '☁️ 安定した評価';
    return '☂️ 評価向上中';
  };

  if (publishingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">読み込み中...</span>
      </div>
    );
  }

  // メインメニュー表示
  if (viewMode === 'menu') {
    return (
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            地域シフト調整
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            近隣店舗との人員調整を行います（3秒ごと自動更新）
          </p>
        </div>

        {/* 2つの大きいカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 近隣店を応援する（他店に派遣の青色） */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-4 h-4 bg-blue-500 rounded mr-3"></div>
              <h4 className="text-lg font-medium text-gray-900">近隣店を応援する</h4>
            </div>
            <p className="text-gray-600 mb-4">
              他店舗の人員不足を手伝います
            </p>
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-600 font-medium">
                {otherStoreRecruitings.length}件の募集があります
              </div>
              <button
                onClick={() => setViewMode('help-others')}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                一覧を見る →
              </button>
            </div>
          </div>

          {/* 応援をお願いする（人員募集の赤色） */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
              <h4 className="text-lg font-medium text-gray-900">応援をお願いする</h4>
            </div>
            <p className="text-gray-600 mb-4">
              他店舗のスタッフに応援をお願いします
            </p>
            <div className="flex items-center justify-between">
              <div className="text-sm text-red-600 font-medium">
                {otherStoreAvailables.length}名の人材が利用可能です
              </div>
              <button
                onClick={() => setViewMode('request-help')}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                一覧を見る →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 近隣店を応援する（募集一覧）
  if (viewMode === 'help-others') {
    return (
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded mr-3"></div>
                近隣店を応援する
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                他店舗の人員募集一覧（{otherStoreRecruitings.length}件）
              </p>
            </div>
            <button
              onClick={() => setViewMode('menu')}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              ← 戻る
            </button>
          </div>
        </div>

        {/* 募集一覧 */}
        <div className="space-y-4">
          {otherStoreRecruitings.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-2xl mb-2">🔍</div>
              <p className="text-gray-600">現在募集中の案件はありません</p>
            </div>
          ) : (
            otherStoreRecruitings.map((recruiting) => (
              <div
                key={recruiting.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 mb-3 sm:mb-0">
                    {/* メイン情報（大きく表示） */}
                    <div className="text-xl font-semibold text-gray-900 mb-1">
                      {recruiting.start}–{recruiting.end}
                    </div>
                    <div className="text-lg font-medium text-gray-700">
                      {getStoreName(recruiting.storeId)} / {ROLE_LABELS[recruiting.role]}
                    </div>
                    {recruiting.message && (
                      <div className="text-sm text-gray-600 mt-1">
                        {recruiting.message}
                      </div>
                    )}
                  </div>

                  {/* 右側ボタン */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => approveRecruitingMutation.mutate(recruiting)}
                      disabled={approveRecruitingMutation.isPending || rejectRecruitingMutation.isPending}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      承認
                    </button>
                    <button
                      onClick={() => rejectRecruitingMutation.mutate(recruiting)}
                      disabled={approveRecruitingMutation.isPending || rejectRecruitingMutation.isPending}
                      className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      拒否
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* TELモーダル */}
        {telModalData && (
          <TelModal
            isOpen={true}
            onClose={() => setTelModalData(null)}
            phoneNumber={telModalData.phoneNumber}
            storeName={telModalData.storeName}
          />
        )}
      </div>
    );
  }

  // 応援をお願いする（派遣可能人材一覧）
  if (viewMode === 'request-help') {
    return (
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                応援をお願いする
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                派遣可能な人材一覧（{otherStoreAvailables.length}名）
              </p>
            </div>
            <button
              onClick={() => setViewMode('menu')}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              ← 戻る
            </button>
          </div>
        </div>

        {/* 派遣可能人材一覧 */}
        <div className="space-y-4">
          {otherStoreAvailables.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-2xl mb-2">👥</div>
              <p className="text-gray-600">現在派遣可能な人材はいません</p>
            </div>
          ) : (
            otherStoreAvailables.map((available) => {
              const worker = workers.find(w => w.id === available.workerId);
              return (
                <div
                  key={available.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 mb-3 sm:mb-0">
                      {/* メイン情報（大きく表示） */}
                      <div className="text-xl font-semibold text-gray-900 mb-1">
                        {available.start}–{available.end}
                      </div>
                      <div className="text-lg font-medium text-gray-700">
                        {getStoreName(available.storeId)} / {ROLE_LABELS[available.role]}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {getWorkerName(available.workerId)} • {worker ? getRatingEmoji(worker.rating) : '評価情報なし'}
                      </div>
                      {available.message && (
                        <div className="text-sm text-gray-600 mt-1">
                          {available.message}
                        </div>
                      )}
                    </div>

                    {/* 右側ボタン */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => approveAvailableMutation.mutate(available)}
                        disabled={approveAvailableMutation.isPending || rejectAvailableMutation.isPending}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        承認
                      </button>
                      <button
                        onClick={() => rejectAvailableMutation.mutate(available)}
                        disabled={approveAvailableMutation.isPending || rejectAvailableMutation.isPending}
                        className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        拒否
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* TELモーダル */}
        {telModalData && (
          <TelModal
            isOpen={true}
            onClose={() => setTelModalData(null)}
            phoneNumber={telModalData.phoneNumber}
            storeName={telModalData.storeName}
          />
        )}
      </div>
    );
  }

  return null;
}
