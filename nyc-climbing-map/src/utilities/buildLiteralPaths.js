import * as d3 from "d3";

const BOROUGH_ORDER = [
  "Manhattan", 
  "Brooklyn", 
  "Queens", 
  "Bronx", 
  "Staten Island"
];
const OFFSET_SPACING = 3; // px, unzoomed coordinate space
const SAMPLES_PER_SEGMENT = 16; // higher = smoother curve, more points to compute

export function buildLinePaths(stations, lineSystems) {
  const canonicalOrder = [];
  for (const [tierId, tier] of Object.entries(lineSystems)) {
    if (tierId === "region") continue;
    tier.lines.forEach((l) => canonicalOrder.push(l.id));
  }

  // Step 1: each line's ordered route
  const lineRoutes = [];
  for (const [tierId, tier] of Object.entries(lineSystems)) {
    if (tierId === "region") continue;
    for (const line of tier.lines) {
      // const members = stations.filter((s) => s.lines.includes(line.id));

      const members = stations
        .filter((s) => s.lines.includes(line.id))
        .filter((s) => s.region === "nyc-metro"); // out-of-metro stations get their own dashed-spur treatment, not the bundled path

      if (members.length < 2) continue;

      const ordered = line.stationOrder
        ? line.stationOrder.map((id) => members.find((s) => s.id === id)).filter(Boolean)
        : orderByBoroughThenNorthSouth(members);

      lineRoutes.push({ 
        id: 
        line.id, tierId, 
        name: line.name, 
        color: line.color, 
        shortLabel: line.shortLabel,
        ordered 
      });
    }
  }

  // Step 2: global edge -> Set(lineIds), to find each edge's bundle offset
  const edgeMap = new Map();
  lineRoutes.forEach((route) => {
    for (let i = 0; i < route.ordered.length - 1; i++) {
      const key = edgeKey(route.ordered[i].id, route.ordered[i + 1].id);
      if (!edgeMap.has(key)) edgeMap.set(key, new Set());
      edgeMap.get(key).add(route.id);
    }
  });

  const offsetForEdge = (aId, bId, lineId) => {
    const group = [...edgeMap.get(edgeKey(aId, bId))].sort(
      (x, y) => canonicalOrder.indexOf(x) - canonicalOrder.indexOf(y)
    );
    const idx = group.indexOf(lineId);
    return (idx - (group.length - 1) / 2) * OFFSET_SPACING;
  };

  // Step 3: build each line's continuous offset curve
  const paths = lineRoutes.map((route) => {
    const { ordered, id: lineId } = route;
    const n = ordered.length;

    // Per-original-station offset: average of its incoming/outgoing edge offsets
    // (endpoints just use their single adjacent edge)
    const stationOffsets = ordered.map((s, i) => {
      const prevOffset = i > 0 ? offsetForEdge(ordered[i - 1].id, s.id, lineId) : null;
      const nextOffset = i < n - 1 ? offsetForEdge(s.id, ordered[i + 1].id, lineId) : null;
      if (prevOffset === null) return nextOffset;
      if (nextOffset === null) return prevOffset;
      return (prevOffset + nextOffset) / 2;
    });

    const samples = sampleRouteWithOffsets(ordered, stationOffsets);

    const lineGen = d3.line().x((d) => d.x).y((d) => d.y).curve(d3.curveCatmullRom.alpha(0.5));

    return {
      id: lineId,
      tierId: route.tierId,
      name: route.name,
      color: route.color,
      shortLabel: route.shortLabel,
      d: lineGen(samples),
      points: samples,
      startStation: ordered[0],
      endStation: ordered[n - 1],
    };
  });

  return paths;
}

