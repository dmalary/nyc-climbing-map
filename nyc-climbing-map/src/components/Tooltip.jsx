export default function Tooltip({ station, width, height, scale }) {
const BUBBLE_W = 200 / scale;
  const BUBBLE_H = 72 / scale;
  const GAP = 18 / scale;
  const TAIL = 9 / scale;
  const fontScale = 1 / scale;

  const placeAbove = station.y - GAP - BUBBLE_H > 0;
  const bubbleY = placeAbove ? station.y - GAP - BUBBLE_H : station.y + GAP;
  const bubbleX = Math.max(8, Math.min(width - BUBBLE_W - 8, station.x - BUBBLE_W / 2));
  const tailX = Math.max(bubbleX + TAIL + 4, Math.min(bubbleX + BUBBLE_W - TAIL - 4, station.x));
  const tailBaseY = placeAbove ? bubbleY + BUBBLE_H : bubbleY;
  const tailTipY = placeAbove ? tailBaseY + TAIL : tailBaseY - TAIL;
  const tailPath = `M ${tailX - TAIL} ${tailBaseY} L ${tailX} ${tailTipY} L ${tailX + TAIL} ${tailBaseY} Z`;

  return (
    <g style={{ pointerEvents: "none" }}>
      <rect x={bubbleX} y={bubbleY} width={BUBBLE_W} height={BUBBLE_H} rx={6 * fontScale}
        fill="white" stroke="black" strokeWidth={1.5 * fontScale} />
      <path d={tailPath} fill="white" stroke="black" strokeWidth={1.5 * fontScale} />
      <rect x={tailX - TAIL} y={placeAbove ? bubbleY + BUBBLE_H - 1 * fontScale : bubbleY}
        width={TAIL * 2} height={2 * fontScale} fill="white" />

      {/* <text x={bubbleX + 12 * fontScale} y={bubbleY + 20 * fontScale} fontSize={13 * fontScale} fontWeight="700">
        {station.name}
      </text> */}
      <text x={bubbleX + 12 * fontScale} y={bubbleY + 37 * fontScale} fontSize={11 * fontScale} fill="#666">
        {station.neighborhood}, {station.borough}
      </text>
      <text x={bubbleX + 12 * fontScale} y={bubbleY + 55 * fontScale} fontSize={11 * fontScale} fill="#666">
        {station.types.map((t) => t.type).join(" · ")}
      </text>
    </g>
  );
}