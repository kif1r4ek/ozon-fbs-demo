import { useState, useMemo, useEffect } from "react";
import { formatGroupDate, formatTimeAgo } from "../utils/formatters";
import { uploadLabelsToS3, fetchAssembledPostings, shipGroup } from "../services/assemblyApiService";
import { fetchAssignedPostings } from "../services/adminApiService";
import { publishGroup } from "../utils/publishedGroupsStorage";
import { enrichGroupWithBarcodes } from "../utils/barcodeUtils";
import { getCompletedPostings, markPostingCompleted } from "../utils/assemblyProgressStorage";
import { OrderDetailModal } from "./OrderDetailModal";
import { AssignmentSection } from "./AssignmentSection";

export function ShipmentGroupModal({ group, onClose, isUserMode = false, isLocked = false }) {
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

  // Состояние для отгрузки в Ozon
  const [assembledCount, setAssembledCount] = useState(0);
  const [assembledPostingNumbers, setAssembledPostingNumbers] = useState([]);
  const [isLoadingAssembled, setIsLoadingAssembled] = useState(false);
  const [isShipping, setIsShipping] = useState(false);
  const [shipResult, setShipResult] = useState(null);
  const [shipError, setShipError] = useState(null);

  // Загружаем данные о собранных заказах для админа
  useEffect(() => {
    if (isUserMode || !group.shipmentDate) return;

    const loadAssembled = async () => {
      setIsLoadingAssembled(true);
      try {
        const data = await fetchAssembledPostings(group.shipmentDate);
        setAssembledCount(data.count);
        setAssembledPostingNumbers(data.postingNumbers);
      } catch (err) {
        console.error("Ошибка загрузки собранных заказов:", err);
      } finally {
        setIsLoadingAssembled(false);
      }
    };

    loadAssembled();
  }, [group.shipmentDate, isUserMode]);

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
      // Получаем список назначенных пользователям postingNumbers
      let assignedSet = null;
      try {
        const { postingNumbers } = await fetchAssignedPostings(group.shipmentDate);
        if (postingNumbers && postingNumbers.length > 0) {
          assignedSet = new Set(postingNumbers);
        }
      } catch {
        // Если не удалось получить назначения, пропускаем фильтрацию
      }

      // Фильтруем: загружаем этикетки только для назначенных заказов
      const postingsToLoad = assignedSet
        ? group.postings.filter((p) => assignedSet.has(p.postingNumber))
        : group.postings;

      if (postingsToLoad.length === 0) {
        setLabelsError("Нет назначенных заказов. Сначала назначьте заказы сотрудникам.");
        setIsLoadingLabels(false);
        return;
      }

      console.log(`Загрузка этикеток: ${postingsToLoad.length} из ${group.postings.length} (назначенных)`);

      // Группируем отправления по shipmentNumber
      const groupedByShipment = {};
      let skippedCount = 0;

      postingsToLoad.forEach((posting) => {
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

      if (skippedCount > 0) {
        console.log("Пропущено заказов без даты:", skippedCount);
      }

      // Загружаем этикетки в S3 для каждой поставки
      const allLabels = [];
      let totalProcessed = 0;
      const totalToLoad = postingsToLoad.length;

      setUploadProgress({ current: 0, total: totalToLoad });

      for (const [shipmentNumber, data] of Object.entries(groupedByShipment)) {
        const shipmentLabels = await uploadLabelsToS3(
          data.shipmentDate,
          shipmentNumber,
          data.postingNumbers,
          (progressData) => {
            totalProcessed++;
            setUploadProgress({ current: totalProcessed, total: totalToLoad });

            // Добавляем URL этикетки в список
            if (progressData.success && progressData.labelUrl) {
              setLabelUrls((prev) => [...prev, progressData.labelUrl]);
            }
          }
        );

        allLabels.push(...shipmentLabels);
      }

      const successfulLabels = allLabels.filter(l => l.success);
      const failedLabels = allLabels.filter(l => !l.success);

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
      console.error("Ошибка при загрузке этикеток:", err);
      setLabelsError(err.message || "Неизвестная ошибка при загрузке этикеток");
    } finally {
      setIsLoadingLabels(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const handleShipToOzon = async () => {
    if (assembledPostingNumbers.length === 0) return;

    setIsShipping(true);
    setShipError(null);
    setShipResult(null);

    try {
      const result = await shipGroup(assembledPostingNumbers);
      setShipResult(result);

      // Обнуляем собранные, так как они отгружены
      if (result.shipped && result.shipped.length > 0) {
        const remaining = assembledPostingNumbers.filter(
          (pn) => !result.shipped.includes(pn)
        );
        setAssembledPostingNumbers(remaining);
        setAssembledCount(remaining.length);
      }
    } catch (err) {
      console.error("Ошибка отгрузки:", err);
      setShipError(err.message || "Ошибка при отгрузке в Ozon");
    } finally {
      setIsShipping(false);
    }
  };

  const handleRefreshAssembled = async () => {
    setIsLoadingAssembled(true);
    try {
      const data = await fetchAssembledPostings(group.shipmentDate);
      setAssembledCount(data.count);
      setAssembledPostingNumbers(data.postingNumbers);
    } catch (err) {
      console.error("Ошибка обновления:", err);
    } finally {
      setIsLoadingAssembled(false);
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
            <div className="modal-title">
              {groupName}
              {isLocked && <span className="status-badge status-badge--in-progress">В работе</span>}
            </div>
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
              {isLocked && (
                <div className="locked-banner">
                  <div className="locked-banner-icon">&#128274;</div>
                  <div className="locked-banner-text">
                    <div className="locked-banner-title">Группа в работе</div>
                    <div className="locked-banner-desc">Заказы переданы сотрудникам. Изменения заблокированы.</div>
                  </div>
                </div>
              )}

              <div className={isLocked ? "settings-locked" : ""}>
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
                          Будет загружено этикеток для назначенных заказов
                        </div>
                      </div>
                    )}

                    <div className="settings-actions">
                      {!labelsReady && (
                        <button
                          className="settings-button-primary"
                          onClick={handleLoadLabels}
                          disabled={isLocked || isLoadingLabels || totalPostings === 0}
                          type="button"
                        >
                          {isLoadingLabels ? "Загружаем..." : "Загрузить этикетки"}
                        </button>
                      )}

                      {labelsReady && !isLoadingLabels && (
                        <button
                          className="settings-button-success"
                          onClick={handleDownloadLabels}
                          disabled={isLocked || labelUrls.length === 0}
                          type="button"
                        >
                          Получить этикетки
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <AssignmentSection
                  shipmentDate={group.shipmentDate}
                  totalOrders={totalPostings}
                  isLocked={isLocked}
                />

                <div className="settings-section">
                  <div className="settings-section-header">
                    <h3 className="settings-section-title">ОТГРУЗКА В OZON</h3>
                    <button
                      className="settings-refresh-button"
                      onClick={handleRefreshAssembled}
                      disabled={isLoadingAssembled}
                      type="button"
                      title="Обновить данные"
                    >
                      {isLoadingAssembled ? "..." : "↻"}
                    </button>
                  </div>

                  <div className="settings-section-content">
                    <div className="ship-status-info">
                      <div className="ship-status-row">
                        <span className="ship-status-label">Собрано заказов:</span>
                        <span className="ship-status-value">
                          {assembledCount} / {totalPostings}
                        </span>
                      </div>
                    </div>

                    {shipResult && (
                      <div className="ship-result">
                        {shipResult.shipped && shipResult.shipped.length > 0 && (
                          <div className="ship-result-success">
                            Отгружено: {shipResult.shipped.length}
                          </div>
                        )}
                        {shipResult.failed && shipResult.failed.length > 0 && (
                          <div className="ship-result-errors">
                            <div className="ship-result-error-title">
                              Ошибки: {shipResult.failed.length}
                            </div>
                            {shipResult.failed.map((f) => (
                              <div className="ship-result-error-item" key={f.postingNumber}>
                                {f.postingNumber}: {f.error}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {shipError && (
                      <div className="labels-error">
                        <div className="labels-error-icon">!</div>
                        <div className="labels-error-text">{shipError}</div>
                      </div>
                    )}

                    <div className="settings-actions">
                      <button
                        className="settings-button-primary"
                        onClick={handleShipToOzon}
                        disabled={isShipping || assembledCount === 0}
                        type="button"
                      >
                        {isShipping
                          ? "Отгружаем..."
                          : `Отгрузить в Ozon (${assembledCount})`}
                      </button>
                    </div>
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
