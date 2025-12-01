import React from 'react';

export default function ConfirmDialog({ open, title = 'Confirm', text, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h3>{title}</h3>
        <p>{text}</p>
        <div className="modal-actions">
          <button onClick={onCancel}>Cancel</button>
          <button className="danger" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}