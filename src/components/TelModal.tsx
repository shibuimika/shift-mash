import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PhoneIcon } from '@heroicons/react/24/outline';

interface TelModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  storeName: string;
}

export function TelModal({ isOpen, onClose, phoneNumber, storeName }: TelModalProps) {
  const handleCall = () => {
    window.location.href = `tel:${phoneNumber}`;
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
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    連絡先
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                    type="button"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="text-center py-4">
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">承認が完了しました</p>
                    <p className="text-lg font-medium text-gray-900">{storeName}</p>
                  </div>
                  
                  <div className="bg-red-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-center mb-2">
                      <PhoneIcon className="w-6 h-6 text-red-600" />
                    </div>
                    <p className="text-2xl font-mono font-semibold text-red-900">
                      {phoneNumber}
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      閉じる
                    </button>
                    <button
                      onClick={handleCall}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-sm"
                    >
                      <PhoneIcon className="w-4 h-4 inline-block mr-1" />
                      発信する
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
