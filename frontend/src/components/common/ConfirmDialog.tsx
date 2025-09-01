import React from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="mb-4">{message}</p>
        <div className="flex justify-end space-x-4">
          <button onClick={onCancel} className="bg-gray-300 px-4 py-2 rounded">{cancelText}</button>
          <button onClick={onConfirm} className="bg-red-500 text-white px-4 py-2 rounded">{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;