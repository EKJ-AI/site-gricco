import React from 'react';

export default function Toolbar({ title, q, onQ, children }) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <h2>{title}</h2>
      </div>
      <div className="toolbar-right">
        <input
          value={q}
          onChange={(e) => onQ?.(e.target.value)}
          placeholder="Search…"
        />
        {children}
      </div>
    </div>
  );
}