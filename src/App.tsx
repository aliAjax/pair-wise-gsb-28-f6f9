import { useMemo, useState } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import type { Vehicle } from "./types";
import { DOCKS } from "./data/docks";
import { BOOKING_RULES, checkAssignment, fmtTime, type RuleFailure } from "./data/rules";
import { loadVehicles, saveVehicles } from "./data/storage";
import AppointmentForm from "./components/AppointmentForm";
import DockLane from "./components/DockLane";
import VehicleCard from "./components/VehicleCard";
import ReassignModal from "./components/ReassignModal";
import HistoryPanel from "./components/HistoryPanel";

const POOL_ID = "pool";

interface Rejection {
  dockName: string;
  failures: RuleFailure[];
  at: string;
}

function nowEvent(type: Vehicle["events"][number]["type"], detail: string) {
  return { at: new Date().toISOString(), type, detail };
}

/** 待排区（可拖回） */
function Pool({ vehicles, rejections, onRemove }: {
  vehicles: Vehicle[];
  rejections: Record<string, RuleFailure[]>;
  onRemove: (v: Vehicle) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: POOL_ID });
  const sorted = [...vehicles].sort((a, b) => a.arrivalAt.localeCompare(b.arrivalAt));
  return (
    <section ref={setNodeRef} className={`pool ${isOver ? "drop-target" : ""}`}>
      <h2>待排区（{sorted.length}）</h2>
      <p className="pool-hint">把车辆拖到右侧月台；同月台前后车至少留 {BOOKING_RULES.minGapMinutes} 分钟</p>
      <div className="pool-list">
        {sorted.length === 0 && <div className="empty">待排区已清空</div>}
        {sorted.map((v) => (
          <VehicleCard key={v.id} vehicle={v} rejection={rejections[v.id]} onRemove={onRemove} />
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(loadVehicles);
  const [rejections, setRejections] = useState<Record<string, RuleFailure[]>>({});
  const [banner, setBanner] = useState<{ plate: string; rejection: Rejection } | null>(null);
  const [reassigning, setReassigning] = useState<Vehicle | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function update(next: Vehicle[]) {
    setVehicles(next);
    saveVehicles(next);
  }

  function patchVehicle(id: string, patch: Partial<Vehicle>, event?: Vehicle["events"][number]) {
    update(
      vehicles.map((v) =>
        v.id === id ? { ...v, ...patch, events: event ? [...v.events, event] : v.events } : v
      )
    );
  }

  /** 该月台上仍占用时段的车辆（已排 + 已到达） */
  function dockActiveVehicles(dockId: string, excludeId?: string) {
    return vehicles.filter(
      (v) => v.dockId === dockId && v.id !== excludeId && (v.status === "已排" || v.status === "已到达")
    );
  }

  function attemptAssign(vehicle: Vehicle, dockId: string) {
    const dock = DOCKS.find((d) => d.id === dockId);
    if (!dock) return;
    const failures = checkAssignment(vehicle, dock, dockActiveVehicles(dockId, vehicle.id));
    if (failures.length > 0) {
      // 被挡：回到待排区，并指出未通过的条件
      setRejections((prev) => ({ ...prev, [vehicle.id]: failures }));
      setBanner({ plate: vehicle.plate, rejection: { dockName: dock.name, failures, at: new Date().toISOString() } });
      if (vehicle.dockId !== null || vehicle.status !== "待排") {
        patchVehicle(vehicle.id, { dockId: null, status: "待排" }, nowEvent("退回", `排入 ${dock.name} 被挡：${failures.map((f) => f.message).join("；")}`));
      }
      return;
    }
    setRejections((prev) => {
      const next = { ...prev };
      delete next[vehicle.id];
      return next;
    });
    setBanner(null);
    const from = DOCKS.find((d) => d.id === vehicle.dockId)?.name;
    patchVehicle(
      vehicle.id,
      { dockId, status: "已排" },
      nowEvent("排入", from && from !== dock.name ? `由 ${from} 改排至 ${dock.name}` : `排入 ${dock.name}`)
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const vehicle = vehicles.find((v) => v.id === event.active.id);
    if (!vehicle || !event.over) return;
    if (event.over.id === POOL_ID) {
      if (vehicle.status === "已排") {
        patchVehicle(vehicle.id, { dockId: null, status: "待排" }, nowEvent("退回", "调度退回待排区"));
      }
      return;
    }
    attemptAssign(vehicle, String(event.over.id));
  }

  function handleArrive(vehicle: Vehicle) {
    const dockName = DOCKS.find((d) => d.id === vehicle.dockId)?.name ?? "";
    patchVehicle(
      vehicle.id,
      { status: "已到达", actualArrivalAt: new Date().toISOString() },
      nowEvent("到达", `车辆到达 ${dockName}，月台锁定`)
    );
  }

  function handleReassignConfirm(dockId: string, reason: string, actualArrivalAt: string) {
    if (!reassigning) return;
    const from = DOCKS.find((d) => d.id === reassigning.dockId)?.name ?? "原月台";
    const to = DOCKS.find((d) => d.id === dockId)?.name ?? dockId;
    patchVehicle(
      reassigning.id,
      { dockId, actualArrivalAt },
      nowEvent("改口", `由 ${from} 改至 ${to}，原时段已释放；原因：${reason}；实际到车 ${fmtTime(actualArrivalAt)}`)
    );
    setReassigning(null);
  }

  function handleComplete(vehicle: Vehicle) {
    const dockName = DOCKS.find((d) => d.id === vehicle.dockId)?.name ?? "";
    patchVehicle(vehicle.id, { status: "已完成" }, nowEvent("完成", `装卸完成，${dockName} 释放`));
  }

  const metrics = useMemo(() => {
    const pending = vehicles.filter((v) => v.status === "待排").length;
    const scheduled = vehicles.filter((v) => v.status === "已排").length;
    const lockedDocks = new Set(vehicles.filter((v) => v.status === "已到达").map((v) => v.dockId)).size;
    const done = vehicles.filter((v) => v.status === "已完成").length;
    return [
      { label: "待排车辆", value: pending },
      { label: "已排待到达", value: scheduled },
      { label: "锁定月台", value: lockedDocks },
      { label: "已完成车次", value: done },
    ];
  }, [vehicles]);

  const poolVehicles = vehicles.filter((v) => v.status === "待排");

  return (
    <main className="app">
      <div className="shell wide">
        <header className="topbar">
          <div>
            <p className="eyebrow">物流行业前端最小闭环</p>
            <h1>装卸月台看板</h1>
            <p className="subtitle">
              车辆预约排入月台：同月台前后车至少留 {BOOKING_RULES.minGapMinutes} 分钟，冷链车不能进常温口，超过检修开始时间不放行。
            </p>
          </div>
          <div className="stack">
            {["React", "Vite", "TypeScript", "dnd-kit"].map((item) => (
              <span className="tag" key={item}>{item}</span>
            ))}
          </div>
        </header>

        <section className="metrics four">
          {metrics.map((m) => (
            <article className="metric" key={m.label}>
              <span>{m.label}</span>
              <strong>{m.value}</strong>
            </article>
          ))}
        </section>

        {banner && (
          <div className="block-banner">
            <div>
              <strong>⛔ {banner.plate} 未能排入 {banner.rejection.dockName}，已回到待排区：</strong>
              <ul>
                {banner.rejection.failures.map((f, i) => (
                  <li key={i}>{f.message}</li>
                ))}
              </ul>
            </div>
            <button className="secondary" type="button" onClick={() => setBanner(null)}>知道了</button>
          </div>
        )}

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <section className="board">
            <aside className="side">
              <AppointmentForm onAdd={(v) => update([v, ...vehicles])} />
              <Pool vehicles={poolVehicles} rejections={rejections} onRemove={(v) => update(vehicles.filter((x) => x.id !== v.id))} />
            </aside>
            <div className="lanes">
              {DOCKS.map((dock) => (
                <DockLane
                  key={dock.id}
                  dock={dock}
                  vehicles={vehicles.filter((v) => v.dockId === dock.id && (v.status === "已排" || v.status === "已到达"))}
                  rejections={rejections}
                  onArrive={handleArrive}
                  onSendBack={(v) => patchVehicle(v.id, { dockId: null, status: "待排" }, nowEvent("退回", "调度退回待排区"))}
                  onReassign={setReassigning}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          </section>
        </DndContext>

        <HistoryPanel
          vehicles={vehicles}
          docks={DOCKS}
          onClear={() => update(vehicles.filter((v) => v.status !== "已完成"))}
        />
      </div>

      {reassigning && (
        <ReassignModal
          vehicle={reassigning}
          docks={DOCKS}
          vehicles={vehicles}
          onClose={() => setReassigning(null)}
          onConfirm={handleReassignConfirm}
        />
      )}
    </main>
  );
}
