import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import type { Shift } from '@/lib/types';

/**
 * シフトデータ取得・操作のカスタムフック
 */
export function useShifts(date?: string) {
  const queryClient = useQueryClient();
  const targetDate = date || new Date().toISOString().split('T')[0];

  // シフト一覧取得
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.shifts(targetDate),
    queryFn: () => api.getTodayShifts(targetDate),
    staleTime: 2 * 60 * 1000, // 2分
  });

  const shifts = response?.data || [];
  const isSuccess = response?.success ?? false;

  // シフト更新ミューテーション
  const updateShiftMutation = useMutation({
    mutationFn: ({ shiftId, updates }: { shiftId: string; updates: Partial<Shift> }) =>
      api.updateShift(shiftId, updates),
    onSuccess: () => {
      // キャッシュを無効化して再取得
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts(targetDate) });
    },
  });

  // ステータス別のシフト取得
  const getShiftsByStatus = (status: Shift['status']) => {
    return shifts.filter(shift => shift.status === status);
  };

  // 店舗別のシフト取得
  const getShiftsByStore = (storeId: string) => {
    return shifts.filter(shift => shift.storeId === storeId);
  };

  // 不足・余剰シフトの取得
  const getProblematicShifts = () => {
    return shifts.filter(shift => 
      shift.status === 'shortage' || shift.status === 'surplus'
    );
  };

  // 統計情報の計算
  const getShiftStats = () => {
    const total = shifts.length;
    const shortage = shifts.filter(s => s.status === 'shortage').length;
    const surplus = shifts.filter(s => s.status === 'surplus').length;
    const normal = shifts.filter(s => s.status === 'normal').length;

    return {
      total,
      shortage,
      surplus,
      normal,
      problematicRatio: total > 0 ? ((shortage + surplus) / total) * 100 : 0,
    };
  };

  return {
    // データ
    shifts,
    isLoading,
    error,
    isSuccess,
    
    // アクション
    refetch,
    updateShift: updateShiftMutation.mutate,
    isUpdating: updateShiftMutation.isPending,
    
    // ヘルパー関数
    getShiftsByStatus,
    getShiftsByStore,
    getProblematicShifts,
    getShiftStats,
  };
}
