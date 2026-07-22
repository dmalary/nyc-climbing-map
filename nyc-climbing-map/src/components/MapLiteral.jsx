import { useMemo, useRef, useState, useEffect } from "react";
import * as d3 from "d3";
import { Delaunay } from "d3";
import Tooltip from "./Tooltip";

const LINE_STROKE_WIDTH = 6;
const TICK_INTERVAL = 24;      // small unlabeled dots
const TICK_RADIUS = 3;
const LABEL_INTERVAL = 60;     // labeled bullets, sparser than plain ticks
const LABEL_RADIUS = 9;
const TERMINUS_RADIUS = 10;
const INITIAL_ZOOM_SCALE = 1.7;
const DIMMED_OPACITY = 0.12;
const SELECTED_OPACITY = 1;
const DEFAULT_OPACITY = 0.85;
const BULLET_OFFSET = 14; 

export default function MapLiteral({
  width,
  height,
  boroughFeatures,
  parkFeatures,
  pathGenerator,
  stations,
  linePaths,
  hoveredId,
  onHoverStation,
  selectedLineId,
  lineLookup
}) {
  const svgRef = useRef(null);
  const [transform, setTransform] = useState(
    d3.zoomIdentity
      .translate(width / 3, height / 2.5)
      .scale(INITIAL_ZOOM_SCALE)
      .translate(-width / 3, -height / 2.5)
  );

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const zoomBehavior = d3
      .zoom()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [width, height]])
      .on("zoom", (event) => setTransform(event.transform));

    svg.call(zoomBehavior);

    const initialTransform = d3.zoomIdentity
      .translate(width / 3, height / 2.5)
      .scale(INITIAL_ZOOM_SCALE)
      .translate(-width / 3, -height / 2.5);

    svg.call(zoomBehavior.transform, initialTransform);

    return () => svg.on(".zoom", null);
  }, [width, height]);

  const voronoi = useMemo(() => {
    const delaunay = Delaunay.from(stations, (d) => d.x, (d) => d.y);
    return delaunay.voronoi([0, 0, width, height]);
  }, [stations, width, height]);

  const hoveredStation = stations.find((s) => s.id === hoveredId) ?? null;

  const lineOpacity = (lineId) => {
    if (!selectedLineId) return DEFAULT_OPACITY;
    return lineId === selectedLineId ? SELECTED_OPACITY : DIMMED_OPACITY;
  };

  const stationOpacity = (station) => {
    if (!selectedLineId) return 1;
    return station.lines.includes(selectedLineId) ? 1 : 0.25;
  };

  function offsetFromPath(atPoint, prevPoint, nextPoint, distance) {
    const dx = nextPoint.x - prevPoint.x;
    const dy = nextPoint.y - prevPoint.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    return { x: atPoint.x + nx * distance, y: atPoint.y + ny * distance };
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full touch-none"
    >
      <rect x={-100} y={0} width={width * 2} height={height} fill="#a8c9d4" />

      <g transform={transform.toString()}>
        <g className="boroughs">
          {boroughFeatures.map((feature, i) => (
            <path
              key={i}
              d={pathGenerator(feature)}
              fill="#e8e2d4"
              stroke="#d4cbb8"
              strokeWidth={1 / transform.k}
            />
          ))}
        </g>

        {/* <g className="parks">
          {parkFeatures.map((feature, i) => (
            <path key={i} d={pathGenerator(feature)} fill="#c3d6a8" fillRule="evenodd" stroke="none" />
          ))}
        </g> */}

        {/* <g className="parks">
          {parkFeatures.map((feature, i) => (
            <path key={i} d={pathGenerator(feature)} fill="none" stroke="#c3d6a8" strokeWidth={2 / transform.k} />
          ))}
        </g> */}

        <g className="lines">
          {linePaths.map((line) => {
            const opacity = lineOpacity(line.id);
            const isSelected = line.id === selectedLineId;

            return (
              <g
                key={line.id}
                style={{ transition: "opacity 200ms ease" }}
                opacity={opacity}
              >
                <path
                  d={line.d}
                  fill="none"
                  stroke={line.color}
                  strokeWidth={(isSelected ? LINE_STROKE_WIDTH + 2 : LINE_STROKE_WIDTH) / transform.k}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                  {/* small unlabeled ticks stay on the path, unchanged */}
                  {line.points
                    .filter((_, i) => i % TICK_INTERVAL === 0 && i % LABEL_INTERVAL !== 0)
                    .map((pt, i) => (
                      <circle key={`tick-${i}`} cx={pt.x} cy={pt.y} r={TICK_RADIUS / transform.k} fill={line.color} />
                    ))}

                  {/* labeled bullets — offset off the path, no stem */}
                  {line.points
                    .map((pt, i) => ({ pt, i }))
                    .filter(({ i }) => i % LABEL_INTERVAL === 0 && i !== 0 && i !== line.points.length - 1)
                    .map(({ pt, i }) => {
                      const prev = line.points[Math.max(0, i - 1)];
                      const next = line.points[Math.min(line.points.length - 1, i + 1)];
                      const offsetPt = offsetFromPath(pt, prev, next, BULLET_OFFSET / transform.k);

                      return (
                        <LineBullet
                          key={`label-${i}`}
                          x={offsetPt.x} y={offsetPt.y}
                          color={line.color} label={line.shortLabel}
                          radius={LABEL_RADIUS} scale={transform.k}
                        />
                      );
                    })}

                  {/* terminus bullets — same offset treatment */}
                  {(() => {
                    const startPt = line.points[0];
                    const startNext = line.points[1];
                    const startOffset = offsetFromPath(startPt, startPt, startNext, BULLET_OFFSET / transform.k);

                    const endPt = line.points[line.points.length - 1];
                    const endPrev = line.points[line.points.length - 2];
                    const endOffset = offsetFromPath(endPt, endPrev, endPt, BULLET_OFFSET / transform.k);

                    return (
                      <>
                        <LineBullet x={startOffset.x} y={startOffset.y} color={line.color} label={line.shortLabel} radius={TERMINUS_RADIUS} scale={transform.k} />
                        <LineBullet x={endOffset.x} y={endOffset.y} color={line.color} label={line.shortLabel} radius={TERMINUS_RADIUS} scale={transform.k} />
                      </>
                    );
                  })()}
              </g>
            );
          })}
        </g>

        <g className="stations" style={{ pointerEvents: "none" }}>
          {stations.map((station) => {
            const lineCount = station.lines.length;
            const isHovered = station.id === hoveredId;
            const { dx, dy } = station.labelOffset ?? { dx: 10, dy: 4 };
            const opacity = stationOpacity(station);
            const pillScale = 1 / Math.sqrt(transform.k);

            let bullet;
            if (lineCount >= 4) {
              bullet = (
                <rect
                  x={-14 * pillScale} 
                  y={-6 * pillScale}
                  width={28 * pillScale} 
                  height={12 * pillScale}
                  rx={6 * pillScale}
                  fill="white"
                  stroke="black"
                  strokeWidth={(isHovered ? 2.5 : 1.8) * pillScale}
                  style={{ transition: "stroke-width 150ms ease" }}
                />
              );
            } else if (lineCount >= 2) {
              bullet = (
                <rect
                  x={-4 * pillScale}
                  y={-4 * pillScale}
                  width={8 * pillScale}
                  height={8 * pillScale}
                  rx={4 * pillScale}
                  fill="white"
                  stroke="black"
                  strokeWidth={isHovered ? 2 : 1.2 * pillScale}
                  style={{ transition: "stroke-width 150ms ease" }}
                />
              );
            } else {
              bullet = (
                <circle
                  r={isHovered ? 5 : 4}
                  fill="black"
                  style={{ transition: "r 150ms ease" }}
                />
              );
            }

            return (
              <g
                key={station.id}
                transform={`translate(${station.x}, ${station.y})`}
                opacity={opacity}
                style={{ transition: "opacity 200ms ease" }}
              >
                {bullet}
                <text
                  x={dx}
                  y={dy}
                  fontSize={11 / transform.k}
                  fontFamily='"Helvetica Neue", Helvetica, Arial, sans-serif'
                  fill="#111"
                >
                  {station.name}
                </text>
              </g>
            );
          })}
        </g>

        <g className="hit-regions">
          {stations.map((station, i) => (
            <path
              key={station.id}
              d={voronoi.renderCell(i)}
              fill="transparent"
              onMouseEnter={() => onHoverStation(station.id)}
              onMouseLeave={() => onHoverStation(null)}
              style={{ cursor: "pointer" }}
            />
          ))}
        </g>

        {hoveredStation && (
          <Tooltip
            station={hoveredStation}
            width={width}
            height={height}
            scale={transform.k}
            lineLookup={lineLookup}
          />
        )}
      </g>
    </svg>
  );
}

// A colored circle with a short text label centered inside — the actual
// "6 train" style bullet from the Vignelli map.
function LineBullet({ x, y, color, label, radius, scale }) {
  const r = radius / scale;
  const fontSize = Math.min(radius * 0.9, radius * 1.4 / Math.max(label.length, 1)) / scale;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle r={r} fill={color} stroke="white" strokeWidth={1.5 / scale} />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight="700"
        fontFamily='"Helvetica Neue", Helvetica, Arial, sans-serif'
        fill="white"
      >
        {label}
      </text>
    </g>
  );
}