export function LabelsUploadProgress({ current, total }) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="labels-upload-progress">
      <div className="progress-header">
        <span className="progress-title">Загрузка этикеток в хранилище</span>
        <span className="progress-count">
          {current} / {total}
        </span>
      </div>
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="progress-percentage">{percentage}%</div>
    </div>
  );
}
