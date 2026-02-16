export function RefreshButton({ onRefresh, isLoading }) {
  return (
    <button
      className="refresh-button"
      onClick={onRefresh}
      disabled={isLoading}
      title="Обновить заказы"
    >
      {isLoading ? "Загрузка..." : "Обновить заказы"}
    </button>
  );
}
