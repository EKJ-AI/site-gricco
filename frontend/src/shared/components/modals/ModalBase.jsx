import React, { useEffect } from 'react';

export default function ModalBase({
  open,
  title,
  children,
  footer,
  onClose,
  loading = false,
  zIndex = 2000,
  maxWidth = 900,
  maxHeight = '80vh',
  showCloseButton = true,
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex,
      }}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // fecha clicando no overlay (fora do conteúdo)
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: 16,
          width: '92%',
          maxWidth,
          maxHeight,
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              marginBottom: 8,
            }}
          >
            <h3 style={{ margin: 0 }}>{title || ''}</h3>

            {showCloseButton && (
              <button
                type="button"
                className="secondary"
                onClick={onClose}
                disabled={loading}
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>

        {footer && <div style={{ marginTop: 12 }}>{footer}</div>}
      </div>
    </div>
  );
}
