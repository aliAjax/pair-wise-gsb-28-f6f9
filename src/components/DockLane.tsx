import { useDroppable } from "@dnd-kit/core";
import type { Dock, Vehicle } from "../types";
import type { RuleFailure } from "../data/rules";
import { fmtTime } from "../data/rules";
import VehicleCard from "./VehicleCard";

interface Props {
  dock: Dock;
  vehicles: Vehicle[];
  rejections: Record<string, RuleFailure[]>;
  onArrive: (vehicle: Vehicle) => void;
  onSendBack: (vehicle: Vehicle) => void;
  onReassign: (vehicle: Vehicle) => void;
  onComplete: (vehicle: Vehicle) => void;
}

export default function DockLane({ dock, vehicles, rejections, onArrive, onSendBack, onReassign, onComplete }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: dock.id });

  const sorted = [...vehicles].sort((a, b) => a.arrivalAt.localeCompare(b.arrivalAt));
  const arrived = sorted.find((v) => v.status === "已到达");
  const maintenanceSoon = new Date(dock.nextMaintenanceAt).getTime() - Date.now() < 3 * 60 * 60_000;

  return (
    <section ref={setNodeRef} className={`dock-lane ${isOver ? "drop-target" : ""}`}>
      <header className="dock-head">
        <div>
          <h3>{dock.name}</h3>
          <div className="dock-tags">
            {dock.acceptedTemps.map((t) => (
              <span key={t} className="dock-temp">{t}</span>
            ))}
          </div>
        </div>
        <div className="dock-side">
          {arrived && <span className="lock-tag">🔒 {arrived.plate} 装卸中</span>}
          <span className={`maintenance ${maintenanceSoon ? "soon" : ""}`}>
            下次检修：{fmtTime(dock.nextMaintenanceAt)}
          </span>
        </div>
      </header>

      <div className="dock-vehicles">
        {sorted.length === 0 && <div className="lane-empty">把左侧待排车辆拖到这里</div>}
        {sorted.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            dockName={dock.name}
            rejection={rejections[vehicle.id]}
            onArrive={onArrive}
            onSendBack={onSendBack}
            onReassign={onReassign}
            onComplete={onComplete}
          />
        ))}
      </div>
    </section>
  );
}
