import { useState, useEffect, useCallback } from "react";
import { useArticleSearch } from "../hooks/useArticleSearch";
import { useGroupSearch } from "../hooks/useGroupSearch";
import { fetchMyGroups } from "../services/adminApiService";
import { SearchBar } from "../components/SearchBar";
import { ShipmentGroupsList } from "../components/ShipmentGroupsList";
import { LoadingSpinner } from "../components/LoadingSpinner";
import "../App.css";

export function UserPage({ user, onLogout }) {
	const [groups, setGroups] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	const loadGroups = useCallback(() => {
		setIsLoading(true);
		setError(null);
		fetchMyGroups()
			.then((data) => {
				setGroups(data.groups || []);
			})
			.catch((err) => {
				setError(err.message);
				setGroups([]);
			})
			.finally(() => {
				setIsLoading(false);
			});
	}, []);

	useEffect(() => {
		loadGroups();
	}, [loadGroups]);

	const {
		searchQuery,
		setSearchQuery,
	} = useArticleSearch([]);

	const filteredGroups = useGroupSearch(groups, searchQuery);

	return (
		<div className="app-container">
			<header className="app-header">
				<h1 className="app-title">Заказы OZON (FBS)</h1>
				<div className="app-header-actions">
					<button
						className="refresh-button"
						onClick={loadGroups}
						disabled={isLoading}
						type="button"
						title="Обновить"
						style={{ marginRight: '8px' }}
					>
						{isLoading ? "..." : "↻"}
					</button>
					<span style={{ fontSize: '14px', color: '#6b7280', marginRight: '12px' }}>
						{user?.name || user?.login}
					</span>
					<button
						className="admin-logout-button"
						onClick={onLogout}
						type="button"
					>
						Выйти
					</button>
				</div>
			</header>

			<section className="search-section no-print">
				<SearchBar
					searchQuery={searchQuery}
					onSearchQueryChange={setSearchQuery}
				/>
			</section>

			<main className="postings-section">
				{isLoading && <LoadingSpinner />}

				{error && !isLoading && (
					<div className="error-message">
						{error}
						<button onClick={loadGroups} type="button">Повторить</button>
					</div>
				)}

				{!isLoading && !error && (
					<>
						<div className="postings-summary">
							Назначенных групп: {filteredGroups.length}
							{searchQuery && ` (найдено по запросу)`}
						</div>
						{filteredGroups.length === 0 ? (
							<div className="empty-state">
								{groups.length === 0
									? "Вам пока не назначены заказы"
									: "По вашему запросу ничего не найдено"
								}
							</div>
						) : (
							<ShipmentGroupsList
								groups={filteredGroups}
								isUserMode={true}
							/>
						)}
					</>
				)}
			</main>
		</div>
	);
}
