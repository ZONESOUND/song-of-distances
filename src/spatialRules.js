export const calcRingDiameter = (layer, globalScale, globalPow) =>
  Math.pow(Math.abs(layer * globalScale / 10), globalPow) * 0.5;

export const calcLayerFromDistance = (distance, globalScale, globalPow) =>
  Math.pow(distance / 0.25, 1 / globalPow) * 10 / globalScale;

export const calcRadarAngle = (radioSpeed, frameCount) =>
  (radioSpeed * frameCount / 60) % (2 * Math.PI) - Math.PI;

export const didRadarCross = (lastAngle, currentAngle, pointAngle) =>
  ((lastAngle - pointAngle) * (currentAngle - pointAngle) <= 0) &&
  Math.abs(lastAngle - currentAngle) < 1;

export const projectGpsPoint = (point, center, globalScale, globalPow) => {
  const rawX = (point.lon - center.lon) * globalScale;
  const rawY = (point.lat - center.lat) * globalScale;
  const x = Math.sign(rawX || 1) * Math.pow(Math.abs(rawX), globalPow);
  const y = -Math.sign(rawY || 1) * Math.pow(Math.abs(rawY), globalPow);
  return {
    x,
    y,
    distance: Math.sqrt(x * x + y * y),
    angle: Math.atan2(y, x),
  };
};

const EARTH_RADIUS_KM = 6371.0088;
const toRadians = (degrees) => degrees * Math.PI / 180;

export const localOffsetKm = (point, center) => {
  const centerLat = toRadians(Number(center.lat));
  const pointLat = toRadians(Number(point.lat));
  const deltaLat = pointLat - centerLat;
  const deltaLon = toRadians(Number(point.lon) - Number(center.lon));
  const meanLat = (centerLat + pointLat) / 2;
  const eastKm = deltaLon * Math.cos(meanLat) * EARTH_RADIUS_KM;
  const northKm = deltaLat * EARTH_RADIUS_KM;
  return {
    eastKm,
    northKm,
    distanceKm: Math.sqrt(eastKm * eastKm + northKm * northKm),
  };
};

export const projectGpsPointToRange = (
  point,
  center,
  maxRangeKm,
  outerRadius,
  distancePow
) => {
  const offset = localOffsetKm(point, center);
  if (offset.distanceKm === 0) {
    return {...offset, x: 0, y: 0};
  }
  const normalizedDistance = offset.distanceKm / maxRangeKm;
  const projectedDistance =
    Math.pow(normalizedDistance, distancePow) * outerRadius;
  return {
    ...offset,
    x: offset.eastKm / offset.distanceKm * projectedDistance,
    y: -offset.northKm / offset.distanceKm * projectedDistance,
  };
};

export const coordinateForDistanceKm = (center, distanceKm, angle) => {
  const northKm = Math.sin(angle) * distanceKm;
  const eastKm = Math.cos(angle) * distanceKm;
  const latRadians = toRadians(Number(center.lat));
  return {
    lat: Number(center.lat) + northKm / 111.195,
    lon: Number(center.lon) + eastKm / (111.195 * Math.cos(latRadians)),
  };
};

export const coordinateForLayer = (
  center,
  layer,
  angle,
  globalScale,
  globalPow
) => {
  const targetDistance = calcRingDiameter(layer, globalScale, globalPow) / 2;
  const angularNorm = Math.sqrt(
    Math.pow(Math.abs(Math.cos(angle)), 2 * globalPow) +
    Math.pow(Math.abs(Math.sin(angle)), 2 * globalPow)
  );
  const geographicRadius =
    Math.pow(targetDistance / angularNorm, 1 / globalPow) / globalScale;
  return {
    lat: center.lat + Math.sin(angle) * geographicRadius,
    lon: center.lon + Math.cos(angle) * geographicRadius,
  };
};
