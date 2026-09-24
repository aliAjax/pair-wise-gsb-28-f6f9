import { useDraggable } from "@dnd-kit/core";
import type { Vehicle } from "../types";
import type { RuleFailure } from "../data/rules";
import { fmtClock, fmtTime, vehicleWindow } from "../data/rules";

const TEMP_CLASS: Record<string, string> = {
  常温: "temp-ambient",
  冷藏: "temp-chilled",
  冷冻: "temp-frozen",
};

interface Props {
  vehicle: Vehicle;
  dockName?: string;
  rejection?: RuleFailure[];
  onArrive?: (vehicle: Vehicle) => void;
  onSendBack?: (vehicle: Vehicle) => void;
  onReassign?: (vehicle: Vehicle) => void;
  onComplete?: (vehicle: Vehicle) => void;
  onRemove?: (vehicle: Vehicle) => void;
}

export default function VehicleCard({ vehicle, dockName, rejection, onArrive, onSendBack, onReassign, onComplete, onRemove }: Props) {
  const locked = vehicle.status === "已到达" || vehicle.status === "已完成";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: vehicle.id,
    disabled: locked,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 30, position: "relative" as const }
    : undefined;

  const { start, end } = vehicleWindow(vehicle);
  const lastEvent = vehicle.events[vehicle.events.length - 1];

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`vehicle-card ${isDragging ? "dragging" : ""} ${locked ? "locked" : ""}`}
      {...listeners}
      {...attributes}
    >
      <div className="vehicle-head">
        <strong>{vehicle.plate}</strong>
        <span className={`temp-tag ${TEMP_CLASS[vehicle.temp]}`}>{vehicle.temp}</span>
        {vehicle.status === "已到达" && <span className="lock-tag">🔒 月台锁定</span>}
      </div>
      <div className="vehicle-meta">
        <span>承运商：{vehicle.carrier}</span>
        <span>到车：{fmtTime(vehicle.arrivalAt)}</span>
        <span>
          占用：{fmtClock(start.toISOString())}–{fmtClock(end.toISOString())}（{vehicle.durationMin} 分钟）
        </span>
        {dockName && <span>月台：{dockName}</span>}
        {vehicle.actualArrivalAt && <span>实际到车：{fmtTime(vehicle.actualArrivalAt)}</span>}
      </div>

      {rejection && rejection.length > 0 && (
        <div className="rejection">
          <p>被挡回待排区，未通过：</p>
          <ul>
            {rejection.map((f, i) => (
              <li key={i}>{f.message}</li>
            ))}
          </ul>
        </div>
      )}

      {lastEvent && <p className="vehicle-event">{lastEvent.type}：{lastEvent.detail}</p>}

      <div className="vehicle-actions" onPointerDown={(e) => e.stopPropagation()}>
        {vehicle.status === "待排" && onRemove && (
          <button className="danger" type="button" onClick={() => onRemove(vehicle)}>删除预约</button>
        )}
        {vehicle.status === "已排" && (
          <>
            {onArrive && <button type="button" onClick={() => onArrive(vehicle)}>车辆到达</button>}
            {onSendBack && (
              <button className="secondary" type="button" onClick={() => onSendBack(vehicle)}>退回待排</button>
            )}
          </>
        )}
        {vehicle.status === "已到达" && (
          <>
            {onReassign && <button type="button" onClick={() => onReassign(vehicle)}>改口登记</button>}
            {onComplete && (
              <button className="secondary" type="button" onClick={() => onComplete(vehicle)}>装卸完成</button>
            )}
          </>
        )}
      </div>
    </article>
  );
}
