import { useState, useEffect } from "react";
import { ShipmentGroupCard } from "./ShipmentGroupCard";
import { ShipmentGroupModal } from "./ShipmentGroupModal";

export function ShipmentGroupsList({ groups, isUserMode = false, assignedDates }) {
  const [selectedShipmentDate, setSelectedShipmentDate] = useState(null);

  // Находим актуальную группу из свежих данных по shipmentDate
  const selectedGroup = selectedShipmentDate
    ? groups.find((g) => g.shipmentDate === selectedShipmentDate) || null
    : null;

  const isSelectedGroupAssigned = selectedGroup
    ? assignedDates?.has(selectedGroup.shipmentDate)
    : false;

  // Если группа пропала после обновления — закрываем модалку
  useEffect(() => {
    if (selectedShipmentDate && !selectedGroup) {
      setSelectedShipmentDate(null);
    }
  }, [selectedShipmentDate, selectedGroup]);

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
              isAssigned={assignedDates?.has(group.shipmentDate)}
              onClick={() => setSelectedShipmentDate(group.shipmentDate)}
            />
          ))}
        </div>
      </div>

      {selectedGroup && (
        <ShipmentGroupModal
          group={selectedGroup}
          onClose={() => setSelectedShipmentDate(null)}
          isUserMode={isUserMode}
          isLocked={isSelectedGroupAssigned}
        />
      )}
    </>
  );
}
