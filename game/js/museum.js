(() => {
  'use strict';

  const box = (x, y, w, h) => ({ x, y, w, h });
  const bounds = box(48, 164, 870, 470);
  const rooms = [
    { ...box(48, 164, 284, 470), name: 'ENTRANCE HALL', number: 'I', tone: '#cfc8b8' },
    { ...box(348, 164, 286, 470), name: 'GRAND HALL', number: 'II', tone: '#d8cfc0' },
    { ...box(650, 164, 268, 470), name: 'STAR GALLERY', number: 'III', tone: '#cbc6b9' },
  ];

  const cases = [
    { ...box(112, 289, 76, 48), id: 'mask', name: 'Sun Mask', value: 12500, time: 1 },
    { ...box(484, 315, 84, 52), id: 'serpent', name: 'Jade Serpent', value: 18500, time: 1 },
    { ...box(492, 552, 76, 45), id: 'egg', name: 'Imperial Egg', value: 24000, time: 1 },
    { ...box(754, 343, 96, 70), id: 'star', name: 'Aurelian Star', value: 95000, time: 2 },
  ];

  const pillars = [
    box(242, 358, 35, 35), box(242, 559, 35, 35),
    box(388, 365, 36, 36), box(564, 440, 35, 35),
    box(694, 300, 34, 34), box(856, 465, 34, 34),
    box(739, 527, 35, 35),
  ];

  const benches = [box(72, 202, 75, 20), box(399, 195, 76, 18), box(801, 589, 80, 18)];

  const walls = [
    box(32, 148, 902, 16), box(32, 634, 902, 14),
    box(32, 164, 16, 470), box(918, 164, 16, 470),
    box(332, 164, 16, 74), box(332, 310, 16, 172), box(332, 558, 16, 76),
    box(634, 164, 16, 74), box(634, 310, 16, 172), box(634, 558, 16, 76),
  ];

  const doorways = [
    { x: 340, y: 274 }, { x: 340, y: 520 },
    { x: 642, y: 274 }, { x: 642, y: 520 },
  ];

  const lasers = [
    { id: 'A', x: 340, y1: 484, y2: 556, offset: 0.6 },
    { id: 'B', x: 642, y1: 240, y2: 308, offset: 2.25 },
  ];

  const cameras = [
    { x: 596, y: 176, direction: 1.53, sweep: 0.67, period: 6.8, phase: 0.4 },
    { x: 905, y: 531, direction: 3.44, sweep: 0.68, period: 8.4, phase: 2.4 },
  ];

  const patrols = [
    { name: 'G1', route: [[220, 243], [292, 279], [290, 451], [204, 476], [211, 326]], facing: 0.48 },
    { name: 'G2', route: [[384, 273], [550, 267], [606, 378], [520, 482], [428, 452]], facing: 0.02 },
    { name: 'G3', route: [[820, 244], [886, 315], [880, 430], [791, 492], [690, 448], [684, 264]], facing: 0.8 },
  ];

  const runners = [
    { ...box(61, 428, 258, 82), axis: 'x' },
    { ...box(358, 232, 102, 398), axis: 'y' },
    { ...box(655, 235, 255, 57), axis: 'x' },
    { ...box(781, 286, 42, 234), axis: 'y' },
  ];

  const exit = { x: 105, y: 564 };
  const entrance = { x: 130, y: 543, angle: -0.55 };
  const solids = [...walls, ...cases, ...pillars, ...benches];
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const shortestAngle = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

  function blocked(x, y, radius) {
    return solids.some(solid => {
      const dx = x - clamp(x, solid.x, solid.x + solid.w);
      const dy = y - clamp(y, solid.y, solid.y + solid.h);
      return dx * dx + dy * dy < radius * radius;
    });
  }

  function move(body, dx, dy, radius) {
    const slices = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 5));
    const stepX = dx / slices;
    const stepY = dy / slices;
    for (let i = 0; i < slices; i++) {
      if (!blocked(body.x + stepX, body.y, radius)) body.x += stepX;
      if (!blocked(body.x, body.y + stepY, radius)) body.y += stepY;
    }
  }

  function laserCycle(laser, time) {
    const position = (time + laser.offset) % 4.4;
    return { live: position < 3.2, warning: position >= 2.68 && position < 3.2 };
  }

  window.VV = {
    museum: { bounds, rooms, cases, pillars, benches, walls, doorways, lasers, cameras, patrols, runners, exit, entrance, solids },
    geometry: { clamp, distance, shortestAngle, blocked, move, laserCycle },
  };
})();
