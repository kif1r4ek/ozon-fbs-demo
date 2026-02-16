export function createAssemblyProduct({ offerId, totalQuantity, sku, productName, postings }) {
	return {
		offerId,
		totalQuantity,
		sku,
		productName,
		postings: postings.map(createProductPosting),
	};
}

function createProductPosting({ quantity, postingNumber }) {
	return { quantity, postingNumber };
}

export function mapRawProductToEntity(rawProduct) {
	return createAssemblyProduct({
		offerId: rawProduct.offer_id,
		totalQuantity: rawProduct.quantity,
		sku: rawProduct.sku,
		productName: rawProduct.product_name,
		postings: rawProduct.postings.map((rawPosting) => ({
			quantity: rawPosting.quantity,
			postingNumber: rawPosting.posting_number,
		})),
	});
}
