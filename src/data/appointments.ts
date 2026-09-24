import type { Appointment } from "../types";

/**
 * 车辆预约演示数据（首次打开或本地数据缺失时使用）。
 * 到车时间按打开页面的时间相对生成，保证看板规则演示始终有效。
 */
function at(hours: number, minutes = 0): string {
  return new Date(Date.now() + hours * 3_600_000 + minutes * 60_000).toISOString();
}

export function seedAppointments(): Appointment[] {
  const base = { notes: "", changeLogs: [] };
  return [
    {
      ...base,
      id: "seed-1",
      plateNo: "苏E·D8214",
      carrier: "顺陆物流",
      cargoTemp: "常温",
      arrivalAt: at(1),
      durationMin: 45,
      status: "已排",
      dockId: "dock-1",
      createdAt: at(-3),
    },
    {
      ...base,
      id: "seed-2",
      plateNo: "沪C·33920",
      carrier: "中集冷运",
      cargoTemp: "冷藏",
      arrivalAt: at(3),
      durationMin: 60,
      status: "已排",
      dockId: "dock-3",
      createdAt: at(-4),
    },
    {
      ...base,
      id: "seed-3",
      plateNo: "沪A·66F88",
      carrier: "德邦快递",
      cargoTemp: "常温",
      arrivalAt: at(0, -30),
      durationMin: 45,
      status: "已到达",
      dockId: "dock-2",
      actualArrivalAt: at(0, -30),
      createdAt: at(-5),
    },
    {
      ...base,
      id: "seed-4",
      plateNo: "浙A·77D10",
      carrier: "顺丰冷运",
      cargoTemp: "冷冻",
      arrivalAt: at(2),
      durationMin: 50,
      status: "待排",
      dockId: null,
      notes: "晚班到货，需冷链口",
      createdAt: at(-2),
    },
    {
      ...base,
      id: "seed-5",
      plateNo: "苏B·5T678",
      carrier: "安能物流",
      cargoTemp: "常温",
      arrivalAt: at(1, 30),
      durationMin: 40,
      status: "待排",
      dockId: null,
      createdAt: at(-1),
    },
    {
      ...base,
      id: "seed-6",
      plateNo: "皖K·90213",
      carrier: "京东物流",
      cargoTemp: "冷藏",
      arrivalAt: at(4),
      durationMin: 55,
      status: "待排",
      dockId: null,
      createdAt: at(-1),
    },
    {
      ...base,
      id: "seed-7",
      plateNo: "闽D·20244",
      carrier: "圆通速递",
      cargoTemp: "常温",
      arrivalAt: at(-20),
      durationMin: 45,
      status: "已完成",
      dockId: "dock-1",
      actualArrivalAt: at(-20),
      completedAt: at(-19),
      createdAt: at(-26),
    },
  ];
}
