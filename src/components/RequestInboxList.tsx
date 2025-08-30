import { 
  ClockIcon,
  MapPinIcon,
  UserIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { Request } from '@/lib/types';
import { REQUEST_TYPE_LABELS } from '@/lib/constants';
import { formatRelativeTime, formatTravelTime } from '@/lib/utils';

interface RequestInboxListProps {
  requests: Request[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  isLoading: boolean;
}

export function RequestInboxList({ requests, onApprove, onReject, isLoading }: RequestInboxListProps) {
  // 店舗と従業員データを取得（本来はpropsで受け取るかhookで取得）
  const stores = [
    { id: 's1', name: '北浦和店' },
    { id: 's2', name: '与野店' },
    { id: 's3', name: '浦和店' },
  ];
  
  const workers = [
    { id: 'w1', name: '佐藤 太郎' },
    { id: 'w2', name: '鈴木 花子' },
    { id: 'w3', name: '田中 一郎' },
    { id: 'w4', name: '山田 美咲' },
    { id: 'w5', name: '渡辺 健太' },
    { id: 'w6', name: '伊藤 さくら' },
  ];
  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-lg mb-2">📭</div>
        <p className="text-gray-600">新しいリクエストはありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          onApprove={() => onApprove(request.id)}
          onReject={() => onReject(request.id)}
          isLoading={isLoading}
          stores={stores}
          workers={workers}
        />
      ))}
    </div>
  );
}

interface RequestCardProps {
  request: Request;
  onApprove: () => void;
  onReject: () => void;
  isLoading: boolean;
  stores: Store[];
  workers: Worker[];
}

interface Store {
  id: string;
  name: string;
}

interface Worker {
  id: string;
  name: string;
}

function RequestCard({ request, onApprove, onReject, isLoading, stores, workers }: RequestCardProps) {
  const isRecruiting = request.type === 'recruiting';
  const fromStore = stores.find(s => s.id === request.from);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isRecruiting
                  ? 'bg-red-100 text-red-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {REQUEST_TYPE_LABELS[request.type]}
            </span>
            <span className="text-sm text-gray-500">
              {formatRelativeTime(request.createdAt)}
            </span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mt-1">
            {fromStore?.name}からのリクエスト
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {isRecruiting ? '人員募集の依頼' : '派遣希望の申し出'}
          </p>
        </div>
      </div>

      {/* リクエスト詳細 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <ClockIcon className="w-4 h-4 shrink-0 mr-2" />
            <span>時間: 未定（シフト詳細が必要）</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <UserIcon className="w-4 h-4 shrink-0 mr-2" />
            <span>対象: {request.targetIds.length}名</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <MapPinIcon className="w-4 h-4 shrink-0 mr-2" />
            <span>送信元: {fromStore?.name || '不明'}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <ClockIcon className="w-4 h-4 shrink-0 mr-2" />
            <span>移動時間: {formatTravelTime(request.estimatedTravelTime)}</span>
          </div>
        </div>
      </div>

      {/* メッセージ */}
      {request.message && (
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">{request.message}</p>
        </div>
      )}

      {/* 対象者情報 */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          {isRecruiting ? '募集対象' : '派遣希望者'}
        </h4>
        <div className="space-y-1">
          {request.targetIds.map((targetId) => {
            const worker = workers.find(w => w.id === targetId);
            return (
              <div key={targetId} className="text-sm text-gray-600">
                • {worker?.name || `ID: ${targetId}`}
              </div>
            );
          })}
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex space-x-3">
        <button
          onClick={onReject}
          disabled={isLoading}
          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <XMarkIcon className="w-4 h-4 shrink-0 mr-1" />
          拒否
        </button>
        <button
          onClick={onApprove}
          disabled={isLoading}
          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
          ) : (
            <CheckIcon className="w-4 h-4 shrink-0 mr-1" />
          )}
          承認
        </button>
      </div>
    </div>
  );
}
