import { useState } from "react";

export function ExportXlsxButton({ onDownload, label = "Скачать XLSX", title }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    setIsDownloading(true);
    setError(null);
    try {
      await onDownload();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="export-button-wrapper">
      <button
        className="export-button"
        onClick={handleExport}
        disabled={isDownloading}
        title={title}
      >
        {isDownloading ? "Скачивание..." : label}
      </button>
      {error && <span className="export-button-error">{error}</span>}
    </div>
  );
}
