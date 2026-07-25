export default function Legend({ lineSystems, description, selectedLineId, onSelectLine }) {
  return (
    <aside className="w-80 shrink-0 bg-white border-l border-black overflow-y-auto">
      <div className="p-6 space-y-8">
        <p className="text-sm text-gray-700 leading-relaxed">{description}</p>

        {Object.entries(lineSystems).map(([tierId, tier]) => (
          tier.label !== "Region" && (
            <div key={tierId}>
            <h2 className="text-xs font-bold uppercase tracking-wide mb-2 text-gray-500">
              {tier.label}
            </h2>
            <ul className="space-y-1.5">
              {(tier.lines ?? []).map((line) => {
                const isSelected = line.id === selectedLineId;
                return (
                  <li key={line.id}>
                    <button
                      onClick={() => onSelectLine(isSelected ? null : line.id)}
                      className={`flex items-center gap-2 text-sm w-full text-left px-1.5 py-1 rounded transition-colors ${
                        isSelected ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"
                      }`}
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
          )
            
        ))}
      </div>
    </aside>
  );
}