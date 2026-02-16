import { useState } from "react";
import { formatGroupDate } from "../utils/formatters";
import { uploadLabelsToS3 } from "../services/assemblyApiService";

export function ShipmentSettingsModal({ group, onClose }) {
  if (!group) return null;

  const [isLoadingLabels, setIsLoadingLabels] = useState(false);
  const [labelsError, setLabelsError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [labelsReady, setLabelsReady] = useState(false);
  const [labelUrls, setLabelUrls] = useState([]);

  const groupName = formatGroupDate(group.shipmentDate);
  const totalPostings = group.postings.length;

  const handleLoadLabels = async () => {
    setIsLoadingLabels(true);
    setLabelsError(null);
    setLabelUrls([]);
    setLabelsReady(false);

    try {
      // Группируем отправления по shipmentNumber
      const groupedByShipment = {};
      group.postings.forEach((posting) => {
        const shipmentNumber = posting.shipmentNumber;
        const shipmentDate = posting.shipmentDate;

        if (!shipmentNumber || !shipmentDate) return;

        if (!groupedByShipment[shipmentNumber]) {
          groupedByShipment[shipmentNumber] = {
            shipmentDate,
            postingNumbers: []
          };
        }
        groupedByShipment[shipmentNumber].postingNumbers.push(posting.postingNumber);
      });

      // Загружаем этикетки в S3 для каждой поставки
      const allLabels = [];
      let totalProcessed = 0;

      setUploadProgress({ current: 0, total: totalPostings });

      for (const [shipmentNumber, data] of Object.entries(groupedByShipment)) {
        const shipmentLabels = await uploadLabelsToS3(
          data.shipmentDate,
          shipmentNumber,
          data.postingNumbers,
          (progressData) => {
            // Обновляем прогресс
            totalProcessed++;
            setUploadProgress({ current: totalProcessed, total: totalPostings });

            // Добавляем URL этикетки в список
            if (progressData.success && progressData.labelUrl) {
              setLabelUrls((prev) => [...prev, progressData.labelUrl]);
            }
          }
        );

        allLabels.push(...shipmentLabels);
      }

      setLabelsReady(true);
      setLabelUrls(allLabels.filter(l => l.success).map(l => l.labelUrl));
    } catch (err) {
      console.error("Ошибка при загрузке этикеток:", err);
      setLabelsError(err.message);
    } finally {
      setIsLoadingLabels(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const handleDownloadLabels = () => {
    if (labelUrls.length === 0) return;

    // Открываем все этикетки в новых вкладках
    labelUrls.forEach((url) => {
      window.open(url, "_blank");
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-section">
            <div className="modal-title">{groupName}</div>
            <div className="modal-subtitle">Настройки поставки</div>
          </div>
          <button className="close-button" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="modal-body settings-body">
          <div className="settings-section">
            <div className="settings-section-header">
              <h3 className="settings-section-title">ЭТИКЕТКИ</h3>
            </div>

            <div className="settings-section-content">
              {isLoadingLabels && uploadProgress.total > 0 && (
                <div className="labels-progress">
                  <div className="labels-progress-bar-container">
                    <div
                      className="labels-progress-bar"
                      style={{
                        width: `${(uploadProgress.current / uploadProgress.total) * 100}%`
                      }}
                    />
                  </div>
                  <div className="labels-progress-text">
                    Загружено: {uploadProgress.current} / {uploadProgress.total}
                  </div>
                </div>
              )}

              {labelsReady && !isLoadingLabels && (
                <div className="labels-status">
                  <div className="labels-status-icon">✓</div>
                  <div className="labels-status-text">Этикетки готовы</div>
                </div>
              )}

              {labelsError && (
                <div className="labels-error">
                  <div className="labels-error-icon">⚠</div>
                  <div className="labels-error-text">{labelsError}</div>
                </div>
              )}

              {!labelsReady && !isLoadingLabels && (
                <div className="labels-info">
                  <div className="labels-info-text">
                    Будет загружено этикеток: {totalPostings}
                  </div>
                </div>
              )}

              <div className="settings-actions">
                {!labelsReady && (
                  <button
                    className="settings-button-primary"
                    onClick={handleLoadLabels}
                    disabled={isLoadingLabels || totalPostings === 0}
                    type="button"
                  >
                    {isLoadingLabels ? "Загружаем..." : "Загрузить этикетки"}
                  </button>
                )}

                {labelsReady && !isLoadingLabels && (
                  <button
                    className="settings-button-success"
                    onClick={handleDownloadLabels}
                    disabled={labelUrls.length === 0}
                    type="button"
                  >
                    Получить этикетки
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
