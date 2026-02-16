import { useState } from "react";
import { uploadLabelsToS3 } from "../services/assemblyApiService";

export function useLabels() {
  const [showLabels, setShowLabels] = useState(false);
  const [labels, setLabels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const fetchLabels = async (postings) => {
    setIsLoading(true);
    setError(null);
    setLabels([]);

    try {
      // Группируем отправления по shipmentNumber
      const groupedByShipment = {};
      postings.forEach((posting) => {
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
      const totalCount = postings.length;

      setUploadProgress({ current: 0, total: totalCount });

      for (const [shipmentNumber, data] of Object.entries(groupedByShipment)) {
        const shipmentLabels = await uploadLabelsToS3(
          data.shipmentDate,
          shipmentNumber,
          data.postingNumbers,
          (progressData) => {
            // Обновляем прогресс
            totalProcessed++;
            setUploadProgress({ current: totalProcessed, total: totalCount });

            // Добавляем этикетку в список по мере загрузки
            if (progressData.success) {
              setLabels((prev) => [
                ...prev,
                {
                  postingNumber: progressData.postingNumber,
                  labelUrl: progressData.labelUrl,
                  success: true,
                },
              ]);
            }
          }
        );

        allLabels.push(...shipmentLabels);
      }

      setLabels(allLabels);
      setShowLabels(true);
    } catch (err) {
      console.error("Ошибка при загрузке этикеток:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const toggleLabels = async (postings) => {
    if (showLabels) {
      setShowLabels(false);
      setLabels([]);
      return;
    }

    await fetchLabels(postings);
  };

  return {
    showLabels,
    labels,
    isLoading,
    error,
    uploadProgress,
    toggleLabels,
  };
}
