import type { Vehicle } from "../types";
import { seedVehicles } from "./seed";

export const STORAGE_KEY = "hxwlfront-14-dock-board";

export function loadVehicles(): Vehicle[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedVehicles();
  try {
    return JSON.parse(raw) as Vehicle[];
  } catch {
    return seedVehicles();
  }
}

export function saveVehicles(vehicles: Vehicle[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
}
