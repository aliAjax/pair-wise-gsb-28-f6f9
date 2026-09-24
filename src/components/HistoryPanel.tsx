import type { Dock, Vehicle } from "../types";
import { fmtTime } from "../data/rules";

interface Props {
  vehicles: Vehicle[];
  docks: Dock[];
  onClear: () => void;
}

/** 已完成车辆只保留历史记录 */
export default function HistoryPanel({ vehicles, docks, onClear }: Props) {
  const done = vehicles
    .filter((v) => v.status === "已完成")
    .sort((a, b) => (b.actualArrivalAt ?? "").localeCompare(a.actualArrivalAt ?? ""));

  return (
    <section className="history-panel">
      <div className="toolbar">
        <h2>历史记录（已完成 {done.length} 车次）</h2>
        {done.length > 0 && (
          <button className="secondary" type="button" onClick={onClear}>清空历史</button>
        )}
      </div>
      {done.length === 0 ? (
        <div className="empty">暂无已完成车辆</div>
      ) : (
        <div className="history-list">
          {done.map((v) => {
            const dock = docks.find((d) => d.id === v.dockId);
            return (
              <article className="history-item" key={v.id}>
                <div className="record-head">
                  <p className="record-title">{v.plate} / {v.carrier}</p>
                  <span className="status">已完成</span>
                </div>
                <div className="details">
                  <span>货温：{v.temp}</span>
                  <span>月台：{dock?.name ?? "-"}</span>
                  <span>计划到车：{fmtTime(v.arrivalAt)}</span>
                  <span>实际到车：{v.actualArrivalAt ? fmtTime(v.actualArrivalAt) : "-"}</span>
                </div>
                <ul className="event-log">
                  {v.events.map((e, i) => (
                    <li key={i}>[{fmtTime(e.at)}] {e.type}：{e.detail}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
