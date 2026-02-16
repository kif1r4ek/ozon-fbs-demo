export function CreateShipmentButton({ onClick, disabled = false }) {
  return (
    <button
      className="create-shipment-button"
      onClick={onClick}
      disabled={disabled}
      title="Создать новую поставку"
    >
      Создать отгрузку
    </button>
  );
}
