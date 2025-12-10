import React, { useState } from 'react';
import FileDropzone from '../components/FileDropzone.jsx';
import { uploadVersion } from '../api/documents';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';

export default function DocumentVersionUpload() {
  const { accessToken } = useAuth();
  const { companyId, establishmentId, documentId } = useParams();
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [description, setDescription] = useState(''); // 👈 NOVO
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!file) {
      setError('Select a file.');
      return;
    }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      if (description.trim()) {
        fd.append('changeDescription', description.trim());
      }
      await uploadVersion(
        companyId,
        establishmentId,
        documentId,
        fd,
        accessToken
      );
      navigate(
        `/companies/${companyId}/establishments/${establishmentId}/documents/${documentId}`
      );
    } catch {
      setError('Failed to upload version.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container">
      <h2>Upload Document Version</h2>
      {error && <div className="error-message">{error}</div>}
      <form className="form" onSubmit={submit}>
        <FileDropzone onFile={setFile} />
        {file && (
          <div style={{ marginTop: 8 }}>
            Selected: <strong>{file.name}</strong> ({file.size} bytes)
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <label>
            Version description (what changed?)
            <textarea
              rows={3}
              placeholder="Explique brevemente o que mudou nesta versão em relação à anterior..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="submit" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
