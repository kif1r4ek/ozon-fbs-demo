import { useState, useEffect, useCallback } from "react";
import { fetchAssemblyPostings } from "../services/assemblyApiService";

export function useAssemblyPostings() {
  const [assemblyPostings, setAssemblyPostings] = useState([]);
  const [isLoadingPostings, setIsLoadingPostings] = useState(true);
  const [postingsLoadError, setPostingsLoadError] = useState(null);

  const loadAssemblyPostings = useCallback(async () => {
    setIsLoadingPostings(true);
    setPostingsLoadError(null);
    try {
      const postings = await fetchAssemblyPostings();
      setAssemblyPostings(postings);
    } catch (error) {
      setPostingsLoadError(error.message);
    } finally {
      setIsLoadingPostings(false);
    }
  }, []);

  useEffect(() => {
    loadAssemblyPostings();
  }, [loadAssemblyPostings]);

  return {
    assemblyPostings,
    setAssemblyPostings,
    isLoadingPostings,
    postingsLoadError,
    refreshPostings: loadAssemblyPostings,
  };
}
