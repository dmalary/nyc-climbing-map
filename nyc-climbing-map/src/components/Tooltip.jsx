import { TIER_ORDER } from "../constants.js";

// Rough Helvetica-ish average character width factor — not pixel-exact,
// but good enough to size a bubble without needing canvas text measurement.
const CHAR_WIDTH_FACTOR = 0.56;
const estimateTextWidth = (text, fontSize) => text.length * fontSize * CHAR_WIDTH_FACTOR;

export default function Tooltip({ station, width, height, scale, lineLookup }) {
  const hasComp = station.comps?.active && station.comps?.source;

  const fontScale = 1 / scale;
  const PADDING = 12 * fontScale;
  const ROW_GAP = 8 * fontScale;
  const GAP = 18 * fontScale;
  const TAIL = 9 * fontScale;

  const NAME_FONT = 13 * fontScale;
  const SUBTEXT_FONT = 11 * fontScale;
  const ICON_R = 8 * fontScale;
  const ICON_FONT = 9 * fontScale;
  const CHAR_GAP = ICON_FONT * 0.6;
  const GROUP_GAP = CHAR_GAP * 2;
  const iconSpacing = ICON_R * 2 + 8 * fontScale;

  const orderedLines = [...station.lines]
    .filter((id) => lineLookup?.[id])
    .sort((a, b) => TIER_ORDER[lineLookup[a].tierId] - TIER_ORDER[lineLookup[b].tierId]);

  let cursorX = 0;
  const positioned = orderedLines.map((lineId, i) => {
    const line = lineLookup[lineId];
    const prevLine = i > 0 ? lineLookup[orderedLines[i - 1]] : null;
    if (i > 0) {
      cursorX += iconSpacing;
      if (prevLine.tierId !== line.tierId) cursorX += GROUP_GAP;
    }
    return { lineId, line, x: cursorX };
  });
  const iconsRowWidth = positioned.length ? cursorX + ICON_R * 2 : 0;

  const neighborhoodText = `${station.neighborhood}, ${station.borough}`;
  const compText = hasComp ? `${station.comps.eventName ?? "Upcoming comp"} →` : "";

  // Rows: each has a height and a rendered content width, used to size the bubble
  const rows = [
    { height: NAME_FONT * 1.2, width: estimateTextWidth(station.name, NAME_FONT) },
    { height: ICON_R * 2, width: iconsRowWidth },
    { height: SUBTEXT_FONT * 1.2, width: estimateTextWidth(neighborhoodText, SUBTEXT_FONT) },
  ];
  if (hasComp) {
    rows.push({ height: SUBTEXT_FONT * 1.2, width: estimateTextWidth(compText, SUBTEXT_FONT) });
  }

  const contentWidth = Math.max(...rows.map((r) => r.width));
  const BUBBLE_W = Math.min(280, Math.max(150, contentWidth + PADDING * 2));
  const BUBBLE_H = PADDING * 2 + rows.reduce((sum, r) => sum + r.height, 0) + ROW_GAP * (rows.length - 1);

  const placeAbove = station.y - GAP - BUBBLE_H > 0;
  const bubbleY = placeAbove ? station.y - GAP - BUBBLE_H : station.y + GAP;
  const bubbleX = Math.max(8, Math.min(width - BUBBLE_W - 8, station.x - BUBBLE_W / 2));
  const tailX = Math.max(bubbleX + TAIL + 4, Math.min(bubbleX + BUBBLE_W - TAIL - 4, station.x));
  const tailBaseY = placeAbove ? bubbleY + BUBBLE_H : bubbleY;
  const tailTipY = placeAbove ? tailBaseY + TAIL : tailBaseY - TAIL;
  const tailPath = `M ${tailX - TAIL} ${tailBaseY} L ${tailX} ${tailTipY} L ${tailX + TAIL} ${tailBaseY} Z`;

  // Walk rows to get each one's baseline y, top-down from PADDING
  let cursorY = bubbleY + PADDING;
  const rowY = rows.map((r, i) => {
    const baseline = cursorY + r.height * 0.8; // approximate text baseline within its row
    cursorY += r.height + ROW_GAP;
    return baseline;
  });

  return (
    <g style={{ pointerEvents: "none" }}>
      <rect x={bubbleX} y={bubbleY} width={BUBBLE_W} height={BUBBLE_H} rx={6 * fontScale}
        fill="white" stroke="black" strokeWidth={1.5 * fontScale} />
      <path d={tailPath} fill="white" stroke="black" strokeWidth={1.5 * fontScale} />
      <rect x={tailX - TAIL} y={placeAbove ? bubbleY + BUBBLE_H - 1 * fontScale : bubbleY}
        width={TAIL * 2} height={2 * fontScale} fill="white" />

      <text x={bubbleX + PADDING} y={rowY[0]} fontSize={NAME_FONT} fontWeight="700">
        {station.name}
      </text>

      <g transform={`translate(${bubbleX + PADDING + ICON_R}, ${rowY[1]})`}>
        {positioned.map(({ lineId, line, x }) => (
          <g key={lineId} transform={`translate(${x}, 0)`}>
            <circle r={ICON_R} fill={line.color} stroke="white" strokeWidth={1 * fontScale} />
            <text textAnchor="middle" dominantBaseline="central" fontSize={ICON_FONT} fontWeight="700" fill="white">
              {line.shortLabel}
            </text>
          </g>
        ))}
      </g>

      <text x={bubbleX + PADDING} y={rowY[2]} fontSize={SUBTEXT_FONT} fill="#666">
        {neighborhoodText}
      </text>

      {hasComp && (
        <text
          x={bubbleX + PADDING}
          y={rowY[3]}
          fontSize={SUBTEXT_FONT}
          fontWeight="700"
          fill="#C0392B"
          textDecoration="underline"
        >
          {compText}
        </text>
      )}
    </g>
  );
}