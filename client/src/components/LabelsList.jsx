export function LabelsList({ labels, error }) {
  if (error) {
    return <div className="labels-error">Ошибка: {error}</div>;
  }

  if (!labels || labels.length === 0) {
    return null;
  }

  return (
    <div className="labels-list">
      <div className="labels-list-header">Этикетки ({labels.length})</div>
      <div className="labels-grid">
        {labels.map((label) => (
          <div key={label.postingNumber} className="label-item">
            {label.success ? (
              <div className="label-link">
                📄 {label.postingNumber}
              </div>
            ) : (
              <div className="label-error-item">
                ❌ {label.postingNumber}
                <span className="label-error-message">{label.error}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
