import { useState, useEffect, useRef } from "react";
import { findProductByBarcode } from "../services/moySkladService";
import { fetchLabelUrl, fetchLabelBarcode, markPostingAssembled } from "../services/assemblyApiService";
import "./OrderDetailModal.css";

/**
 * Модальное окно с детальной информацией о заказе и возможностью сканирования товаров
 * @param {object} posting - Объект заказа
 * @param {function} onClose - Функция закрытия модального окна
 * @param {function} onComplete - Функция вызываемая при успешном завершении сканирования всех товаров
 */
export function OrderDetailModal({ posting, onClose, onNext, onComplete, hasNextOrder = false }) {
  if (!posting) return null;

  // Состояние для отслеживания отсканированных товаров
  // Структура: { [offerId]: { scanned: number, total: number } }
  const [scannedProducts, setScannedProducts] = useState(() => {
    const initial = {};
    posting.products.forEach((product) => {
      initial[product.offerId] = {
        scanned: 0,
        total: product.quantity,
      };
    });
    return initial;
  });

  const [scanValue, setScanValue] = useState("");
  const [scanError, setScanError] = useState("");
  const [scanSuccess, setScanSuccess] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const scanInputRef = useRef(null);
  const scanTimerRef = useRef(null);

  // Состояние для открытия этикетки
  const [labelOpened, setLabelOpened] = useState(false);
  const [isLoadingLabel, setIsLoadingLabel] = useState(false);
  const [labelError, setLabelError] = useState("");

  // Состояние для сканирования этикетки
  const [labelScanPassed, setLabelScanPassed] = useState(false);
  const [labelScanValue, setLabelScanValue] = useState("");
  const [labelScanError, setLabelScanError] = useState("");
  const [labelScanSuccess, setLabelScanSuccess] = useState("");
  const [isVerifyingLabel, setIsVerifyingLabel] = useState(false);
  const labelScanInputRef = useRef(null);
  const labelScanTimerRef = useRef(null);

  // Фокус на поле ввода при открытии модального окна
  useEffect(() => {
    setTimeout(() => {
      if (scanInputRef.current) {
        scanInputRef.current.focus();
      }
    }, 100);
  }, []);

  // Автоматическая проверка штрихкода товара с задержкой
  useEffect(() => {
    const value = scanValue.trim();
    if (!value) return;

    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
    }

    scanTimerRef.current = setTimeout(() => {
      handleScanSubmit(value);
    }, 200);

    return () => {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }
    };
  }, [scanValue]);

  // Автоматическая проверка штрихкода этикетки с задержкой
  useEffect(() => {
    const value = labelScanValue.trim();
    if (!value) return;

    if (labelScanTimerRef.current) {
      clearTimeout(labelScanTimerRef.current);
    }

    labelScanTimerRef.current = setTimeout(() => {
      handleLabelScanSubmit(value);
    }, 200);

    return () => {
      if (labelScanTimerRef.current) {
        clearTimeout(labelScanTimerRef.current);
      }
    };
  }, [labelScanValue]);

  /**
   * Обработка отсканированного штрихкода товара с проверкой через МойСклад
   */
  const handleScanSubmit = async (barcode) => {
    setScanError("");
    setScanSuccess("");
    setIsVerifying(true);

    try {
      // Собираем список незавершённых артикулов из заказа
      const articles = posting.products
        .filter((p) => scannedProducts[p.offerId].scanned < scannedProducts[p.offerId].total)
        .map((p) => p.offerId);

      if (articles.length === 0) {
        setScanError("Все товары уже отсканированы");
        setScanValue("");
        setIsVerifying(false);
        return;
      }

      // Ищем товар по баркоду через МойСклад (серверный прокси)
      const result = await findProductByBarcode(barcode, articles);

      if (!result.found || !result.article) {
        setScanError(result.error || `Штрихкод ${barcode} не найден среди товаров заказа в МойСклад`);
        setScanValue("");
        setIsVerifying(false);
        return;
      }

      const product = posting.products.find((p) => p.offerId === result.article);
      const productState = scannedProducts[result.article];

      // Увеличиваем количество отсканированных товаров
      const updatedScanned = {
        ...scannedProducts,
        [result.article]: {
          ...productState,
          scanned: productState.scanned + 1,
        },
      };

      setScannedProducts(updatedScanned);
      setScanSuccess(`Товар "${product.name}" отсканирован (${productState.scanned + 1}/${productState.total})`);
      setScanValue("");
    } catch (error) {
      console.error('Ошибка проверки баркода:', error);
      setScanError('Ошибка проверки баркода через МойСклад');
      setScanValue("");
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * Открыть этикетку из S3
   */
  const handleOpenLabel = async () => {
    setIsLoadingLabel(true);
    setLabelError("");

    try {
      const shipmentNumber = posting.shipmentNumber || `TEMP-${posting.shipmentDate}`;
      const labelUrl = await fetchLabelUrl(
        posting.shipmentDate,
        shipmentNumber,
        posting.postingNumber
      );

      window.open(labelUrl, "_blank");
      setLabelOpened(true);

      // Фокус на поле сканирования этикетки
      setTimeout(() => {
        if (labelScanInputRef.current) {
          labelScanInputRef.current.focus();
        }
      }, 300);
    } catch (error) {
      console.error('Ошибка получения этикетки:', error);
      setLabelError(error.message || 'Не удалось получить этикетку');
    } finally {
      setIsLoadingLabel(false);
    }
  };

  // Кешируем ожидаемый баркод этикетки
  const [expectedLabelBarcode, setExpectedLabelBarcode] = useState(posting.labelBarcode || null);

  /**
   * Обработка отсканированного штрихкода этикетки
   * Сверяем с баркодом из OZON API (barcodes.lower_barcode)
   */
  const handleLabelScanSubmit = async (barcode) => {
    setLabelScanError("");
    setLabelScanSuccess("");
    setIsVerifyingLabel(true);

    try {
      const normalizedBarcode = barcode.trim().replace(/\s+/g, "");

      // Если баркод ещё не загружен — запрашиваем у сервера
      let expected = expectedLabelBarcode;
      if (!expected) {
        try {
          expected = await fetchLabelBarcode(posting.postingNumber);
          setExpectedLabelBarcode(expected);
        } catch {
          setLabelScanError("Не удалось получить баркод этикетки. Отсканируйте повторно.");
          setLabelScanValue("");
          setIsVerifyingLabel(false);
          return;
        }
      }

      const normalizedExpected = expected.trim().replace(/\s+/g, "");

      if (normalizedBarcode === normalizedExpected) {
        setLabelScanSuccess("Этикетка подтверждена!");
        setLabelScanPassed(true);
        setLabelScanValue("");

        // Отмечаем заказ как собранный в БД
        markPostingAssembled(posting.postingNumber).catch((err) => {
          console.error("Ошибка отметки сборки в БД:", err);
        });

        if (onComplete) {
          onComplete(posting);
        }
      } else {
        setLabelScanError("Отсканируйте повторно");
        setLabelScanValue("");
      }
    } catch (error) {
      console.error("Ошибка проверки этикетки:", error);
      setLabelScanError("Отсканируйте повторно");
      setLabelScanValue("");
    } finally {
      setIsVerifyingLabel(false);
    }
  };

  /**
   * Переход к следующему заказу
   */
  const handleNextOrder = () => {
    if (onNext) {
      onNext();
    } else {
      onClose();
    }
  };

  /**
   * Вычисляем общий прогресс сканирования
   */
  const getTotalProgress = () => {
    const totalItems = posting.products.reduce((sum, p) => sum + p.quantity, 0);
    const scannedItems = Object.values(scannedProducts).reduce(
      (sum, state) => sum + state.scanned,
      0
    );
    return { scannedItems, totalItems };
  };

  const { scannedItems, totalItems } = getTotalProgress();
  const isAllScanned = scannedItems === totalItems;

  // Форматируем дату и время
  const formatDateTime = (dateString) => {
    if (!dateString) return "\u2014";
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${date.toLocaleDateString("ru-RU")} ${hours}:${minutes}:${seconds}`;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal order-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-section">
            <div className="modal-title">Заказ {posting.postingNumber}</div>
            <div className="modal-subtitle">
              Прогресс: {scannedItems} / {totalItems}
            </div>
          </div>
          <button className="close-button" onClick={onClose} type="button">
            &times;
          </button>
        </div>

        <div className="modal-body order-detail-body">
          {/* Информация о заказе */}
          <div className="order-detail-section">
            <div className="order-detail-row">
              <span className="order-detail-label">Дата и время:</span>
              <span className="order-detail-value">{formatDateTime(posting.shipmentDate)}</span>
            </div>
          </div>

          {/* Список товаров */}
          <div className="order-products-section">
            <h3 className="order-products-title">Товары в заказе:</h3>
            <div className="order-products-list">
              {posting.products.map((product, index) => {
                const productState = scannedProducts[product.offerId];
                const isCompleted = productState.scanned === productState.total;

                return (
                  <div
                    key={`${product.offerId}-${index}`}
                    className={`order-product-item ${isCompleted ? "completed" : ""}`}
                  >
                    <div className="order-product-info">
                      <div className="order-product-name">{product.name}</div>
                      <div className="order-product-details">
                        <div className="order-product-detail">
                          <span className="detail-label">Баркод:</span>
                          <span className="detail-value mono">{product.barcode || "\u2014"}</span>
                        </div>
                        <div className="order-product-detail">
                          <span className="detail-label">Артикул продавца:</span>
                          <span className="detail-value mono">{product.offerId}</span>
                        </div>
                        {product.productId && (
                          <div className="order-product-detail">
                            <span className="detail-label">Артикул OZON:</span>
                            <span className="detail-value mono">{product.productId}</span>
                          </div>
                        )}
                        <div className="order-product-detail">
                          <span className="detail-label">Количество:</span>
                          <span className="detail-value">
                            <span className={isCompleted ? "completed-badge" : "progress-badge"}>
                              {productState.scanned} / {productState.total}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Блок сканирования товаров */}
          {!isAllScanned && (
            <div className="scan-section">
              <h3 className="scan-title">Сканирование товаров</h3>
              <div className="scan-input-group">
                <input
                  ref={scanInputRef}
                  type="text"
                  className="scan-input"
                  value={scanValue}
                  onChange={(e) => setScanValue(e.target.value)}
                  placeholder="Отсканируйте штрихкод товара"
                  autoFocus
                  disabled={isVerifying}
                />
              </div>
              {isVerifying && <div className="scan-message info">Проверка через МойСклад...</div>}
              {scanError && <div className="scan-message error">{scanError}</div>}
              {scanSuccess && <div className="scan-message success">{scanSuccess}</div>}
            </div>
          )}

          {/* Статус безошибочной сборки */}
          {isAllScanned && (
            <div className="scan-status-row success">
              Безошибочная сборка пройдена
            </div>
          )}

          {/* Этап 1: Все товары отсканированы — кнопка "Открыть этикетку" */}
          {isAllScanned && !labelOpened && !labelScanPassed && (
            <div className="scan-section label-scan-section">
              <button
                className="open-label-button"
                onClick={handleOpenLabel}
                disabled={isLoadingLabel}
                type="button"
              >
                {isLoadingLabel ? "Загрузка..." : "Открыть этикетку"}
              </button>
              {labelError && <div className="scan-message error">{labelError}</div>}
            </div>
          )}

          {/* Этап 2: Этикетка открыта — сканирование этикетки */}
          {isAllScanned && labelOpened && !labelScanPassed && (
            <div className="scan-section label-scan-section">
              <h3 className="scan-title">Сканирование этикетки заказа</h3>
              <div className="scan-complete-notice">
                <div className="scan-complete-text">Этикетка открыта</div>
                <div className="scan-complete-subtitle">Наклейте этикетку и отсканируйте её</div>
              </div>
              <div className="scan-input-group">
                <input
                  ref={labelScanInputRef}
                  type="text"
                  className="scan-input"
                  value={labelScanValue}
                  onChange={(e) => setLabelScanValue(e.target.value)}
                  placeholder="Отсканируйте этикетку заказа"
                  autoFocus
                  disabled={isVerifyingLabel}
                />
              </div>
              {isVerifyingLabel && <div className="scan-message info">Проверка этикетки...</div>}
              {labelScanError && <div className="scan-message error">{labelScanError}</div>}
              {labelScanSuccess && <div className="scan-message success">{labelScanSuccess}</div>}
            </div>
          )}

          {/* Статус этикетки */}
          {isAllScanned && labelScanPassed && (
            <div className="scan-status-row success">
              Этикетка подтверждена
            </div>
          )}

          {/* Финальное сообщение о завершении + кнопка "Далее" */}
          {isAllScanned && labelScanPassed && (
            <div className="scan-complete-message">
              <div className="scan-complete-text">Заказ полностью обработан!</div>
              <button
                className="next-order-button"
                onClick={handleNextOrder}
                type="button"
              >
                {hasNextOrder ? "Далее" : "Закрыть"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
