import React, { createContext, useContext, useState, useRef } from 'react';
import ConfirmModal from '../components/modals/ConfirmModal';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Delete',
    cancelText: 'Cancel'
  });
  
  const resolverRef = useRef(null);

  const confirm = ({ title, message, confirmText = 'Delete', cancelText = 'Cancel' }) => {
    setModalState({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText
    });
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const handleConfirm = () => {
    if (resolverRef.current) {
      resolverRef.current(true);
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    if (resolverRef.current) {
      resolverRef.current(false);
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmModal
        isOpen={modalState.isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
