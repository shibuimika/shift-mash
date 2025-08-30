import { 
  UserPlusIcon, 
  ArrowRightIcon,
  ClockIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import type { Shift, Worker } from '@/lib/types';
import { SHIFT_STATUS, ROLE_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface ShiftCellProps {
  shift: Shift;
  worker?: Worker;
  onRequestSupport: () => void;
  onOfferDispatch: () => void;
}

export function ShiftCell({ shift, worker, onRequestSupport, onOfferDispatch }: ShiftCellProps) {
  const isShortage = shift.status === SHIFT_STATUS.SHORTAGE;
  const isSurplus = shift.status === SHIFT_STATUS.SURPLUS;
  const isNormal = shift.status === SHIFT_STATUS.NORMAL;

  const cellClassName = cn(
    'shift-cell',
    {
      'shift-cell-shortage': isShortage,
      'shift-cell-surplus': isSurplus,
    }
  );

  return (
    <div className={cellClassName}>
      {/* 上部オーバーレイボタン */}
      {(isShortage || isSurplus) && (
        <div className="absolute -top-2 left-2 right-2 flex gap-2 z-10">
          {isShortage && (
            <button
              onClick={onRequestSupport}
              className="btn-shortage flex-1 text-xs py-1 px-2"
              title="人員募集"
            >
              <UserPlusIcon className="w-3 h-3 shrink-0 inline-block mr-1" />
              人員募集
            </button>
          )}
          {isSurplus && (
            <button
              onClick={onOfferDispatch}
              className="btn-surplus flex-1 text-xs py-1 px-2"
              title="他店舗に派遣"
            >
              <ArrowRightIcon className="w-3 h-3 shrink-0 inline-block mr-1" />
              他店舗に派遣
            </button>
          )}
        </div>
      )}

      {/* シフト情報 */}
      <div className="pt-2">
        {/* 時間とロール */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-sm font-medium text-gray-900">
            <ClockIcon className="w-4 h-4 shrink-0 mr-1" />
            {shift.start} - {shift.end}
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            {ROLE_LABELS[shift.role] || shift.role}
          </span>
        </div>

        {/* ワーカー情報 */}
        <div className="flex items-center space-x-2">
          {worker ? (
            <>
              {worker.avatar ? (
                <img
                  src={worker.avatar}
                  alt={worker.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <UserIcon className="w-4 h-4 shrink-0 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {worker.name}
                </p>
                <p className="text-xs text-gray-500">
                  評価: {worker.rating.toFixed(1)} ★
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center text-sm text-gray-500">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-2">
                <UserIcon className="w-4 h-4 shrink-0 text-gray-400" />
              </div>
              <span>未配属</span>
            </div>
          )}
        </div>

        {/* 応援者情報（もしあれば） */}
        {shift.supportWorkerId && (
          <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
            <p className="text-xs text-green-700 font-medium">
              他店応援あり
            </p>
          </div>
        )}

        {/* ステータス表示 */}
        <div className="mt-2 flex items-center justify-between">
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              {
                'bg-red-100 text-red-800': isShortage,
                'bg-blue-100 text-blue-800': isSurplus,
                'bg-green-100 text-green-800': isNormal,
              }
            )}
          >
            {isShortage && '人員不足'}
            {isSurplus && '人員余剰'}
            {isNormal && '正常'}
          </span>
        </div>

        {/* メモ */}
        {shift.notes && (
          <div className="mt-2">
            <p className="text-xs text-gray-600 italic">
              {shift.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
