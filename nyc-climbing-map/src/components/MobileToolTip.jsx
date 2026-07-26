import { TIER_ORDER } from "../constants.js";

export default function MobileToolTip({ station, lineLookup, onClose }) {
  const hasComp = station.comps?.active && station.comps?.source;

  const orderedLines = [...station.lines]
    .filter((id) => lineLookup?.[id])
    .sort((a, b) => TIER_ORDER[lineLookup[a].tierId] - TIER_ORDER[lineLookup[b].tierId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl w-full max-w-lg p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="font-bold text-lg">{station.name}</h2>
            <p className="text-sm text-gray-500">{station.neighborhood}, {station.borough}</p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none px-2" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {orderedLines.map((lineId) => {
            const line = lineLookup[lineId];
            return (
              <span
                key={lineId}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full text-white"
                style={{ backgroundColor: line.color }}
              >
                {line.shortLabel}
                <span className="font-normal opacity-90">{line.name}</span>
              </span>
            );
          })}
        </div>

        {hasComp && (
          <a
            href={station.comps.source}
            target="_blank"
            rel="noreferrer"
            className="block text-sm underline text-red-600 font-semibold"
          >
            {station.comps.eventName ?? "Upcoming comp"} →
          </a>
        )}
      </div>
    </div>
  );
}