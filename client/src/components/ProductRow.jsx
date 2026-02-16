export function ProductRow({ product }) {
  const formattedPrice = product.price
    ? formatPrice(product.price)
    : null;

  return (
    <div className="product-row">
      <div className="product-details">
        <div className="product-name">{product.name}</div>
        <div className="product-meta">
          <span className="product-offer-id">Артикул: {product.offerId}</span>
          <span className="product-sku">SKU: {product.sku}</span>
        </div>
        {formattedPrice && (
          <div className="product-price">{formattedPrice}</div>
        )}
      </div>
      <div className="product-quantity">
        <span className="quantity-value">{product.quantity}</span>
        <span className="quantity-label">шт.</span>
      </div>
    </div>
  );
}

function formatPrice(price) {
  const num = parseFloat(price);
  if (isNaN(num) || num === 0) return null;
  return num.toLocaleString("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
