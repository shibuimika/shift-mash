import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import { RequestModal } from '@/components/RequestModal';
import { useToast } from '@/components/ToastProvider';
import { useCandidates } from '@/hooks/useCandidates';
import type { Shift, ModalData, Worker } from '@/lib/types';
import { formatDate, timeToMinutes } from '@/lib/utils';
import { ROLE_LABELS } from '@/lib/constants';

export default function DayShiftPage() {
  const { showToast } = useToast();
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // レスポンシブ判定
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    handleResize(); // 初期値設定
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // 今日の日付（デモ用に固定）
  const today = '2024-08-31';
  
  // 自店舗ID（デモ用に固定）
  const currentStoreId = 's1'; // 北浦和店
  
  // データ取得
  const { data: shiftsResponse, isLoading: shiftsLoading } = useQuery({
    queryKey: queryKeys.shifts(today),
    queryFn: () => api.getTodayShifts(today),
  });

  const { data: storesResponse } = useQuery({
    queryKey: queryKeys.stores,
    queryFn: () => api.getStores(),
  });

  const { data: workersResponse } = useQuery({
    queryKey: queryKeys.workers,
    queryFn: () => api.getWorkers(),
  });

  const allShifts = shiftsResponse?.data || [];
  const stores = storesResponse?.data || [];
  const workers = workersResponse?.data || [];

  // 自店舗のシフトのみ表示
  const shifts = allShifts.filter(shift => shift.storeId === currentStoreId);
  
  // 候補検索フック
  const { candidates: recruitingCandidates } = useCandidates(
    modalData?.type === 'recruiting' ? modalData.shift : null,
    'recruiting'
  );

  const { candidates: dispatchCandidates } = useCandidates(
    modalData?.type === 'dispatch' ? modalData.shift : null,
    'dispatch'
  );

  // タイムライン設定の計算
  const timelineConfig = useMemo(() => {
    if (shifts.length === 0) {
      const durationHours = 9;
      return {
        startTime: '09:00',
        endTime: '18:00',
        startMinutes: 540,
        endMinutes: 1080,
        totalMinutes: 540,
        totalWidth: isMobile ? durationHours * 56 : '100%',
        durationHours,
      };
    }
    
    const startTimes = shifts.map(s => timeToMinutes(s.start));
    const endTimes = shifts.map(s => timeToMinutes(s.end));
    
    const minStart = Math.min(...startTimes);
    const maxEnd = Math.max(...endTimes);
    
    // 余白なし、実際のmin-maxのみ
    const totalMinutes = maxEnd - minStart;
    const durationHours = totalMinutes / 60;
    
    return {
      startTime: `${Math.floor(minStart / 60).toString().padStart(2, '0')}:${(minStart % 60).toString().padStart(2, '0')}`,
      endTime: `${Math.floor(maxEnd / 60).toString().padStart(2, '0')}:${(maxEnd % 60).toString().padStart(2, '0')}`,
      startMinutes: minStart,
      endMinutes: maxEnd,
      totalMinutes,
      totalWidth: isMobile ? durationHours * 56 : '100%', // モバイル：56px/h、デスクトップ：等分
      durationHours,
    };
  }, [shifts, isMobile]);

  // 役割別でグループ化し、各役割内でスタッフ別に整理
  const shiftsByRoleAndStaff = useMemo(() => {
    const result: Record<string, Record<string, Shift[]>> = {};
    
    // 自店舗のスタッフのみ取得
    const currentStoreWorkers = workers.filter(w => w.storeId === currentStoreId);
    
    // 役割ごとにスタッフを分類
    const roles = ['hall', 'kitchen'];
    
    roles.forEach(role => {
      result[role] = {};
      
      // その役割のスタッフを取得
      const roleWorkers = currentStoreWorkers.filter(w => w.roles.includes(role));
      
      roleWorkers.forEach(worker => {
        // そのスタッフのシフトを取得
        const workerShifts = shifts.filter(s => 
          s.role === role && (s.workerId === worker.id || s.workerId === null)
        );
        
        if (workerShifts.length > 0) {
          result[role][worker.id] = workerShifts;
        }
      });
    });
    
    return result;
  }, [shifts, workers, currentStoreId]);

  const handleRequestSupport = async (shift: Shift) => {
    try {
      setModalData({
        shift,
        type: 'recruiting',
        candidates: [], // 初期は空、useCandidatesで更新される
      });
    } catch (error) {
      showToast('error', 'エラー', '候補の取得に失敗しました');
    }
  };

  const handleOfferDispatch = async (shift: Shift) => {
    try {
      setModalData({
        shift,
        type: 'dispatch',
        candidates: [], // 初期は空、useCandidatesで更新される
      });
    } catch (error) {
      showToast('error', 'エラー', '募集の取得に失敗しました');
    }
  };

  const closeModal = () => {
    setModalData(null);
  };

  // シフトバーの位置とサイズを計算
  const getShiftBarStyle = (shift: Shift) => {
    const startMinutes = timeToMinutes(shift.start);
    const endMinutes = timeToMinutes(shift.end);
    const duration = endMinutes - startMinutes;
    
    if (isMobile) {
      // モバイル：ピクセル指定（56px/h）
      const left = ((startMinutes - timelineConfig.startMinutes) / 60) * 56;
      const width = (duration / 60) * 56;
      return {
        left: `${left}px`,
        width: `${width}px`,
      };
    } else {
      // デスクトップ：パーセント指定（等分）
      const leftPercent = ((startMinutes - timelineConfig.startMinutes) / timelineConfig.totalMinutes) * 100;
      const widthPercent = (duration / timelineConfig.totalMinutes) * 100;
      return {
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
      };
    }
  };

  // 時間軸の時刻表示を生成（ヘッダー用）
  const generateTimeMarkers = (isHeader = false) => {
    const markers = [];
    const startHour = Math.floor(timelineConfig.startMinutes / 60);
    const endHour = Math.ceil(timelineConfig.endMinutes / 60);
    
    for (let hour = startHour; hour <= endHour; hour++) {
      const leftPercent = ((hour * 60 - timelineConfig.startMinutes) / timelineConfig.totalMinutes) * 100;
      const leftPx = isMobile ? ((hour * 60 - timelineConfig.startMinutes) / 60) * 56 : undefined;
      
      markers.push(
        <div
          key={hour}
          className="absolute top-0 h-full border-l border-gray-200"
          style={{ 
            left: isMobile ? `${leftPx}px` : `${leftPercent}%` 
          }}
        >
          {isHeader && (
            <div className="absolute -top-1 -left-3 text-xs text-gray-500 font-medium bg-white px-1">
              {hour}
            </div>
          )}
        </div>
      );
    }
    return markers;
  };

  // ガントチャート用シフトバーコンポーネント
  const GanttShiftBar = ({ shift }: { shift: Shift; worker?: Worker }) => {
    const style = getShiftBarStyle(shift);
    const isShortage = shift.status === 'shortage';
    const isSurplus = shift.status === 'surplus';

    const getBarColor = () => {
      if (isShortage) return 'bg-red-100 border-red-300 text-red-800';
      if (isSurplus) return 'bg-blue-100 border-blue-300 text-blue-800';
      return 'bg-gray-100 border-gray-300 text-gray-800';
    };

    return (
      <div
        className={`absolute h-10 border-2 rounded p-1 cursor-pointer transition-all hover:shadow-md ${getBarColor()}`}
        style={{
          ...style,
          top: '8px', // 行の中央に配置
        }}
      >
        {/* 上部ボタン */}
        {(isShortage || isSurplus) && (
          <div className="absolute -top-3 left-2 right-2 flex justify-center">
            {isShortage && (
              <button
                onClick={() => handleRequestSupport(shift)}
                className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-0.5 rounded shadow-sm transition-colors whitespace-nowrap"
              >
                人員募集
              </button>
            )}
                               {isSurplus && (
                     <button
                       onClick={() => handleOfferDispatch(shift)}
                       className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-0.5 rounded shadow-sm transition-colors whitespace-nowrap"
                     >
                       他店に派遣
                     </button>
                   )}
          </div>
        )}

        {/* 時間のみ表示 */}
        <div className="text-xs font-medium text-center">
          {shift.start}-{shift.end}
        </div>
        
        {/* 応援勤務インジケーター */}
        {shift.supportWorkerId && (
          <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full"></div>
        )}
      </div>
    );
  };

  if (shiftsLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">読み込み中...</span>
      </div>
    );
  }

  const currentStore = stores.find(store => store.id === currentStoreId);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          {currentStore?.name || '店舗'} - {formatDate(today)}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          タイムライン表示 ({timelineConfig.startTime} - {timelineConfig.endTime})
        </p>
      </div>

      {/* ガントチャート */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* ヘッダー行（時間軸） */}
        <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[200px_1fr] border-b border-gray-200">
          {/* 左固定ヘッダー */}
          <div className="bg-gray-50 border-r border-gray-200 p-2">
            <div className="text-xs sm:text-sm font-medium text-gray-700">役割 / スタッフ名</div>
          </div>
          
          {/* 右側時間軸ヘッダー */}
          <div className="bg-gray-50 overflow-x-auto">
            <div 
              className="relative h-10"
              style={{ 
                width: isMobile ? `${timelineConfig.totalWidth}px` : '100%',
                minWidth: isMobile ? `${timelineConfig.totalWidth}px` : 'auto'
              }}
            >
              {/* 時間目盛り（ヘッダーのみ） */}
              {generateTimeMarkers(true)}
            </div>
          </div>
        </div>

        {/* スタッフ行 */}
        <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[200px_1fr]">
          {/* 左固定カラム */}
          <div className="bg-white border-r border-gray-200 sticky left-0 z-10">
            {Object.entries(shiftsByRoleAndStaff).map(([role, staffShifts]) => {
              const staffEntries = Object.entries(staffShifts);
              let roleHeaderShown = false;
              
              return staffEntries.map(([workerId]) => {
                const worker = workers.find(w => w.id === workerId);
                const isFirstInRole = !roleHeaderShown;
                if (isFirstInRole) roleHeaderShown = true;
                
                return (
                  <div key={`${role}-${workerId}`} className="h-14 border-b border-gray-100 flex">
                    {/* 役割ラベル（最初のスタッフのみ） */}
                    {isFirstInRole && (
                      <div className="w-12 sm:w-16 bg-blue-50 border-r border-blue-200 p-1 sm:p-2 flex items-center justify-center">
                        <span className="text-xs font-medium text-blue-700 text-center">
                          {ROLE_LABELS[role] || role}
                        </span>
                      </div>
                    )}
                    {!isFirstInRole && (
                      <div className="w-12 sm:w-16 border-r border-gray-100"></div>
                    )}
                    
                    {/* スタッフ名 */}
                    <div className="flex-1 p-1 sm:p-2 flex items-center">
                      <span className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                        {worker?.name || '未配属'}
                      </span>
                    </div>
                  </div>
                );
              });
            })}
          </div>

          {/* 右側タイムライン */}
          <div className="overflow-x-auto">
            <div 
              className="relative"
              style={{ 
                width: isMobile ? `${timelineConfig.totalWidth}px` : '100%',
                minWidth: isMobile ? `${timelineConfig.totalWidth}px` : 'auto',
                minHeight: `${Object.values(shiftsByRoleAndStaff).reduce(
                  (total, staffShifts) => total + Object.keys(staffShifts).length, 
                  0
                ) * 56}px` // h-14 = 56px
              }}
            >
              {/* 縦グリッド線（時刻ラベルなし） */}
              {generateTimeMarkers(false)}

              {/* シフトバー */}
              {Object.entries(shiftsByRoleAndStaff).map(([role, staffShifts], roleIndex) => {
                const staffEntries = Object.entries(staffShifts);
                
                // 前の役割の行数を計算
                const previousRoles = Object.entries(shiftsByRoleAndStaff).slice(0, roleIndex);
                const previousRowCount = previousRoles.reduce(
                  (total, [, prevStaffShifts]) => total + Object.keys(prevStaffShifts).length,
                  0
                );
                
                return staffEntries.map(([workerId, workerShifts], staffIndex) => {
                  const worker = workers.find(w => w.id === workerId);
                  const absoluteRowIndex = previousRowCount + staffIndex;
                  
                  return (
                    <div
                      key={`${role}-${workerId}-bar`}
                      className="absolute w-full border-b border-gray-100"
                      style={{
                        top: `${absoluteRowIndex * 56}px`, // h-14 = 56px
                        height: '56px',
                      }}
                    >
                      {/* シフトバー */}
                      {workerShifts.map((shift) => (
                        <GanttShiftBar
                          key={shift.id}
                          shift={shift}
                          worker={worker}
                        />
                      ))}
                    </div>
                  );
                });
              })}
            </div>
          </div>
        </div>
      </div>

      {/* シフトが存在しない場合 */}
      {shifts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">📅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            シフトがありません
          </h3>
          <p className="text-gray-600">
            {formatDate(today)}のシフトは登録されていません
          </p>
        </div>
      )}

      {/* 凡例 */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">凡例</h4>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded mr-2"></div>
            <span>人員不足</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded mr-2"></div>
            <span>人員余剰</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded mr-2"></div>
            <span>正常</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span>他店応援あり</span>
          </div>
        </div>
      </div>

      {/* リクエストモーダル */}
      {modalData && (
        <RequestModal
          isOpen={true}
          onClose={closeModal}
          modalData={{
            ...modalData,
            candidates: modalData.type === 'recruiting' ? recruitingCandidates : dispatchCandidates,
          }}
        />
      )}
    </div>
  );
}
