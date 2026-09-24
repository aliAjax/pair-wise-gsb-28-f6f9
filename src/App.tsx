import { CSSProperties, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Appointment, AppointmentStatus, CargoTemp, ChangeLog, Dock } from "./types";
import { docks, getDock } from "./data/docks";
import { seedAppointments } from "./data/appointments";
import { bookingRules, checkAssignment, occupancySlot } from "./rules";
import { formatDateTime, formatTime, fromNowLabel, toLocalInputValue } from "./utils";

const STORAGE_KEY = "hxwlfront-14-dock-board";
const WAITING_ID = "waiting-area";
/** 仍占用月台资源的状态 */
const OCCUPYING: AppointmentStatus[] = ["已排", "已到达"];
const CARGO_TEMPS: CargoTemp[] = ["常温", "冷藏", "冷冻"];

const tempClass: Record<CargoTemp, string> = { 常温: "ambient", 冷藏: "chilled", 冷冻: "frozen" };
const statusClass: Record<AppointmentStatus, string> = {
  待排: "wait",
  已排: "planned",
  已到达: "arrived",
  已完成: "done",
};

function loadAppointments(): Appointment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Appointment[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // 本地数据损坏时回退到演示数据
  }
  return seedAppointments();
}

interface AppointmentForm {
  plateNo: string;
  carrier: string;
  arrivalAt: string;
  cargoTemp: CargoTemp;
  durationMin: number;
  notes: string;
}

function createBlankForm(): AppointmentForm {
  return {
    plateNo: "",
    carrier: "",
    arrivalAt: toLocalInputValue(new Date(Date.now() + 3_600_000)),
    cargoTemp: "常温",
    durationMin: 45,
    notes: "",
  };
}

interface ReDockState {
  apptId: string;
  dockId: string;
  reason: string;
  actualArrivalAt: string;
  errors: string[];
}

function TempTag({ temp }: { temp: CargoTemp }) {
  return <span className={`temp-tag ${tempClass[temp]}`}>{temp}</span>;
}

function StatusChip({ status }: { status: AppointmentStatus }) {
  return <span className={`status-chip ${statusClass[status]}`}>{status}</span>;
}

interface CardActions {
  onArrive: (appt: Appointment) => void;
  onComplete: (appt: Appointment) => void;
  onReDock: (appt: Appointment) => void;
  onDelete: (appt: Appointment) => void;
}

