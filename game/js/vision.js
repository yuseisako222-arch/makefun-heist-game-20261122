(() => {
  'use strict';

  const VV = window.VV;
  const { solids } = VV.museum;
  const { shortestAngle } = VV.geometry;
  const corners = solids.flatMap(({ x, y, w, h }) => [
    [x, y], [x + w, y], [x, y + h], [x + w, y + h],
  ]);

  function rayBox(x, y, dx, dy, box, limit) {
    let near = 0;
    let far = limit;
    if (Math.abs(dx) < 1e-8) {
      if (x < box.x || x > box.x + box.w) return limit;
    } else {
      const left = (box.x - x) / dx;
      const right = (box.x + box.w - x) / dx;
      near = Math.max(near, Math.min(left, right));
      far = Math.min(far, Math.max(left, right));
    }
    if (Math.abs(dy) < 1e-8) {
      if (y < box.y || y > box.y + box.h) return limit;
    } else {
      const top = (box.y - y) / dy;
      const bottom = (box.y + box.h - y) / dy;
      near = Math.max(near, Math.min(top, bottom));
      far = Math.min(far, Math.max(top, bottom));
    }
    return near <= far ? near : limit;
  }

  function rayLength(origin, dx, dy, reach) {
    let length = reach;
    for (const box of solids) {
      length = rayBox(origin.x, origin.y, dx, dy, box, length);
    }
    return length;
  }

  function lineOfSight(origin, target) {
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const length = Math.hypot(dx, dy);
    return length < 0.01 || rayLength(origin, dx / length, dy / length, length) >= length - 0.01;
  }

  function conePolygon(origin, angle, halfAngle, reach) {
    const offsets = [];
    const samples = Math.ceil(halfAngle * 66);
    for (let i = 0; i <= samples; i++) {
      offsets.push(-halfAngle + i * 2 * halfAngle / samples);
    }
    for (const [x, y] of corners) {
      if ((x - origin.x) ** 2 + (y - origin.y) ** 2 > reach ** 2) continue;
      const bearing = Math.atan2(y - origin.y, x - origin.x);
      const difference = shortestAngle(angle, bearing);
      if (difference <= -halfAngle || difference >= halfAngle) continue;
      for (const jitter of [-0.0006, 0, 0.0006]) {
        const offset = difference + jitter;
        if (Math.abs(offset) < halfAngle) offsets.push(offset);
      }
    }
    offsets.sort((a, b) => a - b);
    const polygon = [[origin.x, origin.y]];
    for (const offset of offsets) {
      const dx = Math.cos(angle + offset);
      const dy = Math.sin(angle + offset);
      const length = rayLength(origin, dx, dy, reach);
      polygon.push([origin.x + dx * length, origin.y + dy * length]);
    }
    return polygon;
  }

  function exposure(origin, angle, halfAngle, reach, target, blindRadius = 0) {
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const range = Math.hypot(dx, dy);
    if (range > reach || range <= blindRadius) return 0;
    const offset = Math.abs(shortestAngle(angle, Math.atan2(dy, dx)));
    if (offset >= halfAngle || !lineOfSight(origin, target)) return 0;

    const proximity = 1 - range / reach;
    const center = 1 - offset / halfAngle;
    return 0.24 + proximity * 0.46 + center * 0.30;
  }

  VV.vision = { rayBox, lineOfSight, conePolygon, exposure };
})();
