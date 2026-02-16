export function LabelsButtons({ labels, postings }) {
  if (!labels || labels.length === 0) {
    return null;
  }

  // Создаем Map для быстрого поиска
  const labelsMap = new Map();
  labels.forEach((label) => {
    labelsMap.set(label.postingNumber, label);
  });

  return (
    <div className="labels-buttons-section">
      <h3 className="labels-buttons-title">Этикетки для печати</h3>
      <div className="labels-buttons-grid">
        {postings.map((posting) => {
          const label = labelsMap.get(posting.postingNumber);

          return (
            <div key={posting.postingNumber} className="label-button-card">
              <div className="label-button-info">
                <span className="label-button-number">{posting.postingNumber}</span>
                {posting.warehouse && (
                  <span className="label-button-warehouse">{posting.warehouse}</span>
                )}
              </div>
              {label && label.success ? (
                <a
                  href={label.labelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="label-button"
                >
                  📄 Открыть этикетку
                </a>
              ) : (
                <button className="label-button disabled" disabled>
                  ❌ Не удалось загрузить
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
