import { ProductRow } from "./ProductRow";
import { formatShipmentDate, formatItemsWord } from "../utils/formatters";

const VARIANT_CONFIG = {
  assembly: {
    numberLabel: "Задание:",
    dateLabel: "Собрать до:",
  },
  deliver: {
    numberLabel: "Отправление:",
    dateLabel: "Отгрузка до:",
  },
};

export function PostingCard({ posting, variant = "assembly", label }) {
  const config = VARIANT_CONFIG[variant];

  const totalItemsCount = posting.products.reduce(
    (sum, product) => sum + product.quantity,
    0
  );

  const shipmentDate = formatShipmentDate(posting.shipmentDate);

  return (
    <div className="posting-card">
      <div className="posting-header">
        <div className="posting-number">
          <span className="posting-label">{config.numberLabel}</span>
          <span className="posting-value">{posting.postingNumber}</span>
        </div>
        {shipmentDate && (
          <div className="posting-shipment-date">
            <span className="posting-label">{config.dateLabel}</span>
            <span className="posting-value">{shipmentDate}</span>
          </div>
        )}
        <div className="posting-items-count">
          {totalItemsCount} {formatItemsWord(totalItemsCount)}
        </div>
        {label && label.success && (
          <a
            href={label.labelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="posting-label-button"
          >
            Этикетка
          </a>
        )}
      </div>

      {posting.warehouse && (
        <div className="posting-warehouse">
          <span className="posting-label">Склад:</span>
          <span className="posting-warehouse-name">{posting.warehouse}</span>
        </div>
      )}

      <div className="posting-products">
        {posting.products.map((product, index) => (
          <ProductRow
            key={`${product.sku}-${index}`}
            product={product}
          />
        ))}
      </div>
    </div>
  );
}
