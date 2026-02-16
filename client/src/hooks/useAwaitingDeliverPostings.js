import { useState, useEffect, useCallback } from "react";
import { fetchAwaitingDeliverPostings } from "../services/assemblyApiService";

export function useAwaitingDeliverPostings() {
  const [deliverPostings, setDeliverPostings] = useState([]);
  const [isLoadingDeliver, setIsLoadingDeliver] = useState(true);
  const [deliverLoadError, setDeliverLoadError] = useState(null);

  const loadDeliverPostings = useCallback(async () => {
    setIsLoadingDeliver(true);
    setDeliverLoadError(null);
    try {
      const postings = await fetchAwaitingDeliverPostings();
      setDeliverPostings(postings);
    } catch (error) {
      setDeliverLoadError(error.message);
    } finally {
      setIsLoadingDeliver(false);
    }
  }, []);

  useEffect(() => {
    loadDeliverPostings();
  }, [loadDeliverPostings]);

  return {
    deliverPostings,
    setDeliverPostings,
    isLoadingDeliver,
    deliverLoadError,
    refreshDeliverPostings: loadDeliverPostings,
  };
}
