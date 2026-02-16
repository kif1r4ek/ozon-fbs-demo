import { useState } from "react";
import { ShipmentGroupCard } from "./ShipmentGroupCard";
import { ShipmentGroupModal } from "./ShipmentGroupModal";

export function ShipmentGroupsList({ groups, isUserMode = false }) {
  const [selectedGroup, setSelectedGroup] = useState(null);

  if (groups.length === 0) {
    return (
      <div className="empty-state">
        Групп отгрузок не найдено
      </div>
    );
  }

  return (
    <>
      <div className="shipment-groups-container">
        <div className="shipment-groups-header">
          <div className="header-col">ПОСТАВКА</div>
          <div className="header-col">КОЛ-ВО ЗАКАЗОВ</div>
        </div>
        <div className="shipment-groups-list">
          {groups.map((group) => (
            <ShipmentGroupCard
              key={group.shipmentDate}
              group={group}
              onClick={() => setSelectedGroup(group)}
            />
          ))}
        </div>
      </div>

      {selectedGroup && (
        <ShipmentGroupModal
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
          isUserMode={isUserMode}
        />
      )}
    </>
  );
}
