export function TabBar({ activeTab, onTabChange, assemblyCount, deliverCount }) {
  return (
    <div className="tab-bar">
      <button
        className={`tab-button ${activeTab === "assembly" ? "tab-button--active" : ""}`}
        onClick={() => onTabChange("assembly")}
      >
        Ожидают сборки
        {assemblyCount > 0 && (
          <span className="tab-badge">{assemblyCount}</span>
        )}
      </button>
      <button
        className={`tab-button ${activeTab === "deliver" ? "tab-button--active" : ""}`}
        onClick={() => onTabChange("deliver")}
      >
        Ожидают отгрузки
        {deliverCount > 0 && (
          <span className="tab-badge">{deliverCount}</span>
        )}
      </button>
    </div>
  );
}
