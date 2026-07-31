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
