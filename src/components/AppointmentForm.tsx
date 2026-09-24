import { FormEvent, useState } from "react";
import type { CargoTemp, Vehicle } from "../types";
import { BOOKING_RULES } from "../data/rules";

interface Props {
  onAdd: (vehicle: Vehicle) => void;
}

function defaultArrival(): string {
  const d = new Date(Date.now() + 60 * 60_000);
  d.setMinutes(0, 0, 0);
  // datetime-local 需要本地时间格式
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AppointmentForm({ onAdd }: Props) {
  const [plate, setPlate] = useState("");
  const [carrier, setCarrier] = useState("");
  const [arrivalAt, setArrivalAt] = useState(defaultArrival);
  const [temp, setTemp] = useState<CargoTemp>("常温");
  const [durationMin, setDurationMin] = useState(60);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAdd({
      id: crypto.randomUUID(),
      plate: plate.trim(),
      carrier: carrier.trim(),
      arrivalAt: new Date(arrivalAt).toISOString(),
      temp,
      durationMin: Math.max(1, durationMin),
      status: "待排",
      dockId: null,
      events: [{ at: new Date().toISOString(), type: "新建", detail: "预约创建，等待排入月台" }],
    });
    setPlate("");
    setCarrier("");
    setArrivalAt(defaultArrival());
    setTemp("常温");
    setDurationMin(60);
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <h2>新增车辆预约</h2>
      <div className="form-grid">
        <label>
          车牌号
          <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="如 粤A·12345" required />
        </label>
        <label>
          承运商
          <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="如 顺丰冷链" required />
        </label>
        <label>
          到车时间
          <input type="datetime-local" value={arrivalAt} onChange={(e) => setArrivalAt(e.target.value)} required />
        </label>
        <label>
          货温
          <select value={temp} onChange={(e) => setTemp(e.target.value as CargoTemp)}>
            {BOOKING_RULES.cargoTemps.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          预计占用（分钟）
          <input
            type="number"
            min={10}
            step={5}
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            required
          />
        </label>
        <button type="submit">加入待排区</button>
      </div>
    </form>
  );
}
