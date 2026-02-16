import { formatGroupDate, formatShipmentDate } from "../utils/formatters";

export function ShipmentGroupCard({ group, onClick, isAssigned }) {
  const groupName = formatGroupDate(group.shipmentDate);
  const shipmentInfo = formatShipmentDate(group.shipmentDate);
  const ordersCount = group.count;

  return (
    <div className={`shipment-group-card ${isAssigned ? "shipment-group-card--assigned" : ""}`} onClick={onClick}>
      <div className="shipment-group-header">
        <div className="shipment-group-info">
          <div className="shipment-group-name">
            {groupName}
            {isAssigned && <span className="status-badge status-badge--in-progress">В работе</span>}
          </div>
          {shipmentInfo && (
            <div className="shipment-group-date">{shipmentInfo}</div>
          )}
        </div>
        <div className="shipment-group-count">
          <span className="count-badge">{ordersCount}</span>
        </div>
      </div>
    </div>
  );
}