function AppointmentCard({ appt, actions }: { appt: Appointment; actions: CardActions }) {
  const slot = occupancySlot(appt);
  const endIso = new Date(slot.end).toISOString();
  const locked = appt.status === "已到达";
  return (
    <article className={`appt-card${locked ? " locked" : ""}`}>
      <div className="appt-head">
        <strong>{appt.plateNo}</strong>
        <StatusChip status={appt.status} />
      </div>
      <div className="appt-meta">
        <span>{appt.carrier}</span>
        <TempTag temp={appt.cargoTemp} />
        <span>占{appt.durationMin}分钟</span>
      </div>
      <div className="appt-time">
        {formatDateTime(appt.arrivalAt)} 起 · 至 {formatTime(endIso)}
      </div>
      {locked && appt.actualArrivalAt && (
        <div className="appt-time actual">实际到车 {formatDateTime(appt.actualArrivalAt)}</div>
      )}
      {appt.notes && <p className="appt-note">{appt.notes}</p>}
      {appt.lastReject && (
        <div className="reject-badge">
          <strong>未进入{appt.lastReject.dockName}，未通过条件：</strong>
          <ul>
            {appt.lastReject.messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="appt-actions">
        {appt.status === "已排" && (
          <button type="button" onClick={() => actions.onArrive(appt)}>
            到达
          </button>
        )}
        {locked && (
          <>
            <button type="button" className="secondary" onClick={() => actions.onReDock(appt)}>
              改口
            </button>
            <button type="button" onClick={() => actions.onComplete(appt)}>
              完成
            </button>
          </>
        )}
        {appt.status === "待排" && (
          <button type="button" className="danger" onClick={() => actions.onDelete(appt)}>
            删除
          </button>
        )}
      </div>
    </article>
  );
}

function DraggableAppointment({ appt, children }: { appt: Appointment; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: appt.id });
  const style: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    touchAction: "none",
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`draggable${isDragging ? " dragging" : ""}`}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}

function DockLane({
  dock,
  appts,
  actions,
}: {
  dock: Dock;
  appts: Appointment[];
  actions: CardActions;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dock.id });
  const lockedNow = appts.some((appt) => appt.status === "已到达");
  return (
    <section ref={setNodeRef} className={`dock-lane${isOver ? " over" : ""}${lockedNow ? " locked" : ""}`}>
      <header className="dock-head">
        <div className="dock-title">
          <h3>{dock.name}</h3>
          {lockedNow && <span className="lock-badge">🔒 已锁定</span>}
        </div>
        <div className="dock-tags">
          可接货温
          {dock.acceptedTemps.map((temp) => (
            <TempTag key={temp} temp={temp} />
          ))}
        </div>
        <p className="dock-maintenance">
          下次检修 {formatDateTime(dock.nextMaintenanceAt)}（{fromNowLabel(dock.nextMaintenanceAt)}）
        </p>
      </header>
      <div className="dock-body">
        {appts.length === 0 ? (
          <div className="empty-lane">暂无预约，把车辆拖到这里</div>
        ) : (
          appts.map((appt) =>
            appt.status === "已到达" ? (
              <AppointmentCard key={appt.id} appt={appt} actions={actions} />
            ) : (
              <DraggableAppointment key={appt.id} appt={appt}>
                <AppointmentCard appt={appt} actions={actions} />
              </DraggableAppointment>
            )
          )
        )}
      </div>
    </section>
  );
}

function WaitingArea({ appts, actions }: { appts: Appointment[]; actions: CardActions }) {
  const { setNodeRef, isOver } = useDroppable({ id: WAITING_ID });
  return (
    <section ref={setNodeRef} className={`panel waiting-area${isOver ? " over" : ""}`}>
      <div className="toolbar">
        <h2>待排区（{appts.length}）</h2>
        <span className="hint">拖到右侧月台排班，拖回这里取消排口</span>
      </div>
      <div className="waiting-list">
        {appts.length === 0 ? (
          <div className="empty">待排区已清空</div>
        ) : (
          appts.map((appt) => (
            <DraggableAppointment key={appt.id} appt={appt}>
              <AppointmentCard appt={appt} actions={actions} />
            </DraggableAppointment>
          ))
        )}
      </div>
    </section>
  );
}

