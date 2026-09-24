import type { Dock } from "../types";

function todayAt(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function tomorrowAt(hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/**
 * 月台资料：增删月台、调整可接货温和检修计划只改这个文件。
 */
export const DOCKS: Dock[] = [
  {
    id: "dock-1",
    name: "1号月台",
    acceptedTemps: ["常温", "冷藏"],
    nextMaintenanceAt: todayAt(22, 0),
  },
  {
    id: "dock-2",
    name: "2号月台",
    acceptedTemps: ["常温"],
    nextMaintenanceAt: tomorrowAt(12, 0),
  },
  {
    id: "dock-3",
    name: "3号月台·冷链",
    acceptedTemps: ["冷藏", "冷冻"],
    nextMaintenanceAt: tomorrowAt(8, 0),
  },
  {
    id: "dock-4",
    name: "4号月台",
    acceptedTemps: ["常温", "冷藏", "冷冻"],
    nextMaintenanceAt: todayAt(18, 0),
  },
];
