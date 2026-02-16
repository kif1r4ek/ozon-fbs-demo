export function ShowLabelsButton({ onClick, isLoading, showLabels, disabled }) {
  return (
    <button
      className="show-labels-button"
      onClick={onClick}
      disabled={isLoading || disabled}
    >
      {isLoading ? "Загрузка..." : showLabels ? "Скрыть этикетки" : "Показать этикетки"}
    </button>
  );
}