export default function App() {
  const [appointments, setAppointments] = useState<Appointment[]>(loadAppointments);
  const [form, setForm] = useState<AppointmentForm>(createBlankForm);
  const [notice, setNotice] = useState<{ kind: "ok" | "warn"; text: string } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reDock, setReDock] = useState<ReDockState | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 8000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const waiting = useMemo(
    () =>
      appointments
        .filter((appt) => appt.status === "待排")
        .sort((a, b) => occupancySlot(a).start - occupancySlot(b).start),
    [appointments]
  );

  const history = useMemo(
    () =>
      appointments
        .filter((appt) => appt.status === "已完成")
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
    [appointments]
  );

  const apptsByDock = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const dock of docks) map.set(dock.id, []);
    for (const appt of appointments) {
      if (appt.dockId && OCCUPYING.includes(appt.status)) {
        map.get(appt.dockId)?.push(appt);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => occupancySlot(a).start - occupancySlot(b).start);
    }
    return map;
  }, [appointments]);

  const metrics = [
    { label: "待排车辆", value: waiting.length },
    { label: "已排月台", value: appointments.filter((appt) => appt.status === "已排").length },
    { label: "锁定月台", value: appointments.filter((appt) => appt.status === "已到达").length },
    { label: "已完成", value: history.length },
  ];

  const activeAppt = activeId ? appointments.find((appt) => appt.id === activeId) : undefined;

  function commit(next: Appointment[]) {
    setAppointments(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function patch(id: string, changes: Partial<Appointment>) {
    commit(appointments.map((appt) => (appt.id === id ? { ...appt, ...changes } : appt)));
  }

  function dockOccupants(dockId: string, excludeId?: string) {
    return appointments.filter(
      (appt) => appt.dockId === dockId && appt.id !== excludeId && OCCUPYING.includes(appt.status)
    );
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const appt = appointments.find((item) => item.id === active.id);
    if (!appt || appt.status === "已到达") return;

    // 拖回待排区：取消排口，原时段立即释放
    if (over.id === WAITING_ID) {
      if (appt.dockId) {
        patch(appt.id, { dockId: null, status: "待排", lastReject: undefined });
        setNotice({ kind: "ok", text: `${appt.plateNo} 已退回待排区，原时段已释放` });
      }
      return;
    }

    const dock = getDock(String(over.id));
    if (!dock || appt.dockId === dock.id) return;

    const violations = checkAssignment(appt, dock, dockOccupants(dock.id, appt.id));
    if (violations.length > 0) {
      // 被挡：车辆留在待排区/原月台，并记录未通过的条件
      patch(appt.id, {
        lastReject: {
          dockName: dock.name,
          messages: violations.map((violation) => violation.message),
          at: new Date().toISOString(),
        },
      });
      setNotice({
        kind: "warn",
        text: `${appt.plateNo} 被挡在${dock.name}外：${violations.map((violation) => violation.message).join("；")}`,
      });
      return;
    }

    patch(appt.id, { dockId: dock.id, status: "已排", lastReject: undefined });
    setNotice({ kind: "ok", text: `${appt.plateNo} 已排入${dock.name}` });
  }

  function handleArrive(appt: Appointment) {
    const now = new Date().toISOString();
    patch(appt.id, { status: "已到达", actualArrivalAt: now });
    setNotice({ kind: "ok", text: `${appt.plateNo} 已到达，${getDock(appt.dockId)?.name ?? "月台"}已锁定` });
  }

  function handleComplete(appt: Appointment) {
    patch(appt.id, { status: "已完成", completedAt: new Date().toISOString() });
    setNotice({ kind: "ok", text: `${appt.plateNo} 作业完成，月台已释放，车辆转入历史` });
  }

  function handleDelete(appt: Appointment) {
    commit(appointments.filter((item) => item.id !== appt.id));
  }

  function openReDock(appt: Appointment) {
    setReDock({
      apptId: appt.id,
      dockId: "",
      reason: "",
      actualArrivalAt: toLocalInputValue(new Date()),
      errors: [],
    });
  }

  function submitReDock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reDock) return;
    const appt = appointments.find((item) => item.id === reDock.apptId);
    if (!appt) return;
    const fail = (errors: string[]) => setReDock({ ...reDock, errors });

    const target = getDock(reDock.dockId);
    if (!target) return fail(["请选择新月台"]);
    if (target.id === appt.dockId) return fail(["该车已在该月台，无需改口"]);
    const reason = reDock.reason.trim();
    if (!reason) return fail(["请登记改口原因"]);
    if (!reDock.actualArrivalAt) return fail(["请登记实际到车时间"]);

    // 改口同样要过预约规则：按实际到车时间校验新月台
    const actualIso = new Date(reDock.actualArrivalAt).toISOString();
    const candidate = { ...appt, arrivalAt: actualIso, actualArrivalAt: actualIso };
    const violations = checkAssignment(candidate, target, dockOccupants(target.id, appt.id));
    if (violations.length > 0) return fail(violations.map((violation) => violation.message));

    const log: ChangeLog = {
      at: new Date().toISOString(),
      fromDockId: appt.dockId,
      toDockId: target.id,
      reason,
      actualArrivalAt: actualIso,
    };
    patch(appt.id, {
      dockId: target.id,
      arrivalAt: actualIso,
      actualArrivalAt: actualIso,
      changeLogs: [...appt.changeLogs, log],
      lastReject: undefined,
    });
    setNotice({
      kind: "ok",
      text: `${appt.plateNo} 已改口至${target.name}，原${getDock(log.fromDockId)?.name ?? "月台"}时段立即释放`,
    });
    setReDock(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const appt: Appointment = {
      id: crypto.randomUUID(),
      plateNo: form.plateNo.trim(),
      carrier: form.carrier.trim(),
      arrivalAt: new Date(form.arrivalAt).toISOString(),
      cargoTemp: form.cargoTemp,
      durationMin: Number(form.durationMin),
      status: "待排",
      dockId: null,
      notes: form.notes.trim(),
      createdAt: new Date().toISOString(),
      changeLogs: [],
    };
    commit([appt, ...appointments]);
    setForm(createBlankForm());
    setNotice({ kind: "ok", text: `${appt.plateNo} 已加入待排区` });
  }

  const cardActions: CardActions = {
    onArrive: handleArrive,
    onComplete: handleComplete,
    onReDock: openReDock,
    onDelete: handleDelete,
  };

  const reDockAppt = reDock ? appointments.find((appt) => appt.id === reDock.apptId) : undefined;

  return (
    <main className="app">
      <div className="shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">物流行业前端最小闭环</p>
            <h1>装卸月台看板</h1>
            <p className="subtitle">
              晚班到货车辆统一排口：把待排车辆拖进月台，系统自动校验前后车间隔、货温匹配与检修时间；
              被挡车辆回到待排区并标明未通过条件，车辆到达后锁定月台。
            </p>
          </div>
          <div className="stack">
            <span className="tag">前后车≥{bookingRules.minGapMinutes}分钟</span>
            <span className="tag">冷链不进常温口</span>
            <span className="tag">检修前必须离场</span>
          </div>
        </header>

        {notice && (
          <div className={`notice ${notice.kind}`} role="status">
            <span>{notice.text}</span>
            <button type="button" className="notice-close" onClick={() => setNotice(null)}>
              ×
            </button>
          </div>
        )}

        <section className="metrics">
          {metrics.map((metric) => (
            <article className="metric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </section>

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <section className="board">
            <div className="side">
              <form className="panel" onSubmit={handleSubmit}>
                <h2>新增车辆预约</h2>
                <div className="form-grid">
                  <label>
                    车牌号
                    <input
                      value={form.plateNo}
                      required
                      placeholder="如 苏E·D8214"
                      onChange={(event) => setForm({ ...form, plateNo: event.target.value })}
                    />
                  </label>
                  <label>
                    承运商
                    <input
                      value={form.carrier}
                      required
                      placeholder="如 顺陆物流"
                      onChange={(event) => setForm({ ...form, carrier: event.target.value })}
                    />
                  </label>
                  <label>
                    到车时间
                    <input
                      type="datetime-local"
                      value={form.arrivalAt}
                      required
                      onChange={(event) => setForm({ ...form, arrivalAt: event.target.value })}
                    />
                  </label>
                  <label>
                    货温
                    <select
                      value={form.cargoTemp}
                      onChange={(event) => setForm({ ...form, cargoTemp: event.target.value as CargoTemp })}
                    >
                      {CARGO_TEMPS.map((temp) => (
                        <option key={temp}>{temp}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    预计占用（分钟）
                    <input
                      type="number"
                      min={10}
                      step={5}
                      value={form.durationMin}
                      required
                      onChange={(event) => setForm({ ...form, durationMin: Number(event.target.value) })}
                    />
                  </label>
                  <label>
                    备注
                    <textarea
                      value={form.notes}
                      placeholder="选填"
                      onChange={(event) => setForm({ ...form, notes: event.target.value })}
                    />
                  </label>
                  <button type="submit">加入待排区</button>
                </div>
              </form>

              <WaitingArea appts={waiting} actions={cardActions} />
            </div>

            <div className="dock-grid">
              {docks.map((dock) => (
                <DockLane
                  key={dock.id}
                  dock={dock}
                  appts={apptsByDock.get(dock.id) ?? []}
                  actions={cardActions}
                />
              ))}
            </div>
          </section>

          <DragOverlay>
            {activeAppt ? (
              <div className="drag-overlay-card">
                <strong>{activeAppt.plateNo}</strong>
                <span>
                  {activeAppt.carrier} · {activeAppt.cargoTemp} · 占{activeAppt.durationMin}分钟
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <section className="panel history-panel">
          <div className="toolbar">
            <h2>历史（已完成车辆）</h2>
            {history.length > 0 && (
              <button
                type="button"
                className="secondary"
                onClick={() => commit(appointments.filter((appt) => appt.status !== "已完成"))}
              >
                清空历史
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="empty">暂无完成记录</div>
          ) : (
            <div className="history-list">
              {history.map((appt) => (
                <article className="history-item" key={appt.id}>
                  <div className="history-head">
                    <strong>{appt.plateNo}</strong>
                    <span>{appt.carrier}</span>
                    <TempTag temp={appt.cargoTemp} />
                    <button
                      type="button"
                      className="danger small"
                      onClick={() => commit(appointments.filter((item) => item.id !== appt.id))}
                    >
                      移除
                    </button>
                  </div>
                  <div className="history-meta">
                    {getDock(appt.dockId)?.name ?? "未排口"} · 到车{" "}
                    {formatDateTime(appt.actualArrivalAt ?? appt.arrivalAt)} · 完成{" "}
                    {appt.completedAt ? formatDateTime(appt.completedAt) : "-"}
                  </div>
                  {appt.changeLogs.length > 0 && (
                    <ul className="change-logs">
                      {appt.changeLogs.map((log, index) => (
                        <li key={index}>
                          改口 {getDock(log.fromDockId)?.name ?? "待排区"}→{getDock(log.toDockId)?.name}：
                          {log.reason}（实际到车 {formatDateTime(log.actualArrivalAt)}）
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {reDock && reDockAppt && (
          <div className="modal-mask" onClick={() => setReDock(null)}>
            <div className="modal" onClick={(event) => event.stopPropagation()}>
              <h3>改口登记 · {reDockAppt.plateNo}</h3>
              <p className="modal-sub">
                当前月台：{getDock(reDockAppt.dockId)?.name ?? "-"}，确认改口后原时段立即释放。
              </p>
              <form className="form-grid" onSubmit={submitReDock}>
                <label>
                  新月台
                  <select
                    value={reDock.dockId}
                    required
                    onChange={(event) => setReDock({ ...reDock, dockId: event.target.value })}
                  >
                    <option value="">请选择</option>
                    {docks.map((dock) => (
                      <option key={dock.id} value={dock.id}>
                        {dock.name}（可接{dock.acceptedTemps.join("、")}）
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  实际到车时间
                  <input
                    type="datetime-local"
                    value={reDock.actualArrivalAt}
                    required
                    onChange={(event) => setReDock({ ...reDock, actualArrivalAt: event.target.value })}
                  />
                </label>
                <label>
                  改口原因
                  <textarea
                    value={reDock.reason}
                    required
                    placeholder="如：原月台设备故障 / 司机排队时间过长"
                    onChange={(event) => setReDock({ ...reDock, reason: event.target.value })}
                  />
                </label>
                {reDock.errors.length > 0 && (
                  <div className="modal-errors">
                    {reDock.errors.map((error) => (
                      <p key={error}>· {error}</p>
                    ))}
                  </div>
                )}
                <div className="modal-actions">
                  <button type="button" className="secondary" onClick={() => setReDock(null)}>
                    取消
                  </button>
                  <button type="submit">确认改口</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
