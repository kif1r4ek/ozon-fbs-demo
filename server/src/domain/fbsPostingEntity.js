export function mapRawFbsPostingToEntity(rawPosting) {
	return {
		postingNumber: rawPosting.posting_number,
		status: rawPosting.status,
		shipmentDate: rawPosting.shipment_date,
		warehouse: rawPosting.delivery_method?.warehouse || null,
		labelBarcode: rawPosting.barcodes?.lower_barcode || rawPosting.barcodes?.upper_barcode || null,
		products: (rawPosting.products || []).map((p) => ({
			offerId: p.offer_id,
			productId: p.sku,
			name: p.name,
			sku: p.sku,
			quantity: p.quantity,
			price: p.price,
		})),
	};
}
