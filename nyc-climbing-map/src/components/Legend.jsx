export default function Legend({ lineSystems, description, selectedLineId, onSelectLine }) {
  return (
    <aside className="w-80 shrink-0 bg-white border-l border-black overflow-y-auto">
      <div className="px-8 py-10 space-y-10">
        {description && (
          <p className="text-sm text-gray-700 leading-relaxed pb-2 border-b border-gray-200">
            {description}
          </p>
        )}

        <div className="flex items-center gap-3 text-sm">
          <span className="relative flex h-3 w-3 shrink-0">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: "#FF3B30" }}
            />
            <span
              className="relative inline-flex rounded-full h-3 w-3"
              style={{ backgroundColor: "#FF3B30" }}
            />
          </span>
          <span className="text-gray-700">Upcoming comps</span>
        </div>

        {Object.entries(lineSystems)
          .filter(([tierId]) => tierId !== "region")
          .map(([tierId, tier]) => (
            <div key={tierId}>
              <div className="mb-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  {tier.label}
                </h2>
                {tier.subtitle && (
                  <p className="text-xs text-gray-400 italic mt-0.5">{tier.subtitle}</p>
                )}
              </div>
              <ul className="space-y-2">
                {(tier.lines ?? []).map((line) => {
                  const isSelected = line.id === selectedLineId;
                  return (
                    <li key={line.id}>
                      <button
                        onClick={() => onSelectLine(isSelected ? null : line.id)}
                        className={`flex items-center gap-2.5 text-sm w-full text-left px-2 py-1.5 rounded transition-colors ${
                          isSelected ? "bg-gray-100 font-semibold" : "hover:bg-gray-100"
                        }`}
                        style={{ cursor: "pointer" }}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: line.color ?? "#999" }}
                        />
                        {line.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {lineSystems.region && (
            <div>
              <div className="mb-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  {lineSystems.region.label}
                </h2>
                {lineSystems.region.description && (
                  <p className="text-xs text-gray-400 italic mt-0.5">
                    {lineSystems.region.description}
                  </p>
                )}
              </div>
              <ul className="space-y-2">
                {lineSystems.region.lines
                  .filter((r) => r.id !== "nyc-metro")
                  .map((r) => {
                    const isSelected = r.id === selectedLineId;
                    return (
                      <li key={r.id}>
                        <button
                          onClick={() => onSelectLine(isSelected ? null : r.id)}
                          className={`flex items-center gap-2.5 text-sm w-full text-left px-2 py-1.5 rounded transition-colors ${
                            isSelected ? "bg-gray-100 font-semibold" : "hover:bg-gray-100"
                          }`}
                          style={{ cursor: "pointer" }}
                        >
                          <svg width="16" height="12" className="shrink-0">
                            <line
                              x1="0" y1="6" x2="16" y2="6"
                              stroke="black"
                              strokeWidth="2"
                              strokeDasharray={r.connectionStyle === "dashed" ? "3 2" : "0"}
                            />
                          </svg>
                          {r.name}
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
      </div>
    </aside>
  );
}