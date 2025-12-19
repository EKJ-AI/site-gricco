import React from 'react';
import ModalBase from './ModalBase';

export default function ConfirmModal({
  open,
  title = 'Confirmar ação',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  onConfirm,
  onCancel,
  zIndex = 2000,
  maxWidth = 520,
}) {
  return (
    <ModalBase
      open={open}
      title={title}
      onClose={onCancel}
      loading={loading}
      zIndex={zIndex}
      maxWidth={maxWidth}
      maxHeight="auto"
    >
      <div style={{ fontSize: 13, color: '#444' }}>{message}</div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
        <button type="button" className="secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </button>
        <button type="button" onClick={onConfirm} disabled={loading}>
          {loading ? 'Processando…' : confirmLabel}
        </button>
      </div>
    </ModalBase>
  );
}
