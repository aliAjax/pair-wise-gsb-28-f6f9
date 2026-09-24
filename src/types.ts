export type CargoTemp = "常温" | "冷藏" | "冷冻";

export type AppointmentStatus = "待排" | "已排" | "已到达" | "已完成";

/** 月台资料（在 src/data/docks.ts 中维护） */
export interface Dock {
  id: string;
  name: string;
  /** 可接货温 */
  acceptedTemps: CargoTemp[];
  /** 下一次检修开始时间（ISO） */
  nextMaintenanceAt: string;
}

/** 改口登记记录 */
export interface ChangeLog {
  at: string;
  fromDockId: string | null;
  toDockId: string;
  reason: string;
  actualArrivalAt: string;
}

/** 拖入被挡时记录的未通过条件 */
export interface RejectInfo {
  dockName: string;
  messages: string[];
  at: string;
}

/** 车辆预约 */
export interface Appointment {
  id: string;
  plateNo: string;
  /** 承运商 */
  carrier: string;
  /** 计划到车时间（ISO） */
  arrivalAt: string;
  /** 货温 */
  cargoTemp: CargoTemp;
  /** 预计占用分钟 */
  durationMin: number;
  status: AppointmentStatus;
  dockId: string | null;
  notes: string;
  createdAt: string;
  /** 实际到车时间（到达登记 / 改口登记时写入） */
  actualArrivalAt?: string;
  completedAt?: string;
  changeLogs: ChangeLog[];
  lastReject?: RejectInfo;
}
