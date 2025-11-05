import React from 'react';

export default function ActionButtons({ onEdit, onDelete }) {
  return (
    <div className="action-buttons">
      <button onClick={onEdit} className="btn btn-edit">Editar</button>
      <button onClick={onDelete} className="btn btn-delete">Excluir</button>
    </div>
  );
}
