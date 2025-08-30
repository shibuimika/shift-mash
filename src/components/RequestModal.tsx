import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ModalData } from '@/lib/types';
import { REQUEST_TYPE_LABELS, ROLE_LABELS, MESSAGES } from '@/lib/constants';
import { formatTravelTime, formatRating } from '@/lib/utils';
import { api, queryKeys } from '@/lib/api';
import { useToast } from './ToastProvider';

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalData: ModalData;
}

export function RequestModal({ isOpen, onClose, modalData }: RequestModalProps) {
  const { shift, type, candidates } = modalData;
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const title = REQUEST_TYPE_LABELS[type];
  const isRecruiting = type === 'recruiting';
  
  const handleCandidateToggle = (candidateId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  // リクエスト送信ミューテーション
  const createRequestMutation = useMutation({
    mutationFn: async () => {
      if (selectedCandidates.length === 0) return;
      
      // 送信先店舗の決定は省略（デモ用に簡略化）
      
      // 各店舗にリクエストを送信
      for (const candidateId of selectedCandidates) {
        await api.createRequest({
          from: shift.storeId,
          to: 's2', // デモ用に固定（本来は動的に決定）
          type,
          targetIds: [candidateId],
          shiftId: shift.id,
          message: type === 'recruiting' ? 
            `${shift.start}-${shift.end}の${shift.role}スタッフをお願いします` :
            `${shift.start}-${shift.end}の${shift.role}で応援可能です`,
        });
      }
    },
    onSuccess: () => {
      showToast('success', '送信完了', MESSAGES.REQUEST_SENT);
      queryClient.invalidateQueries({ queryKey: queryKeys.requests });
      setSelectedCandidates([]);
      onClose();
    },
    onError: () => {
      showToast('error', 'エラー', MESSAGES.UNKNOWN_ERROR);
    },
  });

  const handleSubmit = () => {
    createRequestMutation.mutate();
  };

  const renderNoCandidatesMessage = () => {
    const message = isRecruiting 
      ? MESSAGES.NO_CANDIDATES_RECRUITING 
      : MESSAGES.NO_CANDIDATES_DISPATCH;
    
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-lg mb-2">
          {isRecruiting ? '🔍' : '📢'}
        </div>
        <p className="text-gray-600 mb-4">{message}</p>
        <button
          onClick={onClose}
          className="btn-primary"
        >
          OK
        </button>
      </div>
    );
  };

  const renderCandidateList = () => (
    <div className="space-y-3 max-h-60 overflow-y-auto">
      {candidates.map((candidate) => (
        <div
          key={candidate.id}
          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
            selectedCandidates.includes(candidate.id)
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => handleCandidateToggle(candidate.id)}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                selectedCandidates.includes(candidate.id)
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300'
              }`}
            >
              {selectedCandidates.includes(candidate.id) && (
                <CheckIcon className="w-3 h-3 shrink-0 text-white" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  {candidate.type === 'worker' ? (
                    <>
                      <div className="flex items-center space-x-2">
                        {candidate.avatar && (
                          <img
                            src={candidate.avatar}
                            alt={candidate.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {candidate.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {candidate.storeName}
                          </p>
                        </div>
                      </div>
                      {candidate.rating && (
                        <p className="text-xs text-gray-500 mt-1">
                          {formatRating(candidate.rating)}
                        </p>
                      )}
                    </>
                  ) : (
                    <div>
                      <p className="font-medium text-gray-900">
                        {candidate.storeName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {ROLE_LABELS[candidate.role]} 募集中
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="text-right text-sm">
                  <p className="text-gray-900">
                    {candidate.start} - {candidate.end}
                  </p>
                  <p className="text-gray-500">
                    {formatTravelTime(candidate.distance.estimatedMinutes)}
                  </p>
                </div>
              </div>
              
              {candidate.message && (
                <p className="text-xs text-gray-600 mt-2 italic">
                  {candidate.message}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

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
              <Dialog.Panel className="modal-content">
                {/* ヘッダー */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="text-lg font-medium text-gray-900">
                      {title}
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-500"
                      type="button"
                    >
                      <XMarkIcon className="w-6 h-6 shrink-0" />
                    </button>
                  </div>
                  
                  {/* 対象条件 */}
                  <div className="mt-2 text-sm text-gray-600">
                    <p>
                      {shift.start} - {shift.end} / {ROLE_LABELS[shift.role]} / 1名
                    </p>
                    <p className="text-blue-600 mt-1">
                      {isRecruiting 
                        ? '地域内の他店舗から派遣可能なスタッフを探しています'
                        : '地域内の他店舗の人員不足を支援します'
                      }
                    </p>
                  </div>
                </div>

                {/* ボディ */}
                <div className="px-6 py-4">
                  {candidates.length === 0 
                    ? renderNoCandidatesMessage()
                    : renderCandidateList()
                  }
                </div>

                {/* フッター */}
                {candidates.length > 0 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex space-x-3">
                    <button
                      onClick={onClose}
                      className="btn-secondary flex-1"
                      disabled={createRequestMutation.isPending}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="btn-primary flex-1"
                      disabled={selectedCandidates.length === 0 || createRequestMutation.isPending}
                    >
                      {createRequestMutation.isPending ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          送信中...
                        </div>
                      ) : (
                        `リクエスト送信 (${selectedCandidates.length})`
                      )}
                    </button>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
