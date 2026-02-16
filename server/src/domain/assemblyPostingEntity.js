export function createAssemblyPosting({ postingNumber, assemblyCode, products }) {
	return {
		postingNumber,
		assemblyCode,
		products: products.map(createPostingProduct),
	};
}

function createPostingProduct({ offerId, quantity, sku, productName }) {
	return {
		offerId,
		quantity,
		sku,
		productName,
	};
}

export function mapRawPostingToEntity(rawPosting) {
	return createAssemblyPosting({
		postingNumber: rawPosting.posting_number,
		assemblyCode: rawPosting.assembly_code,
		products: rawPosting.products.map((rawProduct) => ({
			offerId: rawProduct.offer_id,
			quantity: rawProduct.quantity,
			sku: rawProduct.sku,
			productName: rawProduct.product_name,
		})),
	});
}
