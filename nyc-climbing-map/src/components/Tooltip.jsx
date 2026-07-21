export default function Tooltip({ station, width, height, scale, lineLookup }) {
  const BUBBLE_W = 200 / scale;
  const BUBBLE_H = 80 / scale; // taller to fit the line-bullet row
  const GAP = 18 / scale;
  const TAIL = 9 / scale;
  const fontScale = 1 / scale;
  const ICON_R = 8 * fontScale;

  const placeAbove = station.y - GAP - BUBBLE_H > 0;
  const bubbleY = placeAbove ? station.y - GAP - BUBBLE_H : station.y + GAP;
  const bubbleX = Math.max(8, Math.min(width - BUBBLE_W - 8, station.x - BUBBLE_W / 2));
  const tailX = Math.max(bubbleX + TAIL + 4, Math.min(bubbleX + BUBBLE_W - TAIL - 4, station.x));
  const tailBaseY = placeAbove ? bubbleY + BUBBLE_H : bubbleY;
  const tailTipY = placeAbove ? tailBaseY + TAIL : tailBaseY - TAIL;
  const tailPath = `M ${tailX - TAIL} ${tailBaseY} L ${tailX} ${tailTipY} L ${tailX + TAIL} ${tailBaseY} Z`;

  const iconSpacing = ICON_R * 2 + 8 * fontScale;

  return (
    <g style={{ pointerEvents: "none" }}>
      <rect x={bubbleX} y={bubbleY} width={BUBBLE_W} height={BUBBLE_H} rx={6 * fontScale}
        fill="white" stroke="black" strokeWidth={1.5 * fontScale} />
      <path d={tailPath} fill="white" stroke="black" strokeWidth={1.5 * fontScale} />
      <rect x={tailX - TAIL} y={placeAbove ? bubbleY + BUBBLE_H - 1 * fontScale : bubbleY}
        width={TAIL * 2} height={2 * fontScale} fill="white" />

      {/* Line bullets — one circle + short label per line running through this station */}
      <g transform={`translate(${bubbleX + 12 * fontScale + ICON_R}, ${bubbleY + 18 * fontScale})`}>
        {station.lines.map((lineId, i) => {
          const line = lineLookup?.[lineId];
          if (!line) return null;
          return (
            <g key={lineId} transform={`translate(${i * iconSpacing}, 0)`}>
              <circle r={ICON_R} fill={line.color} stroke="white" strokeWidth={1 * fontScale} />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={9 * fontScale}
                fontWeight="700"
                fill="white"
              >
                {line.shortLabel}
              </text>
            </g>
          );
        })}
      </g>

      <text x={bubbleX + 12 * fontScale} y={bubbleY + 55 * fontScale} fontSize={11 * fontScale} fill="#666">
        {station.neighborhood}, {station.borough}
      </text>
      {/* <text x={bubbleX + 12 * fontScale} y={bubbleY + 73 * fontScale} fontSize={11 * fontScale} fill="#666">
        {station.types.map((t) => t.type).join(" · ")}
      </text> */}
    </g>
  );
}