import { fetchAssemblyProductsList } from "../infrastructure/ozonApiClient.js";
import { mapRawProductToEntity } from "../domain/assemblyProductEntity.js";

export async function getAllAssemblyProducts() {
	const allProducts = [];
	let cursor = "";
	let hasMorePages = true;

	while (hasMorePages) {
		const ozonResponse = await fetchAssemblyProductsList(cursor, 50);

		const rawProducts = ozonResponse.products || [];
		const mappedProducts = rawProducts.map(mapRawProductToEntity);
		allProducts.push(...mappedProducts);

		const nextCursor = ozonResponse.cursor || "";
		hasMorePages = nextCursor !== "" && rawProducts.length > 0 && nextCursor !== cursor;
		cursor = nextCursor;
	}

	return {
		totalProductsCount: allProducts.length,
		products: allProducts,
	};
}