// Samples a centripetal Catmull-Rom curve through `stations`, then shifts each
// sample perpendicular to the curve's local tangent by an offset that's
// linearly blended between that segment's two endpoint station-offsets.
function sampleRouteWithOffsets(stations, stationOffsets) {
  const n = stations.length;
  const pts = stations.map((s) => ({ x: s.x, y: s.y }));

  // Pad virtual endpoints (reflect first/last) so Catmull-Rom has 4 control
  // points available even at the route's very start/end.
  const padded = [pts[0], ...pts, pts[n - 1]];

  const rawSamples = []; // {x, y, segIndex, segT} on the *unshifted* curve

  for (let i = 0; i < n - 1; i++) {
    const p0 = padded[i];
    const p1 = padded[i + 1];
    const p2 = padded[i + 2];
    const p3 = padded[i + 3];

    for (let s = 0; s < SAMPLES_PER_SEGMENT; s++) {
      const t = s / SAMPLES_PER_SEGMENT;
      rawSamples.push({ ...centripetalCatmullRom(p0, p1, p2, p3, t), segIndex: i, segT: t });
    }
  }
  rawSamples.push({ ...pts[n - 1], segIndex: n - 2, segT: 1 });

  // Tangents via finite difference on the raw (unshifted) curve
  const withTangents = rawSamples.map((pt, i) => {
    const prev = rawSamples[Math.max(0, i - 1)];
    const next = rawSamples[Math.min(rawSamples.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { ...pt, tx: dx / len, ty: dy / len };
  });

  // Apply offset: blend linearly from stationOffsets[segIndex] to
  // stationOffsets[segIndex+1] across segT
  return withTangents.map((pt) => {
    const offsetStart = stationOffsets[pt.segIndex];
    const offsetEnd = stationOffsets[pt.segIndex + 1];
    const offset = offsetStart + (offsetEnd - offsetStart) * pt.segT;

    const nx = -pt.ty; // perpendicular = rotate tangent 90°
    const ny = pt.tx;

    return { x: pt.x + nx * offset, y: pt.y + ny * offset };
  });
}

function centripetalCatmullRom(p0, p1, p2, p3, t) {
  const alpha = 0.5;
  const getT = (ti, pa, pb) => {
    const d = Math.hypot(pb.x - pa.x, pb.y - pa.y);
    return ti + Math.pow(d || 1e-6, alpha);
  };

  const t0 = 0;
  const t1 = getT(t0, p0, p1);
  const t2 = getT(t1, p1, p2);
  const t3 = getT(t2, p2, p3);
  const tt = t1 + t * (t2 - t1);

  const lerp = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

  const A1 = lerp(p0, p1, (tt - t0) / (t1 - t0));
  const A2 = lerp(p1, p2, (tt - t1) / (t2 - t1));
  const A3 = lerp(p2, p3, (tt - t2) / (t3 - t2));
  const B1 = lerp(A1, A2, (tt - t0) / (t2 - t0));
  const B2 = lerp(A2, A3, (tt - t1) / (t3 - t1));
  return lerp(B1, B2, (tt - t1) / (t2 - t1));
}

function edgeKey(idA, idB) {
  return [idA, idB].sort().join("|");
}

function orderByBoroughThenNorthSouth(stations) {
  const byBorough = {};
  stations.forEach((s) => (byBorough[s.borough] ??= []).push(s));
  Object.values(byBorough).forEach((g) => g.sort((a, b) => b.coordsGeo.lat - a.coordsGeo.lat));

  const boroughsPresent = BOROUGH_ORDER.filter((b) => byBorough[b]);
  const path = [];

  boroughsPresent.forEach((borough, i) => {
    const group = byBorough[borough];
    const northernmost = group[0];

    if (i === 0) {
      path.push(...group);
      return;
    }

    const last = path[path.length - 1];
    let closest = group[0];
    let closestDist = Infinity;
    group.forEach((s) => {
      const dist = (s.x - last.x) ** 2 + (s.y - last.y) ** 2;
      if (dist < closestDist) {
        closestDist = dist;
        closest = s;
      }
    });

    if (closest.id === northernmost.id) {
      path.push(...group);
    } else {
      const remaining = group.filter((s) => s.id !== closest.id && s.id !== northernmost.id);
      path.push(closest, northernmost, ...remaining);
    }
  });

  return path;
}