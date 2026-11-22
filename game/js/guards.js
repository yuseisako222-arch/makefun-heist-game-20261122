(() => {
  'use strict';

  const VV = window.VV;
  const { bounds, patrols, solids } = VV.museum;
  const { blocked, clamp, distance, move, shortestAngle } = VV.geometry;
  const { rayBox, exposure } = VV.vision;

  const radius = 9;
  const clearance = 13;
  const routeObstacles = solids.map(box => ({
    x: box.x - clearance, y: box.y - clearance,
    w: box.w + 2 * clearance, h: box.h + 2 * clearance,
  }));

  function openSegment(a, b) {
    const length = distance(a, b);
    if (length < 0.1) return true;
    const dx = (b.x - a.x) / length;
    const dy = (b.y - a.y) / length;
    return routeObstacles.every(box => rayBox(a.x, a.y, dx, dy, box, length) >= length - 0.02);
  }

  const junctions = [];
  for (const { x, y, w, h } of routeObstacles) {
    for (const [px, py] of [[x - 1, y - 1], [x + w + 1, y - 1], [x - 1, y + h + 1], [x + w + 1, y + h + 1]]) {
      if (px <= bounds.x || px >= bounds.x + bounds.w || py <= bounds.y || py >= bounds.y + bounds.h) continue;
      if (!blocked(px, py, clearance + 1)) junctions.push({ x: px, y: py });
    }
  }

  const neighbors = junctions.map((a, i) => junctions.flatMap((b, j) =>
    i !== j && openSegment(a, b) ? [{ index: j, cost: distance(a, b) }] : [],
  ));

  function routeTo(start, goal) {
    if (openSegment(start, goal)) return [goal];
    const nodes = [...junctions, start, goal];
    const startIndex = nodes.length - 2;
    const goalIndex = nodes.length - 1;
    const cost = nodes.map(() => Infinity);
    const previous = nodes.map(() => -1);
    const open = new Set([startIndex]);
    const approaches = junctions.map(node => openSegment(node, goal));
    cost[startIndex] = 0;

    while (open.size) {
      let current = -1;
      let best = Infinity;
      for (const index of open) {
        const estimate = cost[index] + distance(nodes[index], goal);
        if (estimate < best) {
          best = estimate;
          current = index;
        }
      }
      if (current === goalIndex) {
        const path = [];
        for (let index = current; index !== startIndex; index = previous[index]) path.push(nodes[index]);
        return path.reverse();
      }
      open.delete(current);
      const edges = current === startIndex
        ? junctions.flatMap((node, index) => openSegment(start, node) ? [{ index, cost: distance(start, node) }] : [])
        : neighbors[current];
      const next = approaches[current]
        ? [...edges, { index: goalIndex, cost: distance(nodes[current], goal) }]
        : edges;
      for (const edge of next) {
        const estimate = cost[current] + edge.cost;
        if (estimate >= cost[edge.index]) continue;
        cost[edge.index] = estimate;
        previous[edge.index] = current;
        open.add(edge.index);
      }
    }
    return [goal];
  }

  function approachable(guard, goal) {
    if (!blocked(goal.x, goal.y, clearance + 1)) return goal;
    for (const offset of [16, 25, 38]) {
      for (let step = 0; step < 8; step++) {
        const angle = Math.atan2(guard.y - goal.y, guard.x - goal.x) + step * Math.PI / 4;
        const x = goal.x + Math.cos(angle) * offset;
        const y = goal.y + Math.sin(angle) * offset;
        if (!blocked(x, y, clearance + 1)) return { x, y };
      }
    }
    return goal;
  }

  function create() {
    return patrols.map(({ name, route, facing }, index) => ({
      name, route: route.map(([x, y]) => ({ x, y })),
      x: route[0][0], y: route[0][1], angle: facing, scanAngle: facing,
      waypoint: 0, laps: 0, pause: 1.25 + index * 0.48, scanTime: 0, stride: 0,
      state: 'patrol', seen: 0, notice: 0, path: [], goal: null, report: 0,
      halfAngle: 0.46, reach: 160, hearingCooldown: 0,
    }));
  }

  function face(guard, angle, speed, dt) {
    guard.angle += clamp(shortestAngle(guard.angle, angle), -speed * dt, speed * dt);
    guard.angle = Math.atan2(Math.sin(guard.angle), Math.cos(guard.angle));
  }

  function travel(guard, goal, speed, dt) {
    if (guard.goal !== goal) {
      guard.goal = goal;
      guard.path = routeTo(guard, goal);
    }
    const next = guard.path[0];
    if (!next) return true;

    const dx = next.x - guard.x;
    const dy = next.y - guard.y;
    const remaining = Math.hypot(dx, dy);
    if (remaining <= 1.5) {
      guard.path.shift();
      return !guard.path.length;
    }

    face(guard, Math.atan2(dy, dx), guard.state === 'pursuit' ? 5.6 : 3.8, dt);
    const fraction = Math.min(speed * dt / remaining, 1);
    const oldX = guard.x;
    const oldY = guard.y;
    move(guard, dx * fraction, dy * fraction, radius);
    guard.stride += Math.hypot(guard.x - oldX, guard.y - oldY) * 0.13;
    return false;
  }

  function investigate(guard, point, state) {
    guard.state = state;
    guard.target = approachable(guard, point);
    guard.notice = state === 'pursuit' ? 1.5 : 0.8;
    guard.pause = 0;
    guard.scanTime = 0;
  }

  function scan(guard, dt, width) {
    guard.scanTime += dt;
    face(guard, guard.scanAngle + Math.sin(guard.scanTime * 2.8) * width, 1.8, dt);
    guard.pause = Math.max(0, guard.pause - dt);
  }

  function patrol(guard, alert, dt) {
    if (guard.pause > 0) {
      scan(guard, dt, alert ? 0.52 : 0.38);
      if (guard.pause === 0) {
        guard.waypoint = (guard.waypoint + 1) % guard.route.length;
        if (guard.waypoint === 1 && guard.goal === guard.route[0]) guard.laps++;
      }
      return;
    }
    if (travel(guard, guard.route[guard.waypoint], alert ? 77 : 54, dt)) {
      guard.scanAngle = guard.angle;
      guard.scanTime = 0;
      guard.pause = alert ? 0.52 : 1.1;
    }
  }

  function update(guards, state, dt) {
    let detection = 0;
    for (const guard of guards) {
      guard.notice = Math.max(0, guard.notice - dt);
      guard.hearingCooldown = Math.max(0, guard.hearingCooldown - dt);
      const report = state.lastSeen;
      if (state.alert && report && guard.report !== report.id) {
        guard.report = report.id;
        investigate(guard, report, 'pursuit');
      }
      if (!guard.hearingCooldown && guard.state !== 'pursuit') {
        const heard = state.noise.find(ripple => distance(ripple, guard) < ripple.radius
          && VV.vision.lineOfSight(guard, ripple));
        if (heard) {
          guard.hearingCooldown = 1.3;
          investigate(guard, heard, 'investigate');
        }
      }

      if (guard.state === 'search') {
        scan(guard, dt, 0.72);
        if (guard.pause === 0) guard.state = 'patrol';
      } else if (guard.state !== 'patrol') {
        if (travel(guard, guard.target, guard.state === 'pursuit' ? 92 : 65, dt)) {
          guard.state = 'search';
          guard.scanAngle = guard.angle;
          guard.pause = 1.45;
        }
      } else {
        patrol(guard, state.alert, dt);
      }

      guard.halfAngle = state.alert ? 0.52 : 0.46;
      guard.reach = state.alert ? 185 : 161;
      guard.seen = exposure(guard, guard.angle, guard.halfAngle, guard.reach, state.player);
      detection += guard.seen * (state.player.sneak ? 20 : 36);
    }
    return detection;
  }

  VV.guards = { create, update };
})();
