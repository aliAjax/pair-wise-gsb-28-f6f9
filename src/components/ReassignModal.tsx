import { useMemo, useState } from "react";
import type { Dock, Vehicle } from "../types";
import { checkAssignment, fmtTime } from "../data/rules";

interface Props {
  vehicle: Vehicle;
  docks: Dock[];
  vehicles: Vehicle[];
  onClose: () => void;
  onConfirm: (dockId: string, reason: string, actualArrivalAt: string) => void;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 已到达车辆的改口登记：必须填原因和实际到车时间，原时段立即释放 */
export default function ReassignModal({ vehicle, docks, vehicles, onClose, onConfirm }: Props) {
  const currentDock = docks.find((d) => d.id === vehicle.dockId);
  const candidates = docks.filter((d) => d.id !== vehicle.dockId);
  const [dockId, setDockId] = useState("");
  const [reason, setReason] = useState("");
  const [actualArrivalAt, setActualArrivalAt] = useState(
    toLocalInput(vehicle.actualArrivalAt ?? new Date().toISOString())
  );

  const targetDock = docks.find((d) => d.id === dockId);
  const failures = useMemo(() => {
    if (!targetDock) return [];
    const dockVehicles = vehicles.filter(
      (v) => v.dockId === targetDock.id && v.id !== vehicle.id && (v.status === "已排" || v.status === "已到达")
    );
    return checkAssignment(vehicle, targetDock, dockVehicles);
  }, [targetDock, vehicles, vehicle]);

  const canSubmit = Boolean(targetDock) && reason.trim().length > 0 && failures.length === 0;

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>改口登记 · {vehicle.plate}</h2>
        <p className="modal-sub">
          当前：{currentDock?.name ?? "未排入"}（确认改口后原时段立即释放）
        </p>

        <label>
          新月台
          <select value={dockId} onChange={(e) => setDockId(e.target.value)}>
            <option value="">请选择月台</option>
            {candidates.map((dock) => (
              <option key={dock.id} value={dock.id}>
                {dock.name}（可接：{dock.acceptedTemps.join("、")}，检修 {fmtTime(dock.nextMaintenanceAt)}）
              </option>
            ))}
          </select>
        </label>

        {targetDock && failures.length > 0 && (
          <div className="rejection">
            <p>{targetDock.name} 不放行：</p>
            <ul>
              {failures.map((f, i) => (
                <li key={i}>{f.message}</li>
              ))}
            </ul>
          </div>
        )}
        {targetDock && failures.length === 0 && <p className="pass-tip">✓ {targetDock.name} 校验通过，可以改口</p>}

        <label>
          实际到车时间
          <input type="datetime-local" value={actualArrivalAt} onChange={(e) => setActualArrivalAt(e.target.value)} required />
        </label>
        <label>
          改口原因
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="必填，如：原月台设备故障 / 货物温控要求变化" />
        </label>

        <div className="modal-actions">
          <button type="button" disabled={!canSubmit} onClick={() => onConfirm(dockId, reason.trim(), new Date(actualArrivalAt).toISOString())}>
            确认改口
          </button>
          <button className="secondary" type="button" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}
