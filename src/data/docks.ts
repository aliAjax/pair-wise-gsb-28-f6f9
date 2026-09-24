import type { Dock } from "../types";

/**
 * 月台资料（单独维护）
 * 新增/停用月台、调整可接货温、更新检修计划，只改这个文件。
 * 演示数据的检修时间按打开页面的时间相对生成；接入真实数据时替换为固定 ISO 时间。
 */
function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

export const docks: Dock[] = [
  {
    id: "dock-1",
    name: "1号月台",
    acceptedTemps: ["常温"],
    nextMaintenanceAt: hoursFromNow(9),
  },
  {
    id: "dock-2",
    name: "2号月台",
    acceptedTemps: ["常温"],
    nextMaintenanceAt: hoursFromNow(5),
  },
  {
    id: "dock-3",
    name: "3号月台",
    acceptedTemps: ["冷藏", "冷冻"],
    nextMaintenanceAt: hoursFromNow(12),
  },
  {
    id: "dock-4",
    name: "4号月台",
    acceptedTemps: ["常温", "冷藏", "冷冻"],
    nextMaintenanceAt: hoursFromNow(26),
  },
];

export function getDock(id: string | null | undefined): Dock | undefined {
  return docks.find((dock) => dock.id === id);
}
