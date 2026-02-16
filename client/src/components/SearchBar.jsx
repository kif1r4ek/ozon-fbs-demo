export function SearchBar({ searchQuery, onSearchQueryChange }) {
  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Поиск по артикулу, названию или SKU..."
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
        className="search-input"
      />
      {searchQuery && (
        <button
          className="search-clear-button"
          onClick={() => onSearchQueryChange("")}
          title="Очистить поиск"
        >
          &times;
        </button>
      )}
    </div>
  );
}
