import { useState, useEffect, useCallback } from "react";
import { useAssemblyPostings } from "../../hooks/useAssemblyPostings";
import { useAwaitingDeliverPostings } from "../../hooks/useAwaitingDeliverPostings";
import { useArticleSearch } from "../../hooks/useArticleSearch";
import { useShipmentGroups } from "../../hooks/useShipmentGroups";
import { useGroupSearch } from "../../hooks/useGroupSearch";
import { SearchBar } from "../SearchBar";
import { RefreshButton } from "../RefreshButton";
import { ExportXlsxButton } from "../ExportXlsxButton";
import { CreateShipmentButton } from "../CreateShipmentButton";
import { CreateShipmentDialog } from "../CreateShipmentDialog";
import { downloadDeliverSheet, createFolderInS3 } from "../../services/assemblyApiService";
import { fetchAssignedDates } from "../../services/adminApiService";
import { PostingsList } from "../PostingsList";
import { ShipmentGroupsList } from "../ShipmentGroupsList";
import { TabBar } from "../TabBar";
import { ErrorMessage } from "../ErrorMessage";
import { LoadingSpinner } from "../LoadingSpinner";
import { generateShipmentNumber } from "../../utils/shipmentUtils";

export function OrdersTab() {
  const [activeTab, setActiveTab] = useState("assembly");
  const [isShipmentDialogOpen, setIsShipmentDialogOpen] = useState(false);
  const [assignedDates, setAssignedDates] = useState(new Set());

  const {
    assemblyPostings,
    setAssemblyPostings,
    isLoadingPostings,
    postingsLoadError,
    refreshPostings,
  } = useAssemblyPostings();

  const {
    deliverPostings,
    setDeliverPostings,
    isLoadingDeliver,
    deliverLoadError,
    refreshDeliverPostings,
  } = useAwaitingDeliverPostings();

  const {
    searchQuery: assemblySearch,
    setSearchQuery: setAssemblySearch,
    filteredPostings: filteredAssembly,
  } = useArticleSearch(assemblyPostings);

  const {
    searchQuery: deliverSearch,
    setSearchQuery: setDeliverSearch,
  } = useArticleSearch(deliverPostings);

  const shipmentGroups = useShipmentGroups(deliverPostings);
  const filteredGroups = useGroupSearch(shipmentGroups, deliverSearch);

  const loadAssignedDates = useCallback(async () => {
    try {
      const data = await fetchAssignedDates();
      setAssignedDates(new Set(data.assignedDates || []));
    } catch {
      // Не блокируем UI при ошибке
    }
  }, []);

  useEffect(() => {
    loadAssignedDates();
  }, [loadAssignedDates]);

  const isLoading = activeTab === "assembly" ? isLoadingPostings : isLoadingDeliver;
  const loadError = activeTab === "assembly" ? postingsLoadError : deliverLoadError;

  const handleRefreshDeliver = useCallback(async () => {
    await Promise.all([refreshDeliverPostings(), loadAssignedDates()]);
  }, [refreshDeliverPostings, loadAssignedDates]);

  const handleRefresh = activeTab === "assembly" ? refreshPostings : handleRefreshDeliver;

  const handleCreateShipment = async ({ date, postings }) => {
    try {
      const shipmentNumber = generateShipmentNumber();
      await createFolderInS3(date, shipmentNumber);

      const postingNumbersToMove = new Set(postings.map((p) => p.postingNumber));
      const updatedAssembly = assemblyPostings.filter(
        (p) => !postingNumbersToMove.has(p.postingNumber)
      );
      setAssemblyPostings(updatedAssembly);

      const postingsWithShipment = postings.map((p) => ({
        ...p,
        shipmentDate: date,
        shipmentNumber: shipmentNumber,
      }));
      setDeliverPostings([...deliverPostings, ...postingsWithShipment]);
      setIsShipmentDialogOpen(false);
    } catch (error) {
      console.error("Ошибка при создании поставки:", error);
      alert(`Ошибка при создании поставки: ${error.message}`);
    }
  };

  return (
    <div>
      <div className="orders-tab-header">
        <RefreshButton onRefresh={handleRefresh} isLoading={isLoading} />
        {activeTab === "deliver" && (
          <ExportXlsxButton
            onDownload={downloadDeliverSheet}
            label="Лист отгрузки"
            title="Скачать лист отгрузки в Excel"
          />
        )}
      </div>

      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        assemblyCount={assemblyPostings.length}
        deliverCount={deliverPostings.length}
      />

      <section className="search-section no-print">
        <SearchBar
          searchQuery={activeTab === "assembly" ? assemblySearch : deliverSearch}
          onSearchQueryChange={activeTab === "assembly" ? setAssemblySearch : setDeliverSearch}
        />
        {activeTab === "deliver" && (
          <div className="search-actions">
            <CreateShipmentButton
              onClick={() => setIsShipmentDialogOpen(true)}
              disabled={assemblyPostings.length === 0}
            />
          </div>
        )}
      </section>

      <main className="postings-section">
        {loadError && <ErrorMessage message={loadError} onRetry={handleRefresh} />}
        {isLoading && <LoadingSpinner />}

        {activeTab === "assembly" && !isLoadingPostings && !postingsLoadError && (
          <>
            <div className="postings-summary">
              Найдено заданий: {filteredAssembly.length}
              {assemblySearch && ` (из ${assemblyPostings.length})`}
            </div>
            <PostingsList postings={filteredAssembly} />
          </>
        )}

        {activeTab === "deliver" && !isLoadingDeliver && !deliverLoadError && (
          <>
            <div className="postings-summary">
              Групп отгрузок: {filteredGroups.length}
              {deliverSearch && ` (найдено по запросу)`}
            </div>
            <ShipmentGroupsList groups={filteredGroups} assignedDates={assignedDates} />
          </>
        )}
      </main>

      <CreateShipmentDialog
        isOpen={isShipmentDialogOpen}
        onClose={() => setIsShipmentDialogOpen(false)}
        assemblyPostings={assemblyPostings}
        onCreateShipment={handleCreateShipment}
      />
    </div>
  );
}
