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
const INITIAL_ZOOM_SCALE = 1.4;
const DIMMED_OPACITY = 0.12;
const SELECTED_OPACITY = 1;
const DEFAULT_OPACITY = 0.85;

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
      .translate(width / 2, height / 2)
      .scale(INITIAL_ZOOM_SCALE)
      .translate(-width / 2, -height / 2)
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
      .translate(width / 2, height / 2)
      .scale(INITIAL_ZOOM_SCALE)
      .translate(-width / 2, -height / 2);

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

                {/* small unlabeled ticks */}
                {line.points
                  .filter((_, i) => i % TICK_INTERVAL === 0 && i % LABEL_INTERVAL !== 0)
                  .map((pt, i) => (
                    <circle
                      key={`tick-${i}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={TICK_RADIUS / transform.k}
                      fill={line.color}
                    />
                  ))}

                {/* labeled bullets at set intervals */}
                {line.points
                  .filter((_, i) => i % LABEL_INTERVAL === 0)
                  .map((pt, i) => (
                    <LineBullet
                      key={`label-${i}`}
                      x={pt.x}
                      y={pt.y}
                      color={line.color}
                      label={line.shortLabel}
                      radius={LABEL_RADIUS}
                      scale={transform.k}
                    />
                  ))}

                {/* terminus bullets, start + end */}
                <LineBullet
                  x={line.points[0].x}
                  y={line.points[0].y}
                  color={line.color}
                  label={line.shortLabel}
                  radius={TERMINUS_RADIUS}
                  scale={transform.k}
                />
                <LineBullet
                  x={line.points[line.points.length - 1].x}
                  y={line.points[line.points.length - 1].y}
                  color={line.color}
                  label={line.shortLabel}
                  radius={TERMINUS_RADIUS}
                  scale={transform.k}
                />
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

            let bullet;
            if (lineCount >= 4) {
              const pillWidth = 28;
              const pillHeight = 12;
              bullet = (
                <rect
                  x={-pillWidth / 2}
                  y={-pillHeight / 2}
                  width={pillWidth}
                  height={pillHeight}
                  rx={pillHeight / 2}
                  fill="white"
                  stroke="black"
                  strokeWidth={isHovered ? 2.5 : 1.8}
                  style={{ transition: "stroke-width 150ms ease" }}
                />
              );
            } else if (lineCount >= 2) {
              bullet = (
                <rect
                  x={-4}
                  y={-4}
                  width={8}
                  height={8}
                  rx={4}
                  fill="white"
                  stroke="black"
                  strokeWidth={isHovered ? 2 : 1.2}
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