import React from 'react';

export default function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil((total || 0) / (pageSize || 1)));
  const canPrev = page > 1;
  const canNext = page < pages;

  const handlePrev = (e) => {
    e.preventDefault();
    if (!canPrev) return;
    onChange(page - 1);
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (!canNext) return;
    onChange(page + 1);
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        marginTop: 16,
      }}
    >
      <button
        type="button"          // 👈 evita submit de formulário
        disabled={!canPrev}
        onClick={handlePrev}
      >
        Prev
      </button>
      <span>
        Page {page} / {pages}
      </span>
      <button
        type="button"          // 👈 idem aqui
        disabled={!canNext}
        onClick={handleNext}
      >
        Next
      </button>
    </div>
  );
}
