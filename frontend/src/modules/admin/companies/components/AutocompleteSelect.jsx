// src/shared/components/AutocompleteSelect.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../styles/AutocompleteSelect.css';

export default function AutocompleteSelect({
  label,
  value,            // objeto selecionado ou string (id)
  onChange,         // (item | null) => void
  fetcher,          // async (query) => { items: [], total: number }
  getKey,           // (item) => string (id)
  getLabel,         // (item) => string (texto p/ exibição)
  placeholder = 'Type to search...',
  minChars = 2,
  disabled = false,
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const wrapRef = useRef(null);

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    try {
      return getLabel(value);
    } catch {
      return '';
    }
  }, [value, getLabel]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function doSearch(q) {
    if (!fetcher) return;
    setLoading(true);
    try {
      const res = await fetcher(q);
      setItems(res.items || []);
      setOpen(true);
    } catch (e) {
      setItems([]);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(e) {
    const v = e.target.value;
    setQuery(v);
    if ((v || '').trim().length >= minChars) {
      void doSearch(v.trim());
    } else {
      setItems([]);
      setOpen(false);
    }
  }

  function choose(item) {
    onChange?.(item || null);
    setOpen(false);
    setQuery('');
  }

  return (
    <div className="auto-wrap" ref={wrapRef}>
      {label && <label className="auto-label">{label}</label>}
      <div className="auto-selected">
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= minChars && setOpen(true)}
          disabled={disabled}
        />
        {selectedLabel && !query && (
          <div className="auto-pill">
            <span>{selectedLabel}</span>
            <button type="button" onClick={() => choose(null)} aria-label="clear">
              ×
            </button>
          </div>
        )}
      </div>

      {open && (
        <div className="auto-menu">
          {loading ? (
            <div className="auto-item">Loading…</div>
          ) : items.length === 0 ? (
            <div className="auto-item muted">No results</div>
          ) : (
            items.map((it) => (
              <div
                key={getKey(it)}
                className="auto-item"
                onClick={() => choose(it)}
                role="button"
                tabIndex={0}
              >
                {getLabel(it)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
