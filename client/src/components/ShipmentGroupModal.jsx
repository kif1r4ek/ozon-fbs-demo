import { useState, useMemo } from "react";
import { formatGroupDate, formatTimeAgo } from "../utils/formatters";
import { uploadLabelsToS3 } from "../services/assemblyApiService";
import { publishGroup } from "../utils/publishedGroupsStorage";
import { enrichGroupWithBarcodes } from "../utils/barcodeUtils";
import { getCompletedPostings, markPostingCompleted } from "../utils/assemblyProgressStorage";
import { OrderDetailModal } from "./OrderDetailModal";

export function ShipmentGroupModal({ group, onClose, isUserMode = false }) {
  if (!group) return null;

  const [activeTab, setActiveTab] = useState("orders"); // orders, products, settings
  const [isLoadingLabels, setIsLoadingLabels] = useState(false);
  const [labelsError, setLabelsError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [labelsReady, setLabelsReady] = useState(false);
  const [labelUrls, setLabelUrls] = useState([]);

  // Состояние для отслеживания обработанных заказов (загружаем из localStorage)
  const [completedPostings, setCompletedPostings] = useState(
    () => getCompletedPostings(group.shipmentDate)
  );

  // Состояние для выбранного заказа (для детального просмотра)
  const [selectedPosting, setSelectedPosting] = useState(null);

  // Обогащаем группу баркодами
  const enrichedGroup = useMemo(() => enrichGroupWithBarcodes(group), [group]);

  const groupName = formatGroupDate(group.shipmentDate);
  const totalPostings = group.postings.length;

  const handleLoadLabels = async () => {
    setIsLoadingLabels(true);
    setLabelsError(null);
    setLabelUrls([]);
    setLabelsReady(false);

    try {
      console.log("🔍 Начинаем загрузку этикеток");
      console.log("📦 Всего заказов в группе:", group.postings.length);
      console.log("📅 Дата группы:", group.shipmentDate);

      // Проверяем структуру первого заказа
      if (group.postings.length > 0) {
        console.log("📋 Пример заказа:", {
          postingNumber: group.postings[0].postingNumber,
          shipmentNumber: group.postings[0].shipmentNumber,
          shipmentDate: group.postings[0].shipmentDate,
          products: group.postings[0].products?.length
        });
      }

      // Группируем отправления по shipmentNumber
      // Если shipmentNumber нет, используем дату группы как идентификатор
      const groupedByShipment = {};
      let skippedCount = 0;

      group.postings.forEach((posting) => {
        const shipmentNumber = posting.shipmentNumber || `TEMP-${group.shipmentDate}`;
        const shipmentDate = posting.shipmentDate || group.shipmentDate;

        if (!shipmentDate) {
          console.warn("⚠️ Пропущен заказ без даты:", posting.postingNumber);
          skippedCount++;
          return;
        }

        if (!groupedByShipment[shipmentNumber]) {
          groupedByShipment[shipmentNumber] = {
            shipmentDate,
            postingNumbers: []
          };
        }
        groupedByShipment[shipmentNumber].postingNumbers.push(posting.postingNumber);
      });

      console.log("📊 Пропущено заказов:", skippedCount);
      console.log("📦 Групп отгрузок:", Object.keys(groupedByShipment).length);
      console.log("📋 Детали групп:", groupedByShipment);

      // Загружаем этикетки в S3 для каждой поставки
      const allLabels = [];
      let totalProcessed = 0;

      setUploadProgress({ current: 0, total: totalPostings });

      for (const [shipmentNumber, data] of Object.entries(groupedByShipment)) {
        console.log(`📤 Загружаем группу ${shipmentNumber}:`, {
          date: data.shipmentDate,
          postings: data.postingNumbers.length
        });

        const shipmentLabels = await uploadLabelsToS3(
          data.shipmentDate,
          shipmentNumber,
          data.postingNumbers,
          (progressData) => {
            console.log("📈 Прогресс:", progressData);
            // Обновляем прогресс
            totalProcessed++;
            setUploadProgress({ current: totalProcessed, total: totalPostings });

            // Добавляем URL этикетки в список
            if (progressData.success && progressData.labelUrl) {
              setLabelUrls((prev) => [...prev, progressData.labelUrl]);
            }
          }
        );

        console.log(`✅ Группа ${shipmentNumber} загружена:`, shipmentLabels.length, "этикеток");
        allLabels.push(...shipmentLabels);
      }

      console.log("🎉 Загрузка завершена! Всего этикеток:", allLabels.length);

      const successfulLabels = allLabels.filter(l => l.success);
      const failedLabels = allLabels.filter(l => !l.success);

      console.log("✅ Успешно загружено:", successfulLabels.length);
      console.log("❌ Ошибок загрузки:", failedLabels.length);

      if (failedLabels.length > 0) {
        console.error("Ошибки загрузки:", failedLabels);
      }

      setLabelsReady(true);
      setLabelUrls(successfulLabels.map(l => l.labelUrl));

      // Если ни одна этикетка не загрузилась, показываем ошибку
      if (successfulLabels.length === 0 && allLabels.length > 0) {
        setLabelsError("Не удалось загрузить ни одной этикетки. Проверьте консоль браузера для деталей.");
        setLabelsReady(false);
      }
    } catch (err) {
      console.error("❌ Критическая ошибка при загрузке этикеток:", err);
      console.error("Стек ошибки:", err.stack);
      setLabelsError(err.message || "Неизвестная ошибка при загрузке этикеток");
    } finally {
      setIsLoadingLabels(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const handleDownloadLabels = () => {
    if (labelUrls.length === 0) return;

    // Публикуем группу в localStorage
    const published = publishGroup(group, labelUrls);

    if (published) {
      console.log('✅ Группа опубликована:', group.shipmentDate);
    } else {
      console.error('❌ Ошибка публикации группы');
    }

    // Закрываем модальное окно после публикации
    onClose();
  };

  /**
   * Обработчик клика на заказ
   * Открывает модальное окно с детальной информацией только для первого необработанного заказа
   * Доступно только в пользовательском режиме
   */
  const handlePostingClick = (posting, index) => {
    // Функционал сканирования доступен только для пользователей
    if (!isUserMode) {
      return;
    }

    // Находим индекс первого необработанного заказа
    const firstAvailableIndex = enrichedGroup.postings.findIndex(
      (p) => !completedPostings.has(p.postingNumber)
    );

    // Если это не первый доступный заказ, игнорируем клик
    if (index !== firstAvailableIndex) {
      return;
    }

    setSelectedPosting(posting);
  };

  /**
   * Обработчик завершения сканирования заказа
   * Помечает заказ как обработанный и сохраняет в localStorage
   */
  const handlePostingComplete = (posting) => {
    setCompletedPostings((prev) => new Set([...prev, posting.postingNumber]));
    markPostingCompleted(group.shipmentDate, posting.postingNumber);
    console.log('Заказ обработан:', posting.postingNumber);
  };

  /**
   * Обработчик закрытия OrderDetailModal (кнопка X / клик по бэкдропу)
   * Просто закрывает модалку без автоперехода
   */
  const handleOrderModalClose = () => {
    setSelectedPosting(null);
  };

  /**
   * Обработчик кнопки "Далее" — автопереход к следующему заказу
   */
  const handleOrderModalNext = () => {
    const nextIndex = enrichedGroup.postings.findIndex(
      (p) => !completedPostings.has(p.postingNumber) && p.postingNumber !== selectedPosting?.postingNumber
    );

    setSelectedPosting(null);

    // Если есть следующий необработанный заказ — открываем его
    if (nextIndex !== -1) {
      setTimeout(() => {
        setSelectedPosting(enrichedGroup.postings[nextIndex]);
      }, 300);
    }
  };

  /**
   * Проверяет, есть ли следующий необработанный заказ после текущего
   */
  const hasNextOrder = () => {
    if (!selectedPosting) return false;
    const remaining = enrichedGroup.postings.filter(
      (p) => !completedPostings.has(p.postingNumber) && p.postingNumber !== selectedPosting.postingNumber
    );
    return remaining.length > 0;
  };

  /**
   * Определяет, можно ли кликнуть на заказ
   * Заказы кликабельны только в пользовательском режиме
   */
  const isPostingClickable = (posting, index) => {
    // Сканирование доступно только для пользователей
    if (!isUserMode) {
      return false;
    }

    const firstAvailableIndex = enrichedGroup.postings.findIndex(
      (p) => !completedPostings.has(p.postingNumber)
    );
    return index === firstAvailableIndex;
  };

  /**
   * Определяет, обработан ли заказ
   */
  const isPostingCompleted = (posting) => {
    return completedPostings.has(posting.postingNumber);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal shipment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-section">
            <div className="modal-title">{groupName}</div>
            <div className="modal-subtitle">Заказы в поставке</div>
          </div>
          <button className="close-button" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="shipment-tabs">
          <button
            className={`shipment-tab ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => setActiveTab("orders")}
            type="button"
          >
            Заказы
          </button>
          {!isUserMode && (
            <button
              className={`shipment-tab ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
              type="button"
            >
              Настройка
            </button>
          )}
        </div>

        <div className="modal-body">
          {activeTab === "orders" && (
            <>
              {enrichedGroup.postings.length === 0 ? (
                <div className="table-empty">Нет заказов в этой группе</div>
              ) : (
                <div className="orders-list">
                  {enrichedGroup.postings.map((posting, index) => {
                    const clickable = isPostingClickable(posting, index);
                    const completed = isPostingCompleted(posting);

                    return (
                      <div
                        className={`order-card ${isUserMode ? (clickable ? 'clickable' : 'disabled') : ''} ${isUserMode && completed ? 'completed' : ''}`}
                        key={posting.postingNumber}
                        onClick={() => handlePostingClick(posting, index)}
                        style={{ cursor: isUserMode ? (clickable ? 'pointer' : 'not-allowed') : 'default' }}
                      >
                        <div className="order-card-header">
                          <div className="order-number">
                            <span className="order-label">Задание:</span>
                            <span className="order-value">{posting.postingNumber}</span>
                            {isUserMode && completed && <span className="completed-badge-inline">✓ Обработан</span>}
                            {isUserMode && clickable && !completed && <span className="active-badge-inline">→ Доступен</span>}
                          </div>
                          <div className="order-time">
                            {formatTimeAgo(posting.shipmentDate)}
                          </div>
                        </div>
                        <div className="order-products">
                          {posting.products.map((product, index) => (
                            <div className="order-product-row" key={`${product.offerId}-${index}`}>
                              <div className="order-product-details">
                                <div className="order-product-name">{product.name}</div>
                                <div className="order-product-meta">
                                  <span className="order-product-article">Артикул: {product.offerId}</span>
                                  {product.productId && (
                                    <span className="order-product-id">OZON: {product.productId}</span>
                                  )}
                                </div>
                              </div>
                              <div className="order-product-quantity">
                                <span className="order-quantity-value">{product.quantity}</span>
                                <span className="order-quantity-label">шт.</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === "settings" && !isUserMode && (
            <div className="settings-tab-content">
              <div className="settings-section">
                <div className="settings-section-header">
                  <h3 className="settings-section-title">ЭТИКЕТКИ</h3>
                </div>

                <div className="settings-section-content">
                  {isLoadingLabels && uploadProgress.total > 0 && (
                    <div className="labels-progress">
                      <div className="labels-progress-header">
                        <span className="labels-progress-title">Загрузка этикеток в S3</span>
                        <span className="labels-progress-percent">
                          {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                        </span>
                      </div>
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
                      <div className="labels-status-content">
                        <div className="labels-status-text">Этикетки готовы</div>
                        <div className="labels-status-details">
                          Загружено в S3: {labelUrls.length} {labelUrls.length === 1 ? 'файл' : labelUrls.length < 5 ? 'файла' : 'файлов'}
                        </div>
                      </div>
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
          )}
        </div>
      </div>

      {/* Модальное окно с детальной информацией о заказе - только для пользователей */}
      {selectedPosting && isUserMode && (
        <OrderDetailModal
          posting={selectedPosting}
          onClose={handleOrderModalClose}
          onNext={handleOrderModalNext}
          onComplete={handlePostingComplete}
          hasNextOrder={hasNextOrder()}
        />
      )}
    </div>
  );
}
