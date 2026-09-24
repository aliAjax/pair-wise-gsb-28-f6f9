import type { CargoTemp, Dock, Vehicle } from "../types";

/**
 * 预约规则：间隔、货温、检修等约束只在这个文件维护。
 */
export const BOOKING_RULES = {
  /** 同一月台前后两辆车的最小间隔（分钟） */
  minGapMinutes: 10,
  /** 全部货温选项 */
  cargoTemps: ["常温", "冷藏", "冷冻"] as CargoTemp[],
  /** 冷链货温（不能进常温口） */
  coldChainTemps: ["冷藏", "冷冻"] as CargoTemp[],
};

export interface RuleFailure {
  code: "temp" | "gap" | "maintenance";
  message: string;
}

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtClock(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 车辆占用月台的时间窗口 [start, end] */
export function vehicleWindow(vehicle: Vehicle): { start: Date; end: Date } {
  const start = new Date(vehicle.arrivalAt);
  const end = new Date(start.getTime() + vehicle.durationMin * 60_000);
  return { start, end };
}

/**
 * 校验车辆能否排入指定月台。
 * @param dockVehicles 该月台当前已排/已到达的其他车辆
 * @returns 未通过的规则列表，空数组表示放行
 */
export function checkAssignment(vehicle: Vehicle, dock: Dock, dockVehicles: Vehicle[]): RuleFailure[] {
  const failures: RuleFailure[] = [];

  // 规则一：货温匹配，冷链车不能进常温口
  if (!dock.acceptedTemps.includes(vehicle.temp)) {
    const isColdChain = BOOKING_RULES.coldChainTemps.includes(vehicle.temp);
    const dockIsAmbientOnly =
      dock.acceptedTemps.includes("常温") && !dock.acceptedTemps.some((t) => BOOKING_RULES.coldChainTemps.includes(t));
    failures.push({
      code: "temp",
      message:
        isColdChain && dockIsAmbientOnly
          ? `冷链车（${vehicle.temp}）不能进常温口 ${dock.name}`
          : `${dock.name} 不承接${vehicle.temp}货（可接：${dock.acceptedTemps.join("、")}）`,
    });
  }

  // 规则二：预计占用结束时间不能超过检修开始时间
  const { end } = vehicleWindow(vehicle);
  const maintenanceAt = new Date(dock.nextMaintenanceAt);
  if (end.getTime() > maintenanceAt.getTime()) {
    failures.push({
      code: "maintenance",
      message: `预计占用到 ${fmtTime(end.toISOString())}，超过 ${dock.name} 检修开始时间 ${fmtTime(dock.nextMaintenanceAt)}`,
    });
  }

  // 规则三：同一月台前后车至少留 minGapMinutes 分钟
  const a = vehicleWindow(vehicle);
  for (const other of dockVehicles) {
    if (other.id === vehicle.id) continue;
    const b = vehicleWindow(other);
    const gapMs = Math.max(b.start.getTime() - a.end.getTime(), a.start.getTime() - b.end.getTime());
    const gapMin = Math.floor(gapMs / 60_000);
    if (gapMin < BOOKING_RULES.minGapMinutes) {
      failures.push({
        code: "gap",
        message: `与 ${other.plate}（${fmtClock(other.arrivalAt)} 起占用 ${other.durationMin} 分钟）间隔不足 ${BOOKING_RULES.minGapMinutes} 分钟`,
      });
    }
  }

  return failures;
}
