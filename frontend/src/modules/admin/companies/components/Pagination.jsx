import React from 'react';

export default function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil((total || 0) / (pageSize || 1)));
  const canPrev = page > 1;
  const canNext = page < pages;

  return (
    <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:16 }}>
      <button disabled={!canPrev} onClick={() => onChange(page - 1)}>Prev</button>
      <span>Page {page} / {pages}</span>
      <button disabled={!canNext} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
}
