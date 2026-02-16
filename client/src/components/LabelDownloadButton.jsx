import { useState } from "react";
import { downloadPackageLabel } from "../services/assemblyApiService";

export function LabelDownloadButton({ postingNumber }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    try {
      await downloadPackageLabel(postingNumber);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="label-download">
      <button
        className="label-download-button"
        onClick={handleDownload}
        disabled={isDownloading}
      >
        {isDownloading ? "Скачивание..." : "Этикетка"}
      </button>
      {error && <span className="label-download-error">{error}</span>}
    </div>
  );
}
