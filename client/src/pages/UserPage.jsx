import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { usePublishedGroups } from "../hooks/usePublishedGroups";
import { useArticleSearch } from "../hooks/useArticleSearch";
import { useGroupSearch } from "../hooks/useGroupSearch";
import { SearchBar } from "../components/SearchBar";
import { ShipmentGroupsList } from "../components/ShipmentGroupsList";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { loadTestData, clearTestData, printTestBarcodes } from "../utils/testData";
import "../App.css";

export function UserPage() {
	const navigate = useNavigate();
	const { groups, isLoading, refresh } = usePublishedGroups();
	const [showTestDataPanel, setShowTestDataPanel] = useState(false);

	// Mock режим определяется через переменную окружения
	const isMockMode = import.meta.env.VITE_MOCK_MODE === 'true';

	const {
		searchQuery,
		setSearchQuery,
	} = useArticleSearch([]);  // Для поиска используем пустой массив, т.к. ищем по группам

	const filteredGroups = useGroupSearch(groups, searchQuery);

	const handleGoToAdmin = () => {
		navigate('/admin');
	};

	const handleLoadTestData = () => {
		const success = loadTestData();
		if (success) {
			alert('✅ Тестовые данные загружены! Обновите страницу или подождите немного.');
			setTimeout(() => refresh(), 500);
		} else {
			alert('❌ Ошибка загрузки тестовых данных');
		}
	};

	const handleClearTestData = () => {
		const success = clearTestData();
		if (success) {
			alert('✅ Все данные очищены!');
			setTimeout(() => refresh(), 500);
		} else {
			alert('❌ Ошибка очистки данных');
		}
	};

	const handlePrintBarcodes = () => {
		printTestBarcodes();
		alert('📋 Список баркодов выведен в консоль! Откройте DevTools (F12)');
	};

	return (
		<div className="app-container">
			<header className="app-header">
				<h1 className="app-title">Заказы OZON (FBS) - Пользователь</h1>
				<div className="app-header-actions">
					<button
						className="admin-page-button"
						onClick={handleGoToAdmin}
						type="button"
						title="Перейти на страницу администратора"
					>
						Админ
					</button>
				</div>
			</header>

			<section className="search-section no-print">
				<SearchBar
					searchQuery={searchQuery}
					onSearchQueryChange={setSearchQuery}
				/>

				{/* Панель тестовых данных - только в mock режиме */}
				{isMockMode && (
					<div style={{ marginTop: '10px', textAlign: 'center' }}>
						<button
							onClick={() => setShowTestDataPanel(!showTestDataPanel)}
							style={{
								padding: '6px 12px',
								fontSize: '12px',
								backgroundColor: '#667eea',
								color: 'white',
								border: 'none',
								borderRadius: '6px',
								cursor: 'pointer'
							}}
							type="button"
						>
							{showTestDataPanel ? '▼ Скрыть тестовые данные' : '▶ Показать тестовые данные'}
						</button>
					</div>
				)}

				{isMockMode && showTestDataPanel && (
					<div style={{
						marginTop: '15px',
						padding: '20px',
						backgroundColor: '#f7fafc',
						borderRadius: '10px',
						border: '2px solid #667eea'
					}}>
						<h3 style={{ margin: '0 0 15px 0', color: '#2d3748', fontSize: '16px' }}>
							🧪 Тестовые данные для безошибочной сборки
						</h3>

						<div style={{ marginBottom: '15px', fontSize: '13px', color: '#4a5568' }}>
							Загрузите тестовые заказы с реальными баркодами из МойСклад для полного тестирования функционала.
						</div>

						<div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
							<button
								onClick={handleLoadTestData}
								style={{
									padding: '10px 20px',
									fontSize: '14px',
									backgroundColor: '#48bb78',
									color: 'white',
									border: 'none',
									borderRadius: '8px',
									cursor: 'pointer',
									fontWeight: '600'
								}}
								type="button"
							>
								📥 Загрузить тестовые данные
							</button>

							<button
								onClick={handlePrintBarcodes}
								style={{
									padding: '10px 20px',
									fontSize: '14px',
									backgroundColor: '#4299e1',
									color: 'white',
									border: 'none',
									borderRadius: '8px',
									cursor: 'pointer',
									fontWeight: '600'
								}}
								type="button"
							>
								📋 Показать баркоды
							</button>

							<button
								onClick={handleClearTestData}
								style={{
									padding: '10px 20px',
									fontSize: '14px',
									backgroundColor: '#f56565',
									color: 'white',
									border: 'none',
									borderRadius: '8px',
									cursor: 'pointer',
									fontWeight: '600'
								}}
								type="button"
							>
								🗑️ Очистить все данные
							</button>
						</div>

						<div style={{
							marginTop: '15px',
							padding: '12px',
							backgroundColor: '#e6fffa',
							borderRadius: '8px',
							border: '1px solid #48bb78',
							fontSize: '12px',
							color: '#2d3748'
						}}>
							<strong>💡 Подсказка:</strong> После загрузки откройте любую группу заказов и начните сканировать товары.
							Используйте баркоды из консоли (F12) для ручного ввода.
						</div>
					</div>
				)}
			</section>

			<main className="postings-section">
				{isLoading && <LoadingSpinner />}

				{!isLoading && (
					<>
						<div className="postings-summary">
							Опубликованных групп: {filteredGroups.length}
							{searchQuery && ` (найдено по запросу)`}
						</div>
						{filteredGroups.length === 0 ? (
							<div className="empty-state">
								{groups.length === 0
									? "Нет опубликованных групп отгрузки"
									: "По вашему запросу ничего не найдено"
								}
							</div>
						) : (
							<ShipmentGroupsList
								groups={filteredGroups}
								isUserMode={true}  // Флаг для отключения вкладки "Настройка"
							/>
						)}
					</>
				)}
			</main>
		</div>
	);
}
