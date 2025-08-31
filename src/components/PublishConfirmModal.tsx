import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { Shift, RequestType } from '@/lib/types';
import { ROLE_LABELS, ROUTES } from '@/lib/constants';
import { api, queryKeys } from '@/lib/api';
import { useToast } from './ToastProvider';

interface PublishConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: Shift;
  type: RequestType;
}

export function PublishConfirmModal({ isOpen, onClose, shift, type }: PublishConfirmModalProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isRecruiting = type === 'recruiting';
  const title = isRecruiting ? '人員募集を公開' : '派遣可能を公開';
  const message = isRecruiting ? 
    '他店舗に人員募集を公開しますか？' : 
    '他店舗に派遣可能として公開しますか？';

  // 公開処理ミューテーション
  const publishMutation = useMutation({
    mutationFn: async () => {
      const currentPublishings = await api.getPublishings();
      const publishings = currentPublishings.data || { recruitings: [], availables: [] };

      let newItemId = '';

      if (isRecruiting) {
        // 人員募集を追加
        const newRecruiting = {
          id: `r_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          storeId: shift.storeId,
          shiftId: shift.id,
          role: shift.role,
          start: shift.start,
          end: shift.end,
          date: shift.date, // シフトの実際の日付を使用
          open: true,
          createdAt: Date.now(),
          message: `${shift.start}-${shift.end}の${ROLE_LABELS[shift.role]}スタッフを募集しています`,
        };
        publishings.recruitings.push(newRecruiting);
        newItemId = newRecruiting.id;
      } else {
        // 派遣可能を追加
        const newAvailable = {
          id: `a_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          storeId: shift.storeId,
          workerId: shift.workerId || 'w1', // デモ用にデフォルト値
          shiftId: shift.id,
          role: shift.role,
          start: shift.start,
          end: shift.end,
          date: shift.date, // シフトの実際の日付を使用
          open: true,
          createdAt: Date.now(),
          message: `${shift.start}-${shift.end}の${ROLE_LABELS[shift.role]}で他店応援可能です`,
        };
        publishings.availables.push(newAvailable);
        newItemId = newAvailable.id;
      }

      const result = await api.updatePublishing(publishings);
      
      // デモデータを生成（公開処理の一部として同期的に実行）
      if (isRecruiting) {
        // 人員募集の場合、マッチする派遣可能人材を生成
        const demoResult = await api.generateDemoAvailablesForRecruiting(newItemId);
        console.log('デモデータ生成結果（派遣可能人材）:', demoResult);
        if (demoResult.success) {
          console.log('✅ 赤色ボタン用デモデータ生成成功:', demoResult.data);
        } else {
          console.warn('デモデータ生成に失敗:', demoResult.message);
        }
      } else {
        // 派遣可能の場合、マッチする募集を生成
        const demoResult = await api.generateDemoRecruitingsForAvailable(newItemId);
        console.log('デモデータ生成結果（募集）:', demoResult);
        if (demoResult.success) {
          console.log('✅ 青色ボタン用デモデータ生成成功:', demoResult.data);
        } else {
          console.warn('デモデータ生成に失敗:', demoResult.message);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      showToast('success', '公開完了', isRecruiting ? '人員募集を公開しました' : '派遣可能として公開しました');
      // データを再取得してからページ遷移
      queryClient.invalidateQueries({ queryKey: queryKeys.publishings });
      onClose();
      
      // 少し遅延してからページ遷移（データ更新を確実にするため）
      setTimeout(() => {
        console.log('📱 /inboxページに遷移します');
        navigate(ROUTES.INBOX);
      }, 500);
    },
    onError: (error) => {
      console.error('公開処理エラー:', error);
      showToast('error', 'エラー', '公開処理に失敗しました');
    },
  });

  const handleConfirm = () => {
    publishMutation.mutate();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* ヘッダー */}
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {title}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                    type="button"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* メッセージ */}
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-4">
                    {message}
                  </p>
                  
                  {/* シフト詳細 */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">
                        {shift.start} - {shift.end}
                      </p>
                      <p className="text-gray-600">
                        {ROLE_LABELS[shift.role]} / 1名
                      </p>
                      {shift.notes && (
                        <p className="text-gray-500 text-xs mt-1 italic">
                          {shift.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ボタン */}
                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled={publishMutation.isPending}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled={publishMutation.isPending}
                  >
                    {publishMutation.isPending ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        公開中...
                      </div>
                    ) : (
                      '公開する'
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
