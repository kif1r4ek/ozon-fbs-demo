import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAssemblyPostings } from "../hooks/useAssemblyPostings";
import { useAwaitingDeliverPostings } from "../hooks/useAwaitingDeliverPostings";
import { useArticleSearch } from "../hooks/useArticleSearch";
import { useShipmentGroups } from "../hooks/useShipmentGroups";
import { useGroupSearch } from "../hooks/useGroupSearch";
import { SearchBar } from "../components/SearchBar";
import { RefreshButton } from "../components/RefreshButton";
import { ExportXlsxButton } from "../components/ExportXlsxButton";
import { CreateShipmentButton } from "../components/CreateShipmentButton";
import { CreateShipmentDialog } from "../components/CreateShipmentDialog";
import { downloadDeliverSheet, createFolderInS3 } from "../services/assemblyApiService";
import { PostingsList } from "../components/PostingsList";
import { ShipmentGroupsList } from "../components/ShipmentGroupsList";
import { TabBar } from "../components/TabBar";
import { ErrorMessage } from "../components/ErrorMessage";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { generateShipmentNumber } from "../utils/shipmentUtils";
import "../App.css";

export function AdminPage() {
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState("assembly");
	const [isShipmentDialogOpen, setIsShipmentDialogOpen] = useState(false);

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
		filteredPostings: filteredDeliver,
	} = useArticleSearch(deliverPostings);

	// Группируем заказы по shipmentDate
	const shipmentGroups = useShipmentGroups(deliverPostings);

	// Фильтруем группы по поисковому запросу
	const filteredGroups = useGroupSearch(shipmentGroups, deliverSearch);

	const isLoading = activeTab === "assembly" ? isLoadingPostings : isLoadingDeliver;
	const loadError = activeTab === "assembly" ? postingsLoadError : deliverLoadError;
	const handleRefresh = activeTab === "assembly" ? refreshPostings : refreshDeliverPostings;

	const handleCreateShipment = async ({ date, postings }) => {
		try {
			// Генерируем уникальный QR-код поставки
			const shipmentNumber = generateShipmentNumber();

			// Создаем папку в S3 с датой и QR-кодом поставки
			await createFolderInS3(date, shipmentNumber);

			// Получаем postingNumbers для удаления из сборки
			const postingNumbersToMove = new Set(postings.map((p) => p.postingNumber));

			// Удаляем из assemblyPostings
			const updatedAssembly = assemblyPostings.filter(
				(p) => !postingNumbersToMove.has(p.postingNumber)
			);
			setAssemblyPostings(updatedAssembly);

			// Добавляем shipmentDate и shipmentNumber к каждому posting
			const postingsWithShipment = postings.map(p => ({
				...p,
				shipmentDate: date,
				shipmentNumber: shipmentNumber
			}));
			setDeliverPostings([...deliverPostings, ...postingsWithShipment]);

			// Закрываем диалог
			setIsShipmentDialogOpen(false);
		} catch (error) {
			console.error("Ошибка при создании поставки:", error);
			alert(`Ошибка при создании поставки: ${error.message}`);
		}
	};

	const handleGoToUser = () => {
		navigate('/user');
	};

	return (
		<div className="app-container">
			<header className="app-header">
				<h1 className="app-title">Заказы OZON (FBS) - Админ</h1>
				<div className="app-header-actions">
					<button
						className="user-page-button"
						onClick={handleGoToUser}
						type="button"
						title="Перейти на страницу пользователя"
					>
						Пользователь
					</button>
					<RefreshButton
						onRefresh={handleRefresh}
						isLoading={isLoading}
					/>
					{activeTab === "deliver" && (
						<ExportXlsxButton
							onDownload={downloadDeliverSheet}
							label="Лист отгрузки"
							title="Скачать лист отгрузки в Excel"
						/>
					)}
				</div>
			</header>

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
				{loadError && (
					<ErrorMessage
						message={loadError}
						onRetry={handleRefresh}
					/>
				)}

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
						<ShipmentGroupsList groups={filteredGroups} />
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
