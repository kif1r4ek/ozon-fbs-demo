import { fetchFbsPostingsByStatus } from "../infrastructure/ozonApiClient.js";
import { mapRawFbsPostingToEntity } from "../domain/fbsPostingEntity.js";

export async function getAllAwaitingDeliverPostings() {
	const allPostings = [];
	let offset = 0;
	const limit = 1000;
	let hasNext = true;

	while (hasNext) {
		const ozonResponse = await fetchFbsPostingsByStatus(
			"awaiting_deliver",
			offset,
			limit
		);

		const rawPostings = ozonResponse.result?.postings || [];
		const mapped = rawPostings.map(mapRawFbsPostingToEntity);
		allPostings.push(...mapped);

		hasNext = ozonResponse.result?.has_next === true;
		offset += limit;
	}

	return allPostings;
}
