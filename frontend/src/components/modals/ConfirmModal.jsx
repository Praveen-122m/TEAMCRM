import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Trash2, X } from 'lucide-react';

export const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Delete?", 
  message = "This action cannot be undone. All related data will be permanently removed.",
  confirmText = "Delete",
  cancelText = "Cancel"
}) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-crm-card border border-crm-border p-6 text-center align-middle shadow-xl transition-all relative">
                {/* Close Button X in top right */}
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute top-4 right-4 text-crm-textMuted hover:text-crm-text transition-colors"
                >
                  <X size={18} />
                </button>

                {/* Centered Circle with Red Trash Icon */}
                <div className="flex justify-center mb-4 mt-2">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                    <Trash2 size={24} />
                  </div>
                </div>

                {/* Modal Title */}
                <Dialog.Title as="h3" className="text-lg font-bold text-crm-text mb-2">
                  {title}
                </Dialog.Title>

                {/* Modal Description */}
                <p className="text-xs text-crm-textMuted leading-relaxed px-2 mb-6">
                  {message}
                </p>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl bg-crm-darker/50 hover:bg-crm-border border border-crm-border text-xs font-semibold text-crm-textMuted hover:text-crm-text transition-all duration-200"
                  >
                    {cancelText}
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 hover:shadow-glow text-xs font-semibold text-white transition-all duration-200"
                  >
                    {confirmText}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ConfirmModal;
