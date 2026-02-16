export function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error-message">
      <p>{message}</p>
      {onRetry && (
        <button className="retry-button" onClick={onRetry}>
          Попробовать снова
        </button>
      )}
    </div>
  );
}
