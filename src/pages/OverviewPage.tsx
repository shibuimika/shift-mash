import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import type { ShiftSummary } from '@/lib/types';
import { SHIFT_STATUS } from '@/lib/constants';

export default function OverviewPage() {
  const today = new Date().toISOString().split('T')[0];

  // データ取得
  const { data: shiftsResponse, isLoading: shiftsLoading } = useQuery({
    queryKey: queryKeys.shifts(today),
    queryFn: () => api.getTodayShifts(today),
  });

  const { data: requestsResponse, isLoading: requestsLoading } = useQuery({
    queryKey: queryKeys.requests,
    queryFn: () => api.getRequests(),
  });

  const shifts = shiftsResponse?.data || [];
  const requests = requestsResponse?.data || [];

  // サマリー計算
  const summary: ShiftSummary = {
    totalShifts: shifts.length,
    shortageCount: shifts.filter(s => s.status === SHIFT_STATUS.SHORTAGE).length,
    surplusCount: shifts.filter(s => s.status === SHIFT_STATUS.SURPLUS).length,
    normalCount: shifts.filter(s => s.status === SHIFT_STATUS.NORMAL).length,
    pendingRequests: requests.filter(r => r.status === 'pending').length,
  };



  if (shiftsLoading || requestsLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 全体サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white overflow-hidden shadow-sm rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-medium">全</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    総シフト数
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {summary.totalShifts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-sm font-medium">不</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    人員不足
                  </dt>
                  <dd className="text-lg font-medium text-red-600">
                    {summary.shortageCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-medium">余</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    人員余剰
                  </dt>
                  <dd className="text-lg font-medium text-blue-600">
                    {summary.surplusCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-yellow-600 text-sm font-medium">待</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    承認待ち
                  </dt>
                  <dd className="text-lg font-medium text-yellow-600">
                    {summary.pendingRequests}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* 最近のアクティビティ */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">最近のアクティビティ</h3>
        </div>
        <div className="p-6">
          {requests.length > 0 ? (
            <div className="space-y-3">
              {requests
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 5)
                .map((request) => (
                  <div key={request.id} className="flex items-center space-x-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        request.status === 'approved'
                          ? 'bg-green-500'
                          : request.status === 'rejected'
                          ? 'bg-red-500'
                          : request.status === 'pending'
                          ? 'bg-yellow-500'
                          : 'bg-gray-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        {request.type === 'recruiting' ? '人員募集' : '派遣申し出'}
                        リクエストが
                        {request.status === 'approved'
                          ? '承認されました'
                          : request.status === 'rejected'
                          ? '拒否されました'
                          : request.status === 'pending'
                          ? '送信されました'
                          : '無効になりました'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(request.createdAt).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">最近のアクティビティはありません</p>
          )}
        </div>
      </div>
    </div>
  );
}
