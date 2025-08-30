import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import type { Request, CreateRequestParams } from '@/lib/types';
import { MESSAGES } from '@/lib/constants';

/**
 * リクエストデータ取得・操作のカスタムフック
 */
export function useRequests() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // リクエスト一覧取得
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.requests,
    queryFn: () => api.getRequests(),
    staleTime: 1 * 60 * 1000, // 1分
  });

  const requests = response?.data || [];
  const isSuccess = response?.success ?? false;

  // リクエスト作成ミューテーション
  const createRequestMutation = useMutation({
    mutationFn: (params: CreateRequestParams) => api.createRequest(params),
    onSuccess: (response) => {
      if (response.success) {
        showToast('success', '送信完了', MESSAGES.REQUEST_SENT);
        queryClient.invalidateQueries({ queryKey: queryKeys.requests });
      } else {
        showToast('error', 'エラー', response.message || MESSAGES.UNKNOWN_ERROR);
      }
    },
    onError: () => {
      showToast('error', 'エラー', MESSAGES.NETWORK_ERROR);
    },
  });

  // リクエスト承認ミューテーション
  const approveRequestMutation = useMutation({
    mutationFn: (requestId: string) => api.approveRequest(requestId),
    onSuccess: (response) => {
      if (response.success) {
        showToast('success', '承認完了', MESSAGES.REQUEST_APPROVED);
        queryClient.invalidateQueries({ queryKey: queryKeys.requests });
        queryClient.invalidateQueries({ queryKey: queryKeys.shifts() });
      } else {
        showToast('error', 'エラー', response.message || MESSAGES.CONFLICT_ERROR);
      }
    },
    onError: () => {
      showToast('error', 'エラー', MESSAGES.UNKNOWN_ERROR);
    },
  });

  // リクエスト拒否ミューテーション
  const rejectRequestMutation = useMutation({
    mutationFn: (requestId: string) =>
      api.updateRequest(requestId, { status: 'rejected', approvedAt: Date.now() }),
    onSuccess: (response) => {
      if (response.success) {
        showToast('info', '拒否完了', MESSAGES.REQUEST_REJECTED);
        queryClient.invalidateQueries({ queryKey: queryKeys.requests });
      } else {
        showToast('error', 'エラー', response.message || MESSAGES.UNKNOWN_ERROR);
      }
    },
    onError: () => {
      showToast('error', 'エラー', MESSAGES.UNKNOWN_ERROR);
    },
  });

  // ステータス別のリクエスト取得
  const getRequestsByStatus = (status: Request['status']) => {
    return requests.filter(request => request.status === status);
  };

  // 店舗別のリクエスト取得（送信・受信）
  const getRequestsByStore = (storeId: string, direction: 'sent' | 'received' | 'all' = 'all') => {
    return requests.filter(request => {
      switch (direction) {
        case 'sent':
          return request.from === storeId;
        case 'received':
          return request.to === storeId;
        case 'all':
        default:
          return request.from === storeId || request.to === storeId;
      }
    });
  };

  // タイプ別のリクエスト取得
  const getRequestsByType = (type: Request['type']) => {
    return requests.filter(request => request.type === type);
  };

  // 承認待ちリクエストの取得
  const getPendingRequests = () => {
    return requests.filter(request => request.status === 'pending');
  };

  // 最近のリクエストの取得
  const getRecentRequests = (limit: number = 10) => {
    return [...requests]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  };

  // 統計情報の計算
  const getRequestStats = () => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;

    return {
      total,
      pending,
      approved,
      rejected,
      approvalRate: total > 0 ? (approved / (approved + rejected)) * 100 : 0,
    };
  };

  return {
    // データ
    requests,
    isLoading,
    error,
    isSuccess,
    
    // アクション
    refetch,
    createRequest: createRequestMutation.mutate,
    approveRequest: approveRequestMutation.mutate,
    rejectRequest: rejectRequestMutation.mutate,
    
    // ローディング状態
    isCreating: createRequestMutation.isPending,
    isApproving: approveRequestMutation.isPending,
    isRejecting: rejectRequestMutation.isPending,
    
    // ヘルパー関数
    getRequestsByStatus,
    getRequestsByStore,
    getRequestsByType,
    getPendingRequests,
    getRecentRequests,
    getRequestStats,
  };
}
