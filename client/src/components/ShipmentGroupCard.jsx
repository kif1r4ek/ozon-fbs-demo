import { formatGroupDate } from "../utils/formatters";

export function ShipmentGroupCard({ group, onClick }) {
  const groupName = formatGroupDate(group.shipmentDate);
  const ordersCount = group.count;

  return (
    <div className="shipment-group-card" onClick={onClick}>
      <div className="shipment-group-header">
        <div className="shipment-group-info">
          <div className="shipment-group-name">{groupName}</div>
          <div className="shipment-group-date">{group.shipmentDate}</div>
        </div>
        <div className="shipment-group-count">
          <span className="count-badge">{ordersCount}</span>
        </div>
      </div>
    </div>
  );
}
