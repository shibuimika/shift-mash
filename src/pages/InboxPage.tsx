import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
// import { useToast } from '@/components/ToastProvider';
import { TelModal } from '@/components/TelModal';
import { ROLE_LABELS } from '@/lib/constants';
import type { Recruiting, Available } from '@/lib/types';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

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

  const { data: publishingsResponse, isLoading: publishingsLoading, refetch: refetchPublishings } = useQuery({
    queryKey: queryKeys.publishings,
    queryFn: () => api.getPublishings(),
    refetchInterval: 3000, // 3秒ごとに自動更新
  });

  const stores = storesResponse?.data || [];
  const workers = workersResponse?.data || [];
  const publishings = publishingsResponse?.data || { recruitings: [], availables: [] };

  // 自店舗の公開した募集情報（他店舗からの応援リクエストを受信する場合）
  const myStoreRecruitings = publishings.recruitings.filter(r => 
    r.storeId === currentStoreId && r.open && !hiddenRecruitings.has(r.id)
  );

  // 自店舗の公開した募集IDのセットを作成
  const myStoreRecruitingIds = new Set(myStoreRecruitings.map(r => r.id));

  // 自店舗の公開した派遣可能情報
  const myStoreAvailables = publishings.availables.filter(a => 
    a.storeId === currentStoreId && a.open && !hiddenAvailables.has(a.id)
  );

  // 自店舗の公開した派遣可能IDのセットを作成
  const myStoreAvailableIds = new Set(myStoreAvailables.map(a => a.id));

  // 他店舗の派遣可能人材（自分が応援をお願いする場合）- 自店舗の募集にマッチするもののみ
  const otherStoreAvailables = publishings.availables.filter(a => 
    a.storeId !== currentStoreId && 
    a.open && 
    !hiddenAvailables.has(a.id) &&
    a.matchedFromRecruitingId && 
    myStoreRecruitingIds.has(a.matchedFromRecruitingId)
  );

  // 他店舗の募集（自分が応援する場合）- 自店舗の派遣可能にマッチするもののみ
  const otherStoreRecruitings = publishings.recruitings.filter(r => 
    r.storeId !== currentStoreId && 
    r.open && 
    !hiddenRecruitings.has(r.id) &&
    r.matchedFromAvailableId && 
    myStoreAvailableIds.has(r.matchedFromAvailableId)
  );

  // デバッグ用ログ
  console.log('=== InboxPage データ確認 ===');
  console.log('InboxPage - 公開情報:', publishings);
  console.log('InboxPage - 自店舗ID:', currentStoreId);
  console.log('InboxPage - 全募集数:', publishings.recruitings.length);
  console.log('InboxPage - 全派遣可能数:', publishings.availables.length);
  console.log('InboxPage - 自店舗の募集:', myStoreRecruitings);
  console.log('InboxPage - 自店舗の派遣可能:', myStoreAvailables);
  console.log('InboxPage - 他店舗の派遣可能（マッチング）:', otherStoreAvailables);
  console.log('InboxPage - 他店舗の募集（マッチング）:', otherStoreRecruitings);
  console.log('InboxPage - 自店舗の募集数:', myStoreRecruitings.length);
  console.log('InboxPage - 自店舗の派遣可能数:', myStoreAvailables.length);
  console.log('InboxPage - 他店舗の派遣可能数（マッチング）:', otherStoreAvailables.length);
  console.log('InboxPage - 他店舗の募集数（マッチング）:', otherStoreRecruitings.length);
  console.log('========================');

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
        {/* 更新ボタン */}
        <div className="flex justify-end">
          <button
            onClick={() => refetchPublishings()}
            disabled={publishingsLoading}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${publishingsLoading ? 'animate-spin' : ''}`} />
            更新
          </button>
        </div>

        {/* 2つの大きいカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 応援をお願いする（赤色） */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
              <h4 className="text-lg font-medium text-gray-900">応援をお願いする</h4>
            </div>
            <p className="text-gray-600 mb-4">
              近隣の店のスタッフに来てもらう
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

          {/* 応援する（青色） */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-4 h-4 bg-blue-500 rounded mr-3"></div>
              <h4 className="text-lg font-medium text-gray-900">応援する</h4>
            </div>
            <p className="text-gray-600 mb-4">
              近隣の店にスタッフを派遣する
            </p>
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-600 font-medium">
                {otherStoreRecruitings.length}件の募集にリクエストがあります
              </div>
              <button
                onClick={() => setViewMode('help-others')}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                一覧を見る →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 応援する（自店舗の募集に対する応援リクエスト）
  if (viewMode === 'help-others') {
    return (
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded mr-3"></div>
                応援する
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                近隣の店にスタッフを派遣する（{otherStoreRecruitings.length}件）
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => refetchPublishings()}
                disabled={publishingsLoading}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowPathIcon className={`w-4 h-4 mr-2 ${publishingsLoading ? 'animate-spin' : ''}`} />
                更新
              </button>
              <button
                onClick={() => setViewMode('menu')}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                ← 戻る
              </button>
            </div>
          </div>
        </div>

        {/* 応援リクエスト一覧 */}
        <div className="space-y-4">
          {otherStoreRecruitings.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-2xl mb-2">📭</div>
              <p className="text-gray-600">現在応援できるリクエストはありません</p>
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
                      {ROLE_LABELS[recruiting.role]} 募集
                    </div>
                    {recruiting.message && (
                      <div className="text-sm text-gray-600 mt-1">
                        {recruiting.message}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      📞 他店舗からの応援リクエストが届いています
                    </div>
                  </div>

                  {/* 右側ボタン */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => approveRecruitingMutation.mutate(recruiting)}
                      disabled={approveRecruitingMutation.isPending || rejectRecruitingMutation.isPending}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
                近隣の店のスタッフに来てもらう（{otherStoreAvailables.length}名）
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => refetchPublishings()}
                disabled={publishingsLoading}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowPathIcon className={`w-4 h-4 mr-2 ${publishingsLoading ? 'animate-spin' : ''}`} />
                更新
              </button>
              <button
                onClick={() => setViewMode('menu')}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                ← 戻る
              </button>
            </div>
          </div>
        </div>

        {/* 派遣可能人材一覧 */}
        <div className="space-y-4">
          {otherStoreAvailables.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-2xl mb-2">👥</div>
              <p className="text-gray-600">現在応援可能な人材はいません</p>
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
