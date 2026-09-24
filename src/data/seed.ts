import type { Vehicle, VehicleEvent } from "../types";

function minutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function event(type: VehicleEvent["type"], detail: string, at?: string): VehicleEvent {
  return { at: at ?? new Date().toISOString(), type, detail };
}

/** 初始演示数据，首次加载时写入 localStorage */
export function seedVehicles(): Vehicle[] {
  return [
    {
      id: "seed-1",
      plate: "粤A·1001",
      carrier: "顺丰冷链",
      arrivalAt: minutesFromNow(120),
      temp: "冷藏",
      durationMin: 45,
      status: "待排",
      dockId: null,
      events: [event("新建", "预约创建，等待排入月台")],
    },
    {
      id: "seed-2",
      plate: "沪B·2002",
      carrier: "中通物流",
      arrivalAt: minutesFromNow(90),
      temp: "常温",
      durationMin: 60,
      status: "待排",
      dockId: null,
      events: [event("新建", "预约创建，等待排入月台")],
    },
    {
      id: "seed-3",
      plate: "苏C·3003",
      carrier: "京东物流",
      arrivalAt: minutesFromNow(180),
      temp: "冷冻",
      durationMin: 50,
      status: "待排",
      dockId: null,
      events: [event("新建", "预约创建，等待排入月台")],
    },
    {
      id: "seed-4",
      plate: "粤D·4004",
      carrier: "圆通速递",
      arrivalAt: minutesFromNow(300),
      temp: "常温",
      durationMin: 40,
      status: "待排",
      dockId: null,
      events: [event("新建", "预约创建，等待排入月台")],
    },
    {
      id: "seed-5",
      plate: "浙E·5005",
      carrier: "德邦快递",
      arrivalAt: minutesFromNow(60),
      temp: "常温",
      durationMin: 45,
      status: "已排",
      dockId: "dock-1",
      events: [event("新建", "预约创建"), event("排入", "排入 1号月台")],
    },
    {
      id: "seed-6",
      plate: "闽F·6006",
      carrier: "顺丰冷链",
      arrivalAt: minutesFromNow(150),
      temp: "冷冻",
      durationMin: 60,
      status: "已排",
      dockId: "dock-3",
      events: [event("新建", "预约创建"), event("排入", "排入 3号月台·冷链")],
    },
    {
      id: "seed-7",
      plate: "皖G·7007",
      carrier: "中通物流",
      arrivalAt: minutesFromNow(-30),
      actualArrivalAt: minutesFromNow(-35),
      temp: "常温",
      durationMin: 75,
      status: "已到达",
      dockId: "dock-2",
      events: [
        event("新建", "预约创建"),
        event("排入", "排入 2号月台"),
        event("到达", "车辆到达，月台锁定", minutesFromNow(-35)),
      ],
    },
    {
      id: "seed-8",
      plate: "京H·8008",
      carrier: "德邦快递",
      arrivalAt: minutesFromNow(-240),
      actualArrivalAt: minutesFromNow(-245),
      temp: "常温",
      durationMin: 50,
      status: "已完成",
      dockId: "dock-1",
      events: [
        event("新建", "预约创建"),
        event("排入", "排入 1号月台"),
        event("到达", "车辆到达，月台锁定", minutesFromNow(-245)),
        event("完成", "装卸完成，月台释放", minutesFromNow(-195)),
      ],
    },
  ];
}
