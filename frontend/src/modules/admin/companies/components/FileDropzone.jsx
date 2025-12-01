// src/modules/companies/components/FileDropzone.jsx
import React, { useRef, useState } from 'react';

export default function FileDropzone({
  onFile,
  accept,
  multiple = false,
  disabled = false,
  label = 'Drop a file here or click to select',
}) {
  const ref = useRef(null);
  const [hover, setHover] = useState(false);

  const handleFiles = (fileList) => {
    if (!fileList || !fileList.length) return;

    const f = multiple ? Array.from(fileList) : fileList[0];
    onFile?.(f);

    // permite selecionar o mesmo arquivo novamente se precisar
    if (ref.current) {
      ref.current.value = '';
    }
  };

  const handleClick = (e) => {
    if (disabled) return;
    e.stopPropagation();
    ref.current?.click();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setHover(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setHover(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setHover(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e) => {
    e.stopPropagation();
    if (disabled) return;
    handleFiles(e.target.files);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      style={{
        border: '2px dashed #aaa',
        padding: 16,
        textAlign: 'center',
        background: hover ? '#f5f5f5' : 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        ref={ref}
        type="file"
        style={{ display: 'none' }}
        onChange={handleChange}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
      />
      <div>{label}</div>
    </div>
  );
}
