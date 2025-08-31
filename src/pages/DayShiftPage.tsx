import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import { PublishConfirmModal } from '@/components/PublishConfirmModal';
import { AddSupportStaffModal } from '@/components/AddSupportStaffModal';
// import { useToast } from '@/components/ToastProvider';
import type { Shift, Worker, RequestType } from '@/lib/types';
import { formatDate, timeToMinutes } from '@/lib/utils';
import { ROLE_LABELS } from '@/lib/constants';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function DayShiftPage() {
  // const { showToast } = useToast();
  const [confirmModalData, setConfirmModalData] = useState<{ shift: Shift; type: RequestType } | null>(null);
  const [showAddSupportStaffModal, setShowAddSupportStaffModal] = useState(false);
  const [supportStaffs, setSupportStaffs] = useState<Array<{ id: string; name: string; start: string; end: string }>>([]);
  const [isMobile, setIsMobile] = useState(false);
  
  // スクロール同期用のref
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  // レスポンシブ判定
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    handleResize(); // 初期値設定
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // 今日の日付（デモ用にシフトデータがある日付を使用）
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

  // タイムライン設定の計算
  const timelineConfig = useMemo(() => {
    const cellWidth = isMobile ? 100 : 150; // セル幅を増加（ボタンが収まるように）
    
    if (shifts.length === 0) {
      const startHour = 9;
      const endHour = 18;
      const hourCount = endHour - startHour;
      return {
        startTime: '09:00',
        endTime: '18:00',
        startMinutes: 540,
        endMinutes: 1080,
        totalMinutes: 540,
        totalWidth: hourCount * cellWidth,
        cellWidth,
        hourCount,
        startHour,
        endHour,
      };
    }
    
    const startTimes = shifts.map(s => timeToMinutes(s.start));
    const endTimes = shifts.map(s => timeToMinutes(s.end));
    
    const minStartHour = Math.floor(Math.min(...startTimes) / 60); // 時間単位で切り下げ
    const maxEndHour = Math.ceil(Math.max(...endTimes) / 60); // 時間単位で切り上げ
    
    const minStart = minStartHour * 60;
    const maxEnd = maxEndHour * 60;
    const totalMinutes = maxEnd - minStart;
    const hourCount = maxEndHour - minStartHour;
    
    const calculatedConfig = {
      startTime: `${minStartHour.toString().padStart(2, '0')}:00`,
      endTime: `${maxEndHour.toString().padStart(2, '0')}:00`,
      startMinutes: minStart,
      endMinutes: maxEnd,
      totalMinutes,
      totalWidth: hourCount * cellWidth,
      cellWidth,
      hourCount,
      startHour: minStartHour,
      endHour: maxEndHour,
    };
    

    
    return calculatedConfig;
  }, [shifts, isMobile]);

  // 役割別でグループ化し、各役割内でスタッフ別に整理
  const shiftsByRoleAndStaff = useMemo(() => {
    const result: Record<string, Record<string, Shift[]>> = {};
    
    // 自店舗のスタッフのみ取得
    const currentStoreWorkers = workers.filter(w => w.storeId === currentStoreId);
    
    // 役割ごとにスタッフを分類（応援スタッフを追加）
    const roles = ['hall', 'kitchen', 'support'];
    
    roles.forEach(role => {
      result[role] = {};
      
      if (role === 'support') {
        // 応援スタッフ枠（他店からの応援者）
        const supportShifts = shifts.filter(s => s.supportWorkerId);
        if (supportShifts.length > 0) {
          // 応援者ごとにグループ化
          supportShifts.forEach(shift => {
            const supportWorkerId = shift.supportWorkerId!;
            const supportWorker = workers.find(w => w.id === supportWorkerId);
            if (supportWorker) {
              if (!result[role][supportWorkerId]) {
                result[role][supportWorkerId] = [];
              }
              result[role][supportWorkerId].push(shift);
            }
          });
        }
        
        // 追加された応援スタッフを含める
        supportStaffs.forEach(staff => {
          const mockShift: Shift = {
            id: `support-${staff.id}`,
            storeId: currentStoreId,
            workerId: `support-${staff.id}`,
            role: 'support',
            start: staff.start,
            end: staff.end,
            status: 'normal',
            date: today,
            supportWorkerId: `support-${staff.id}`,
            notes: `応援スタッフ: ${staff.name}`,
          };
          
          if (!result[role][`support-${staff.id}`]) {
            result[role][`support-${staff.id}`] = [];
          }
          result[role][`support-${staff.id}`].push(mockShift);
        });
        
        // 応援スタッフがいない場合でも空の枠を表示
        if (Object.keys(result[role]).length === 0) {
          result[role]['empty'] = [];
        }
      } else {
        // 通常の役割のスタッフを取得
        const roleWorkers = currentStoreWorkers.filter(w => w.roles.includes(role));
        
        roleWorkers.forEach(worker => {
          // そのスタッフのシフトを取得（応援勤務は除く）
          const workerShifts = shifts.filter(s => 
            s.role === role && (s.workerId === worker.id || s.workerId === null) && !s.supportWorkerId
          );
          
          if (workerShifts.length > 0) {
            result[role][worker.id] = workerShifts;
          }
        });
      }
    });
    
    return result;
  }, [shifts, workers, currentStoreId, supportStaffs, today]);

  const handleRequestSupport = (shift: Shift) => {
    setConfirmModalData({
      shift,
      type: 'recruiting',
    });
  };

  const handleOfferDispatch = (shift: Shift) => {
    setConfirmModalData({
      shift,
      type: 'dispatch',
    });
  };

  const closeModal = () => {
    setConfirmModalData(null);
  };

  const handleAddSupportStaff = (staffData: { name: string; startTime: string; endTime: string }) => {
    const newStaff = {
      id: `staff-${Date.now()}`,
      name: staffData.name,
      start: staffData.startTime,
      end: staffData.endTime,
    };
    
    setSupportStaffs(prev => [...prev, newStaff]);
    setShowAddSupportStaffModal(false);
  };

  // スクロール同期関数
  const syncScroll = (source: 'header' | 'body', scrollLeft: number) => {
    if (source === 'header' && bodyScrollRef.current) {
      bodyScrollRef.current.scrollLeft = scrollLeft;
    } else if (source === 'body' && headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollLeft;
    }
  };

  // シフトバーの位置とサイズを計算
  const getShiftBarStyle = (shift: Shift) => {
    const startMinutes = timeToMinutes(shift.start);
    const endMinutes = timeToMinutes(shift.end);
    const duration = endMinutes - startMinutes;
    
    // 時間軸上での位置を計算（時間単位で正確に）
    const startHourFloat = startMinutes / 60; // 開始時刻（小数点含む）
    const durationHours = duration / 60; // 期間（小数点含む）
    const offsetFromStart = startHourFloat - timelineConfig.startHour; // 開始時刻からのオフセット
    
    const left = offsetFromStart * timelineConfig.cellWidth;
    const width = durationHours * timelineConfig.cellWidth;
    
    return {
      left: `${left}px`,
      width: `${width}px`,
    };
  };

  // 時間軸の時刻表示を生成
  const generateTimeMarkers = () => {
    const markers = [];
    const { startHour, endHour, cellWidth } = timelineConfig;
    
    // startHourからendHourまでの時刻を表示（endHourも含む）
    for (let hour = startHour; hour <= endHour; hour++) {
      const hourIndex = hour - startHour;
      const leftPx = hourIndex * cellWidth;
      
      markers.push(
        <div
          key={hour}
          className="absolute h-full border-l border-gray-200 flex items-start justify-center"
          style={{ left: `${leftPx}px`, width: `${cellWidth}px` }}
        >
          <span className="text-xs font-medium text-gray-600 bg-white px-1 mt-1">
            {hour.toString().padStart(2, '0')}:00
          </span>
        </div>
      );
    }
    return markers;
  };

  // 縦グリッド線を生成
  const generateVerticalGridLines = () => {
    const { hourCount, cellWidth } = timelineConfig;
    return Array.from({ length: hourCount + 1 }, (_, i) => (
      <div
        key={i}
        className="absolute top-0 h-full border-l border-gray-200"
        style={{ left: `${i * cellWidth}px` }}
      />
    ));
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
        className={`absolute border-2 rounded cursor-pointer transition-all hover:shadow-md z-10 ${getBarColor()}`}
        style={{
          ...style,
          top: '32px', // ボタンスペースを確保
          height: '32px', // バー自体は狭く
          padding: '2px 6px',
        }}
      >
        {/* 上部ボタン（行内に配置） */}
        {(isShortage || isSurplus) && (
          <div className="absolute -top-7 left-0 right-0 flex justify-center">
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

        {/* 時間表示 */}
        <div className="text-xs font-medium text-center leading-tight">
          {shift.start}-{shift.end}
        </div>
        
        {/* 応援勤務インジケーター */}
        {shift.supportWorkerId && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
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
    <div className="space-y-4 md:space-y-6 w-full" style={{ maxWidth: 'none' }}>
      {/* ヘッダー */}
      <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
          {currentStore?.name || '店舗'} - {formatDate(new Date().toISOString().split('T')[0])}
        </h3>
        <p className="text-sm text-gray-600">
          タイムライン表示 ({timelineConfig.startTime} - {timelineConfig.endTime})
        </p>
      </div>

      {/* ガントチャート */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-20 md:mb-6" style={{ overflowX: 'visible' }}>
        {/* ヘッダー行（時間軸） */}
        <div className="border-b border-gray-200 flex">
          {/* 左固定ヘッダー */}
          <div className="bg-gray-50 border-r border-gray-200 sticky left-0 z-20 flex">
            <div className="w-12 md:w-16 bg-blue-50 border-r border-blue-200 p-1 md:p-2 flex items-center justify-center">
              <span className="text-xs font-medium text-blue-700 text-center">役割</span>
            </div>
            <div className="w-28 md:w-44 p-1 md:p-2 flex items-center">
              <span className="text-xs font-medium text-gray-700">スタッフ名</span>
            </div>
          </div>
          
          {/* 右側時間軸ヘッダー */}
          <div className="flex-1 bg-gray-50 overflow-hidden">
            <div 
              className="relative h-12 overflow-x-auto scrollbar-hide" 
              ref={headerScrollRef}
              onScroll={(e) => {
                const target = e.target as HTMLElement;
                syncScroll('header', target.scrollLeft);
              }}
            >
              <div
                className="relative h-full"
                style={{ 
                  width: `${timelineConfig.totalWidth}px !important`,
                  minWidth: `${timelineConfig.totalWidth}px !important`,
                  maxWidth: 'none'
                }}
              >
                {/* 時間目盛り */}
                {generateTimeMarkers()}
              </div>
            </div>
          </div>
        </div>

        {/* スタッフ行 */}
        <div className="flex">
          {/* 左固定カラム */}
          <div className="bg-white border-r border-gray-200 sticky left-0 z-10 flex flex-col">
            {Object.entries(shiftsByRoleAndStaff).map(([role, staffShifts]) => {
              const staffEntries = Object.entries(staffShifts);
              let roleHeaderShown = false;
              
              return staffEntries.map(([workerId]) => {
                let worker = workers.find(w => w.id === workerId);
                const isFirstInRole = !roleHeaderShown;
                if (isFirstInRole) roleHeaderShown = true;
                
                // 応援スタッフの場合の処理
                let displayName = '未配属';
                let bgColor = 'bg-blue-50';
                let borderColor = 'border-blue-200';
                let textColor = 'text-blue-700';
                
                if (role === 'support') {
                  bgColor = 'bg-green-50';
                  borderColor = 'border-green-200';
                  textColor = 'text-green-700';
                  
                  if (workerId === 'empty') {
                    displayName = '応援待ち';
                  } else if (workerId.startsWith('support-')) {
                    // 追加された応援スタッフ
                    const staff = supportStaffs.find(s => `support-${s.id}` === workerId);
                    displayName = staff ? `${staff.name} (応援)` : '応援スタッフ';
                  } else if (worker) {
                    displayName = `${worker.name} (${stores.find(s => s.id === worker.storeId)?.name || '他店'})`;
                  }
                } else {
                  displayName = worker?.name || '未配属';
                }
                
                return (
                  <div key={`${role}-${workerId}`} className="h-20 flex relative">
                    {/* 役割ラベル（最初のスタッフのみ） */}
                    {isFirstInRole && (
                      <div className={`w-12 md:w-16 ${bgColor} border-r ${borderColor} p-1 flex items-center justify-center`}>
                        <span className={`text-xs font-medium ${textColor} text-center leading-tight`}>
                          {ROLE_LABELS[role] || role}
                        </span>
                      </div>
                    )}
                    {!isFirstInRole && (
                      <div className="w-12 md:w-16 border-r border-gray-100"></div>
                    )}
                    
                    {/* スタッフ名 */}
                    <div className="w-28 md:w-44 p-1 md:p-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-800 truncate">
                        {displayName}
                      </span>
                      {/* 応援待ちの場合は「＋」ボタンを表示 */}
                      {role === 'support' && workerId === 'empty' && (
                        <button
                          onClick={() => setShowAddSupportStaffModal(true)}
                          className="ml-2 w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-colors text-xs font-bold"
                          title="応援スタッフを追加"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    {/* 下端の境界線 */}
                    <div 
                      className="absolute bg-gray-100"
                      style={{
                        bottom: '0px',
                        left: '0px',
                        width: '100%',
                        height: '1px',
                      }}
                    ></div>
                  </div>
                );
              });
            })}
          </div>

          {/* 右側タイムライン */}
          <div 
            className="flex-1 overflow-x-auto scrollbar-hide"
            ref={bodyScrollRef}
            onScroll={(e) => {
              const target = e.target as HTMLElement;
              syncScroll('body', target.scrollLeft);
            }}
          >
            <div 
              className="relative"
              style={{ 
                width: `${timelineConfig.totalWidth}px !important`,
                minWidth: `${timelineConfig.totalWidth}px !important`,
                maxWidth: 'none',
                height: `${Object.values(shiftsByRoleAndStaff).reduce(
                  (total, staffShifts) => total + Object.keys(staffShifts).length, 
                  0
                ) * 80}px` // h-20 = 80px
              }}
            >
              {/* 縦グリッド線 */}
              <div className="absolute inset-0">
                {generateVerticalGridLines()}
              </div>

              {/* 横グリッド線（各行の境界線） */}
              {Array.from({ length: Object.values(shiftsByRoleAndStaff).reduce(
                (total, staffShifts) => total + Object.keys(staffShifts).length, 
                0
              ) }, (_, index) => (
                <div
                  key={`row-line-${index}`}
                  className="absolute bg-gray-100"
                  style={{
                    top: `${(index + 1) * 80 - 1}px`, // 各行の下端に境界線を配置
                    left: '0px',
                    width: `${timelineConfig.totalWidth}px`, // タイムラインの実際の幅を使用
                    height: '1px',
                  }}
                />
              ))}

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
                  let worker = workers.find(w => w.id === workerId);
                  const absoluteRowIndex = previousRowCount + staffIndex;
                  
                  return (
                    <div
                      key={`${role}-${workerId}-bar`}
                      className="absolute w-full"
                      style={{
                        top: `${absoluteRowIndex * 80}px`, // h-20 = 80px
                        height: '80px',
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

      {/* 公開確認モーダル */}
      {confirmModalData && (
        <PublishConfirmModal
          isOpen={true}
          onClose={closeModal}
          shift={confirmModalData.shift}
          type={confirmModalData.type}
        />
      )}

      {/* 応援スタッフ追加モーダル */}
      <AddSupportStaffModal
        isOpen={showAddSupportStaffModal}
        onClose={() => setShowAddSupportStaffModal(false)}
        onSubmit={handleAddSupportStaff}
      />
    </div>
  );
}
