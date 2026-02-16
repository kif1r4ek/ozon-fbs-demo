export function mapRawFbsPostingToEntity(rawPosting) {
	return {
		postingNumber: rawPosting.posting_number,
		status: rawPosting.status,
		shipmentDate: rawPosting.shipment_date,
		warehouse: rawPosting.delivery_method?.warehouse || null,
		products: (rawPosting.products || []).map((p) => ({
			offerId: p.offer_id,
			productId: p.sku, // SKU OZON - уникальный идентификатор товара в системе OZON
			name: p.name,
			sku: p.sku,
			quantity: p.quantity,
			price: p.price,
		})),
	};
}
