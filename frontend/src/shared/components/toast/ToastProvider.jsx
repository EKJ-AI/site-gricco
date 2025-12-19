import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

/**
 * Toast API:
 * toast.success(message, opts?)
 * toast.error(message, opts?)
 * toast.warning(message, opts?)
 * toast.info(message, opts?)
 *
 * opts:
 *  - title?: string
 *  - duration?: number (ms) default 4500
 *  - actionLabel?: string
 *  - onAction?: () => void
 */
const ToastContext = createContext(null);

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** tenta extrair msg de erro comum (axios / backend) */
export function extractErrorMessage(err, fallback = 'Ocorreu um erro.') {
  if (!err) return fallback;

  // axios: err.response?.data
  const data = err?.response?.data;

  // padrões comuns: { message }, { error }, { errors: [...] }
  const msg =
    data?.message ||
    data?.error ||
    (Array.isArray(data?.errors) && data.errors.map((e) => e?.message || e?.msg || e).filter(Boolean).join(', ')) ||
    err?.message;

  return normalizeText(msg || fallback);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    // inicia animação de saída
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));

    // remove após animação
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      const tm = timersRef.current.get(id);
      if (tm) {
        clearTimeout(tm);
        timersRef.current.delete(id);
      }
    }, 200);
  }, []);

  const show = useCallback(
    (type, message, opts = {}) => {
      const id = uid();
      const duration = typeof opts.duration === 'number' ? opts.duration : 4500;

      const toast = {
        id,
        type,
        title: opts.title || (type === 'success'
          ? 'Tudo certo'
          : type === 'error'
            ? 'Atenção'
            : type === 'warning'
              ? 'Verifique'
              : 'Info'),
        message: normalizeText(message),
        duration,
        actionLabel: opts.actionLabel,
        onAction: typeof opts.onAction === 'function' ? opts.onAction : null,
        leaving: false,
      };

      setToasts((prev) => [toast, ...prev].slice(0, 5));

      // auto close
      const tm = window.setTimeout(() => removeToast(id), duration);
      timersRef.current.set(id, tm);

      return id;
    },
    [removeToast],
  );

  const api = useMemo(
    () => ({
      show,
      success: (message, opts) => show('success', message, opts),
      error: (message, opts) => show('error', message, opts),
      warning: (message, opts) => show('warning', message, opts),
      info: (message, opts) => show('info', message, opts),
      dismiss: (id) => removeToast(id),
      dismissAll: () => setToasts([]),
    }),
    [show, removeToast],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>.');
  }
  return ctx;
}

function ToastViewport({ toasts, onClose }) {
  return (
    <div className="pf-toast-viewport" aria-live="polite" aria-relevant="additions removals">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            'pf-toast',
            `is-${t.type}`,
            'is-enter',
            t.leaving ? 'is-leave' : '',
          ].join(' ')}
          role="status"
        >
          <div className="pf-toast-accent" />
          <div>
            <p className="pf-toast-title">{t.title}</p>
            {t.message ? <p className="pf-toast-message">{t.message}</p> : null}
          </div>

          <div className="pf-toast-actions">
            {t.actionLabel && t.onAction ? (
              <button
                type="button"
                className="pf-toast-btn"
                onClick={() => {
                  try { t.onAction?.(); } finally { onClose(t.id); }
                }}
              >
                {t.actionLabel}
              </button>
            ) : null}

            <button
              type="button"
              className="pf-toast-close"
              onClick={() => onClose(t.id)}
              aria-label="Fechar"
              title="Fechar"
            >
              ×
            </button>
          </div>

          {typeof t.duration === 'number' && t.duration > 0 ? (
            <div className="pf-toast-progress" aria-hidden="true">
              <span style={{ animationDuration: `${t.duration}ms` }} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
