import { useState, useEffect, useMemo } from "react";
import { generateShipmentNumber } from "../utils/shipmentUtils";

export function CreateShipmentDialog({ isOpen, onClose, assemblyPostings, onCreateShipment }) {
  const [shipmentDate, setShipmentDate] = useState("");
  const [shipmentNumber, setShipmentNumber] = useState("");
  const [selectedPostingNumbers, setSelectedPostingNumbers] = useState(new Set());

  // Получаем выбранные отправления
  const selectedPostings = useMemo(() => {
    return assemblyPostings.filter((posting) =>
      selectedPostingNumbers.has(posting.postingNumber)
    );
  }, [assemblyPostings, selectedPostingNumbers]);

  // Вычисляем сводку по выбранным отправлениям
  const summary = useMemo(() => {
    const warehouses = new Set();
    const productsMap = new Map();

    selectedPostings.forEach((posting) => {
      if (posting.warehouse) {
        warehouses.add(posting.warehouse);
      }

      posting.products.forEach((product) => {
        const key = product.offerId;
        if (productsMap.has(key)) {
          const existing = productsMap.get(key);
          existing.quantity += product.quantity;
        } else {
          productsMap.set(key, {
            offerId: product.offerId,
            name: product.name,
            quantity: product.quantity,
          });
        }
      });
    });

    return {
      postingsCount: selectedPostings.length,
      warehouses: Array.from(warehouses),
      products: Array.from(productsMap.values()),
    };
  }, [selectedPostings]);

  // Генерация QR-кода и сброс формы
  useEffect(() => {
    if (isOpen) {
      // Генерируем новый QR-код при открытии диалога
      setShipmentNumber(generateShipmentNumber());
    } else {
      // Сбрасываем форму при закрытии
      setShipmentDate("");
      setShipmentNumber("");
      setSelectedPostingNumbers(new Set());
    }
  }, [isOpen]);

  // Обработка ввода даты с автоформатированием DD.MM.YYYY
  const handleDateInput = (e) => {
    // Оставляем только цифры
    const digitsOnly = e.target.value.replace(/\D/g, "");

    let formatted = "";

    // Автоматически добавляем точки после дня и месяца
    if (digitsOnly.length <= 2) {
      formatted = digitsOnly; // DD
    } else if (digitsOnly.length <= 4) {
      formatted = digitsOnly.slice(0, 2) + "." + digitsOnly.slice(2); // DD.MM
    } else {
      formatted = digitsOnly.slice(0, 2) + "." + digitsOnly.slice(2, 4) + "." + digitsOnly.slice(4, 8); // DD.MM.YYYY
    }

    setShipmentDate(formatted);
  };

  // Валидация формата даты DD.MM.YYYY
  const isValidDate = (dateStr) => {
    if (!dateStr) return false;

    const regex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
    const match = dateStr.match(regex);

    if (!match) return false;

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    // Проверяем диапазоны
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year < 2000 || year > 2100) return false;

    // Проверяем корректность даты
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year &&
           date.getMonth() === month - 1 &&
           date.getDate() === day;
  };

  // Переключение выбора отправления
  const togglePosting = (postingNumber) => {
    setSelectedPostingNumbers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postingNumber)) {
        newSet.delete(postingNumber);
      } else {
        newSet.add(postingNumber);
      }
      return newSet;
    });
  };

  // Выбрать все / Снять все
  const toggleAll = () => {
    if (selectedPostingNumbers.size === assemblyPostings.length) {
      setSelectedPostingNumbers(new Set());
    } else {
      setSelectedPostingNumbers(new Set(assemblyPostings.map((p) => p.postingNumber)));
    }
  };

  const handleCreate = () => {
    if (!isValidDate(shipmentDate)) {
      alert("Введите корректную дату в формате ДД.ММ.ГГГГ (например: 02.03.2026)");
      return;
    }

    if (selectedPostings.length === 0) {
      alert("Выберите хотя бы одно отправление");
      return;
    }

    onCreateShipment({
      date: shipmentDate,
      postings: selectedPostings,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Создать новую поставку</h2>
          <button className="dialog-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="dialog-body">
          <div className="form-group">
            <label htmlFor="shipment-date">Дата поставки</label>
            <input
              id="shipment-date"
              type="text"
              className="shipment-name-input"
              placeholder="ДД.ММ.ГГГГ (например: 02.03.2026)"
              value={shipmentDate}
              onChange={handleDateInput}
              maxLength="10"
            />
          </div>

          {shipmentNumber && (
            <div className="form-group">
              <label>QR-код поставки</label>
              <div className="shipment-number-display">{shipmentNumber}</div>
            </div>
          )}

          <div className="postings-selection-section">
            <div className="postings-header">
              <span>Выберите отправления для поставки</span>
              <button className="toggle-all-button" onClick={toggleAll}>
                {selectedPostingNumbers.size === assemblyPostings.length
                  ? "Снять все"
                  : "Выбрать все"}
              </button>
            </div>

            <div className="dialog-postings-list">
              {assemblyPostings.map((posting) => (
                <div
                  key={posting.postingNumber}
                  className={`dialog-posting-item ${
                    selectedPostingNumbers.has(posting.postingNumber) ? "selected" : ""
                  }`}
                  onClick={() => togglePosting(posting.postingNumber)}
                >
                  <input
                    type="checkbox"
                    checked={selectedPostingNumbers.has(posting.postingNumber)}
                    onChange={() => {}}
                    className="posting-checkbox"
                  />
                  <div className="dialog-posting-info">
                    <div className="dialog-posting-number">{posting.postingNumber}</div>
                    <div className="dialog-posting-details">
                      {posting.warehouse && (
                        <span className="dialog-posting-warehouse"> {posting.warehouse}</span>
                      )}
                      <span className="dialog-posting-date">
                         {new Date(posting.shipmentDate).toLocaleDateString("ru-RU")}
                      </span>
                      <span className="dialog-posting-products-count">
                         {posting.products.length} товар(а)
                      </span>
                    </div>
                    <div className="dialog-posting-products">
                      {posting.products.map((product, idx) => (
                        <div key={idx} className="dialog-posting-product">
                          {product.name} ({product.offerId}) × {product.quantity}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedPostings.length > 0 && (
            <div className="summary-section">
              <div className="summary-header">Сводка по выбранным отправлениям</div>
              <div className="summary-row">
                <span>Выбрано отправлений</span>
                <span>{summary.postingsCount}</span>
              </div>
              <div className="summary-row">
                <span>Склады</span>
                <span>{summary.warehouses.join(", ") || "-"}</span>
              </div>
              <div className="summary-row">
                <span>Всего товаров</span>
                <span>{summary.products.reduce((sum, p) => sum + p.quantity, 0)}</span>
              </div>
              {summary.products.length > 0 && (
                <div className="summary-products">
                  <div className="summary-products-header">Товары в поставке:</div>
                  {summary.products.map((product) => (
                    <div key={product.offerId} className="summary-product">
                      <span>{product.name}</span>
                      <span>× {product.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button className="dialog-button cancel-button" onClick={onClose}>
            Отмена
          </button>
          <button
            className="dialog-button create-button"
            onClick={handleCreate}
            disabled={!isValidDate(shipmentDate) || selectedPostings.length === 0}
          >
            Создать поставку
          </button>
        </div>
      </div>
    </div>
  );
}
