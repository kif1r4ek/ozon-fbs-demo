import { useState, useMemo } from "react";

export function useArticleSearch(postings) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPostings = useMemo(() => {
    if (!searchQuery.trim()) {
      return postings;
    }

    const lowerCaseQuery = searchQuery.toLowerCase().trim();

    return postings.filter((posting) =>
      posting.products.some(
        (product) =>
          product.offerId?.toLowerCase().includes(lowerCaseQuery) ||
          (product.name || "").toLowerCase().includes(lowerCaseQuery) ||
          String(product.sku).includes(lowerCaseQuery)
      )
    );
  }, [postings, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    filteredPostings,
  };
}
