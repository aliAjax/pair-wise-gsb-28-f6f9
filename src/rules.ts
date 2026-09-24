import type { Appointment, CargoTemp, Dock } from "./types";
import { formatDateTime, formatTime } from "./utils";

/**
 * 预约规则（单独维护）
 * 间隔分钟数、冷链口径、校验逻辑与提示文案都集中在这里，
 * 页面只负责调用 checkAssignment 并展示未通过的条件。
 */
export const bookingRules = {
  /** 同一月台前后两车至少间隔的分钟数 */
  minGapMinutes: 10,
  /** 属于冷链的货温 */
  coldChainTemps: ["冷藏", "冷冻"] as CargoTemp[],
};

export type RuleCode = "TEMP_MISMATCH" | "GAP_TOO_SMALL" | "MAINTENANCE_CONFLICT";

export interface RuleViolation {
  code: RuleCode;
  message: string;
}

export function isColdChain(temp: CargoTemp): boolean {
  return bookingRules.coldChainTemps.includes(temp);
}

export interface TimeSlot {
  start: number;
  end: number;
}

/** 车辆实际占用月台的时间段：已到车按实际到车时间算，否则按计划到车时间 */
export function occupancySlot(
  appt: Pick<Appointment, "arrivalAt" | "durationMin" | "actualArrivalAt">
): TimeSlot {
  const start = new Date(appt.actualArrivalAt ?? appt.arrivalAt).getTime();
  return { start, end: start + appt.durationMin * 60_000 };
}

/**
 * 校验车辆能否进入指定月台。
 * @param dockAppointments 该月台上仍在占位的其他车辆（已排 / 已到达）
 * @returns 未通过的条件列表，空数组表示放行
 */
export function checkAssignment(
  appt: Pick<Appointment, "plateNo" | "cargoTemp" | "arrivalAt" | "durationMin" | "actualArrivalAt">,
  dock: Dock,
  dockAppointments: Appointment[],
  rules: typeof bookingRules = bookingRules
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  // 1. 货温匹配：冷链车不能进常温口
  if (!dock.acceptedTemps.includes(appt.cargoTemp)) {
    const ambientOnly = dock.acceptedTemps.every((temp) => temp === "常温");
    violations.push({
      code: "TEMP_MISMATCH",
      message:
        ambientOnly && isColdChain(appt.cargoTemp)
          ? `冷链车不能进常温口（${dock.name}只接常温货）`
          : `货温不符：${dock.name}可接${dock.acceptedTemps.join("、")}，该车为${appt.cargoTemp}`,
    });
  }

  // 2. 同一月台前后车至少留 minGapMinutes 分钟
  const slot = occupancySlot(appt);
  const minGapMs = rules.minGapMinutes * 60_000;
  for (const other of dockAppointments) {
    const otherSlot = occupancySlot(other);
    const gap =
      slot.end <= otherSlot.start
        ? otherSlot.start - slot.end
        : otherSlot.end <= slot.start
          ? slot.start - otherSlot.end
          : -1; // 时段重叠
    if (gap < minGapMs) {
      violations.push({
        code: "GAP_TOO_SMALL",
        message: `间隔不足${rules.minGapMinutes}分钟：与${other.plateNo}（${formatTime(other.arrivalAt)}起）冲突`,
      });
    }
  }

  // 3. 占用结束时间不能超过检修开始时间
  const maintenanceAt = new Date(dock.nextMaintenanceAt).getTime();
  if (slot.end > maintenanceAt) {
    violations.push({
      code: "MAINTENANCE_CONFLICT",
      message: `超过检修开始时间：${dock.name} ${formatDateTime(dock.nextMaintenanceAt)} 起检修`,
    });
  }

  return violations;
}
