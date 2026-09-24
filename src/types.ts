export type CargoTemp = "常温" | "冷藏" | "冷冻";

export type VehicleStatus = "待排" | "已排" | "已到达" | "已完成";

/** 月台资料（在 data/docks.ts 中维护） */
export interface Dock {
  id: string;
  name: string;
  /** 可接货温 */
  acceptedTemps: CargoTemp[];
  /** 下一次检修开始时间（ISO），检修开始后不再放行 */
  nextMaintenanceAt: string;
}

export type VehicleEventType = "新建" | "排入" | "退回" | "到达" | "改口" | "完成";

export interface VehicleEvent {
  at: string;
  type: VehicleEventType;
  detail: string;
}

/** 车辆预约 */
export interface Vehicle {
  id: string;
  plate: string;
  /** 承运商 */
  carrier: string;
  /** 计划到车时间（ISO） */
  arrivalAt: string;
  /** 货温 */
  temp: CargoTemp;
  /** 预计占用分钟 */
  durationMin: number;
  status: VehicleStatus;
  dockId: string | null;
  /** 实际到车时间（ISO），到达登记 / 改口时填写 */
  actualArrivalAt?: string;
  events: VehicleEvent[];
}
