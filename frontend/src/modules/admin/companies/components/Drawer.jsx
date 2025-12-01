// src/shared/components/Drawer.jsx
import React from 'react';

export default function Drawer({ open, title, onClose, children }) {
  return (
    <div className={`drawer ${open ? 'open' : ''}`}>
      <div className="drawer-header">
        <h3>{title}</h3>
        <button onClick={onClose}>×</button>
      </div>
      <div className="drawer-body">{children}</div>
    </div>
  );
}
