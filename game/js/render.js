(() => {
  'use strict';

  const VV = window.VV;
  const { rooms, cases, pillars, benches, walls, doorways, runners, lasers, exit } = VV.museum;
  const { clamp, laserCycle } = VV.geometry;
  const { conePolygon } = VV.vision;

  const ink = '#102021';
  const gold = '#e5bc75';
  const linen = '#ede1c4';
  const serif = 'Georgia, "Times New Roman", serif';
  const sans = '"Trebuchet MS", Arial, sans-serif';
  const tau = Math.PI * 2;

  function paint(ctx, color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function outline(ctx, color, x, y, w, h, width = 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.strokeRect(x, y, w, h);
  }

  function label(ctx, words, x, y, color, size, options = {}) {
    ctx.fillStyle = color;
    ctx.font = `${options.style || 'bold'} ${size}px ${options.serif ? serif : sans}`;
    ctx.textAlign = options.align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(words, x, y);
  }

  function polygon(ctx, points, color, line, width = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    if (color) {
      ctx.fillStyle = color;
      ctx.fill();
    }
    if (line) {
      ctx.strokeStyle = line;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }

  function segment(ctx, x1, y1, x2, y2, color, width = 1) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  function ring(ctx, x, y, radius, color, width = 1, start = 0, end = tau) {
    ctx.beginPath();
    ctx.arc(x, y, radius, start, end);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function disc(ctx, x, y, radius, color, border, width = 1) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, tau);
    ctx.fillStyle = color;
    ctx.fill();
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }

  function rotationAt(x, y, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return ([px, py]) => [x + px * cos - py * sin, y + px * sin + py * cos];
  }

  function rectanglePoints(x, y, w, h) {
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  }

  function ellipse(ctx, x, y, a, b, color, angle = 0) {
    const rotate = rotationAt(x, y, angle);
    const points = [];
    const sides = 24;
    for (let i = 0; i < sides; i++) {
      const t = i / sides * tau;
      points.push(rotate([a * Math.cos(t), b * Math.sin(t)]));
    }
    polygon(ctx, points, color);
  }

  function diamondPoints(x, y, rx, ry) {
    return [[x, y - ry], [x + rx, y], [x, y + ry], [x - rx, y]];
  }

  function diamond(ctx, x, y, rx, ry, color, line) {
    polygon(ctx, diamondPoints(x, y, rx, ry), color, line);
  }

  function radialMotif(ctx, x, y, count, inner, outer, color) {
    for (let i = 0; i < count; i++) {
      const angle = i / count * tau;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      segment(ctx, x + dx * inner, y + dy * inner, x + dx * outer, y + dy * outer, color);
    }
  }

  function referenceFrame(ctx, color) {
    outline(ctx, color, 33.5, 29.5, 1213, 661);
    outline(ctx, color, 42.5, 38.5, 1195, 643);
    for (const [x, y] of [[42, 38], [1238, 38], [42, 681], [1238, 681]]) {
      diamond(ctx, x, y, 7, 7, '#152a2a', gold);
      diamond(ctx, x, y, 2, 2, gold);
    }
  }

  function seededNoise() {
    let seed = 31861;
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  const random = seededNoise();
  const speckles = rooms.map(room => Array.from({ length: 258 }, () => ({
    x: room.x + 4 + Math.floor(random() * (room.w - 9)),
    y: room.y + 4 + Math.floor(random() * (room.h - 9)),
    size: random() > 0.86 ? 4 : 1.4,
    color: random() > 0.67 ? '#e5decb' : '#bdb5a6',
  })));

  function marble(ctx, room, index) {
    const { x, y, w, h } = room;
    paint(ctx, room.tone, x, y, w, h);
    for (let row = y + 30, band = 0; row < y + h - 8; row += 37, band++) {
      segment(ctx, x, row + 0.5, x + w, row + 0.5, '#bab2a4');
      segment(ctx, x, row + 1.5, x + w, row + 1.5, '#e4dbca');
      for (let col = x + (band % 2 ? 51 : 22); col < x + w; col += 57) {
        segment(ctx, col + 0.5, row - 36 > y ? row - 36 : y, col + 0.5, row, '#bbb3a6');
      }
    }
    for (const fleck of speckles[index]) paint(ctx, fleck.color, fleck.x, fleck.y, fleck.size, 1);
    outline(ctx, '#b5a795', x + 6.5, y + 7.5, w - 13, h - 15);
    outline(ctx, '#e7decc', x + 8.5, y + 9.5, w - 17, h - 19);
  }

  function carpet(ctx, { x, y, w, h, axis }) {
    paint(ctx, '#4b272d', x + 3, y + 3, w, h);
    paint(ctx, '#71333d', x, y, w, h);
    outline(ctx, '#a76656', x + 4.5, y + 4.5, w - 9, h - 9);
    outline(ctx, '#51272e', x + 9.5, y + 9.5, w - 19, h - 19);
    const longitudinal = axis === 'x';
    const count = Math.floor((longitudinal ? w : h) / 43);
    for (let i = 0; i < count; i++) {
      const px = longitudinal ? x + 22 + i * 43 : x + w / 2;
      const py = longitudinal ? y + h / 2 : y + 22 + i * 43;
      diamond(ctx, px, py, 11, 11, null, '#a15a56');
      diamond(ctx, px, py, 3, 3, '#a76e59');
    }
  }

  function starFloor(ctx) {
    const x = 802;
    const y = 378;
    disc(ctx, x, y, 93, '#b5ab98', '#e1d8c1', 3);
    ring(ctx, x, y, 86, '#857b69', 2);
    ring(ctx, x, y, 78, '#e2d7bc', 2);
    radialMotif(ctx, x, y, 48, 79, 85, '#786e58');
    for (let i = 0; i < 8; i++) {
      const angle = tau * i / 8;
      const px = x + Math.cos(angle) * 67;
      const py = y + Math.sin(angle) * 67;
      diamond(ctx, px, py, 5, 5, '#8b7457');
    }
  }

  function roomHeader(ctx, room) {
    const x = room.x;
    paint(ctx, '#172c2d', x, 121, room.w, 26);
    paint(ctx, '#44605a', x, 121, room.w, 1);
    paint(ctx, '#324b47', x, 146, room.w, 1);
    diamond(ctx, x + 17, 134, 5, 5, '#b9975d');
    label(ctx, room.name, x + 31, 134, linen, 13);
    label(ctx, room.number, x + room.w - 13, 134, '#d4b57d', 13, { align: 'right', serif: true });
  }

  function doorSills(ctx) {
    for (const { x, y } of doorways) {
      paint(ctx, '#b7a683', x - 11, y - 36, 22, 72);
      for (const offset of [-8, 7]) paint(ctx, '#dfceaa', x + offset, y - 35, 2, 70);
      for (const offset of [-34, 33]) paint(ctx, '#80755e', x - 12, y + offset, 24, 2);
      for (const offset of [-20, 0, 20]) diamond(ctx, x, y + offset, 3, 6, '#80745e');
    }
  }

  function standingWall(ctx, { x, y, w, h }) {
    paint(ctx, '#1f3a3d', x, y, w, h);
    if (w > h) {
      paint(ctx, '#476260', x, y + 2, w, 2);
      paint(ctx, '#101f22', x, y + h - 3, w, 3);
      for (let i = x + 13; i < x + w - 8; i += 18) paint(ctx, '#2a4849', i, y + 7, 10, 3);
    } else {
      paint(ctx, '#4b6661', x + 2, y + 2, 3, h - 4);
      paint(ctx, '#14282b', x + w - 4, y, 4, h);
      for (let i = y + 10; i < y + h - 8; i += 16) paint(ctx, '#345252', x + 7, i, 4, 9);
    }
  }

  function pillar(ctx, { x, y, w, h }) {
    paint(ctx, '#7f776b', x + 4, y + 5, w, h);
    paint(ctx, '#797c75', x, y, w, h);
    paint(ctx, '#b1b0a0', x + 3, y + 3, w - 6, h - 6);
    outline(ctx, '#dfdacc', x + 5.5, y + 5.5, w - 11, h - 11);
    disc(ctx, x + w / 2, y + h / 2, 8, '#8d9084', '#d7d0bc');
    diamond(ctx, x + w / 2, y + h / 2, 3, 4, '#c6c4b4');
  }

  function bench(ctx, { x, y, w, h }) {
    paint(ctx, '#857562', x + 4, y + 4, w, h);
    paint(ctx, '#694736', x, y, w, h);
    paint(ctx, '#8a5950', x + 5, y + 4, w - 10, h - 8);
    segment(ctx, x + 6, y + 7, x + w - 6, y + 7, '#b27964');
    for (const side of [2, w - 4]) paint(ctx, '#ba9362', x + side, y + 2, 2, h - 4);
  }

  function gem(ctx, x, y, scale, angle = 0) {
    const rotate = rotationAt(x, y, angle);
    const place = ([px, py]) => rotate([px * scale, py * scale]);
    polygon(ctx, [[-41, -15], [-23, -32], [23, -32], [41, -15], [0, 38]].map(place), '#769fae', '#253f48', 2 * scale);
    polygon(ctx, [[-41, -15], [-23, -32], [-11, -15]].map(place), '#c8e3dd');
    polygon(ctx, [[-23, -32], [23, -32], [11, -15], [-11, -15]].map(place), '#e3eee0');
    polygon(ctx, [[23, -32], [41, -15], [11, -15]].map(place), '#a2c8c8');
    polygon(ctx, [[-41, -15], [-11, -15], [0, 38]].map(place), '#82aab9');
    polygon(ctx, [[-11, -15], [11, -15], [0, 38]].map(place), '#b9dee0');
    polygon(ctx, [[11, -15], [41, -15], [0, 38]].map(place), '#3f7583');
    polygon(ctx, [[-11, -15], [0, 0], [11, -15], [0, -26]].map(place), '#f6f3df');
    segment(ctx, ...place([-39, -15]), ...place([38, -15]), '#d2ddd3', 1.3 * scale);
  }

  function treasure(ctx, id, x, y) {
    if (id === 'star') {
      diamond(ctx, x, y, 24, 26, '#35646b', '#a97a43');
      gem(ctx, x, y - 1, 0.46);
      diamond(ctx, x + 18, y - 15, 3, 6, '#fff1be');
    } else if (id === 'mask') {
      diamond(ctx, x, y, 17, 17, '#593536');
      polygon(ctx, [[x - 13, y - 10], [x + 13, y - 10], [x + 11, y + 4], [x, y + 13], [x - 11, y + 4]], '#e5bb65', '#f6daa0');
      paint(ctx, '#624736', x - 8, y - 4, 5, 3);
      paint(ctx, '#624736', x + 3, y - 4, 5, 3);
      paint(ctx, '#875d36', x - 2, y + 6, 4, 2);
    } else if (id === 'serpent') {
      diamond(ctx, x, y, 17, 17, '#304e46');
      ring(ctx, x - 1, y - 1, 9, '#b5ba62', 4, 0.25, 5.65);
      ring(ctx, x + 1, y - 1, 5, '#5f9a70', 3, 0.2, 4.5);
      disc(ctx, x + 7, y - 6, 4, '#b2cb75');
      disc(ctx, x + 8, y - 7, 1, '#253d36');
    } else {
      diamond(ctx, x, y, 16, 17, '#62323e');
      ellipse(ctx, x, y, 9, 12, '#e1ae65');
      ellipse(ctx, x, y, 6, 10, '#ac6661');
      segment(ctx, x - 7, y + 3, x + 7, y - 3, '#f1cf76', 2);
      diamond(ctx, x, y - 3, 2, 3, '#f6dd8e');
    }
  }

  function displayCase(ctx, item, empty) {
    const { x, y, w, h, id } = item;
    const center = x + w / 2;
    const middle = y + h / 2;
    paint(ctx, '#817364', x + 5, y + 5, w, h);
    paint(ctx, '#6b4226', x, y, w, h);
    paint(ctx, '#a47b51', x + 3, y + 3, w - 6, h - 7);
    paint(ctx, '#b9d2d8', x + 7, y + 6, w - 14, h - 14);
    outline(ctx, '#e7ede3', x + 8.5, y + 7.5, w - 17, h - 17);
    segment(ctx, x + 12, y + h - 13, x + 25, y + 11, '#d7e7e2', 2);
    segment(ctx, x + 18, y + h - 13, x + 31, y + 11, '#d7e7e2');
    if (empty) {
      diamond(ctx, center, middle - 2, 14, 10, '#829b97', '#cfdccc');
      disc(ctx, center, middle - 2, 2, '#576e67');
    } else treasure(ctx, id, center, middle - 2);

    if (id === 'star') {
      for (const px of [x + 4, x + w - 4]) {
        for (const py of [y + 4, y + h - 4]) disc(ctx, px, py, 3, gold, '#74502d');
      }
      const plaqueY = y + h + 8;
      paint(ctx, '#303b35', center - 69, plaqueY, 138, 22);
      outline(ctx, '#c5a05f', center - 68.5, plaqueY + 0.5, 137, 21);
      label(ctx, empty ? 'ON LOAN TO FOXGLOVE' : 'THE AURELIAN STAR', center, plaqueY + 11, '#f5d99a', 10, { align: 'center' });
    } else {
      const plaqueWidth = 91;
      const plaqueX = center - plaqueWidth / 2;
      paint(ctx, '#dad1b9', plaqueX, y + h + 6, plaqueWidth, 16);
      outline(ctx, '#9e9074', plaqueX + 0.5, y + h + 6.5, plaqueWidth - 1, 15);
      label(ctx, item.name.toUpperCase(), center, y + h + 14, '#4a4037', 9, { align: 'center' });
    }
  }

  function rope(ctx, unlocked) {
    const { x, y } = exit;
    const color = unlocked ? '#d7ab54' : '#87744f';
    disc(ctx, x, y, 30, '#b4ad94', '#e2d8bb', 2);
    ring(ctx, x, y, 25, '#706f59');
    ring(ctx, x, y, 20, unlocked ? '#816938' : '#95917a');
    radialMotif(ctx, x, y, 12, 23, 27, '#7e785f');
    paint(ctx, '#675039', x - 9, y - 16, 18, 32);
    for (const offset of [-6, 6]) {
      segment(ctx, x + offset, y - 19, x + offset, y + 19, color, 3);
    }
    for (const offset of [-13, -6, 1, 8, 15]) segment(ctx, x - 7, y + offset, x + 7, y + offset - 3, '#dfc28d', 2);
    const tag = unlocked ? 'EXIT READY' : 'SKYLIGHT';
    paint(ctx, unlocked ? '#2e5545' : '#293b36', x - 44, y + 35, 88, 17);
    label(ctx, tag, x, y + 44, unlocked ? '#f2dc9a' : '#ede0bf', 9, { align: 'center' });
  }

  function coneColor(camera, inner, alert) {
    if (!alert) {
      if (camera) return 'rgba(170,200,255,0.26)';
      return inner ? 'rgba(255,205,115,0.22)' : 'rgba(255,186,84,0.30)';
    }
    const g = Math.round((camera ? 200 : inner ? 205 : 186) - alert * (camera ? 87 : 84));
    const b = Math.round((camera ? 255 : inner ? 115 : 84) - alert * (camera ? 104 : 35));
    const r = camera ? Math.round(170 + alert * 77) : 255;
    const opacity = camera ? 0.26 : inner ? 0.22 : 0.30;
    return `rgba(${r},${g},${b},${opacity})`;
  }

  function lights(ctx, state) {
    const alert = clamp((state.alarm - 18) / 72, 0, 1);
    for (const camera of state.cameras) {
      const { x, y, angle, halfAngle, reach, blind } = camera;
      const shape = conePolygon(camera, angle, halfAngle, reach);
      shape.shift();
      for (let i = 10; i >= 0; i--) {
        const a = angle - halfAngle + i / 10 * 2 * halfAngle;
        shape.push([x + Math.cos(a) * blind, y + Math.sin(a) * blind]);
      }
      polygon(ctx, shape, coneColor(true, false, alert));
    }
    for (const guard of state.guards) {
      const { angle, halfAngle, reach } = guard;
      polygon(ctx, conePolygon(guard, angle, halfAngle, reach), coneColor(false, false, alert));
      polygon(ctx, conePolygon(guard, angle, halfAngle * 0.58, reach * 0.56), coneColor(false, true, alert));
    }
  }

  function drawLaser(ctx, beam, state) {
    const { x, y1, y2, id } = beam;
    const cycle = laserCycle(beam, state.attemptTime);

    if (cycle.live) {
      segment(ctx, x, y1 + 6, x, y2 - 6, cycle.warning ? '#99504a' : '#e95c5c', cycle.warning ? 2 : 4);
      if (!cycle.warning) segment(ctx, x, y1 + 6, x, y2 - 6, '#ffd0b3', 1);
    } else {
      for (let y = y1 + 10; y < y2 - 6; y += 10) paint(ctx, '#716d54', x - 0.5, y, 1, 4);
    }

    for (const y of [y1, y2]) {
      paint(ctx, '#242d2d', x - 9, y - 4, 18, 8);
      outline(ctx, '#69574a', x - 8.5, y - 3.5, 17, 7);
      disc(ctx, x, y, 3, cycle.live ? '#ff766e' : '#a1cb9a');
    }
    const tag = cycle.live ? cycle.warning ? 'DIM' : 'LIVE' : 'OPEN';
    paint(ctx, '#2b3733', x + 12, y1 + 6, 51, 15);
    label(ctx, `${id} · ${tag}`, x + 37, y1 + 14, cycle.live ? '#ffd1b6' : '#cce5ad', 8, { align: 'center' });
  }

  function drawCamera(ctx, mount) {
    const { x, y, angle, seen, index } = mount;
    const rotate = rotationAt(x, y, angle);
    disc(ctx, x, y, 10, '#395963', '#d0d5cb', 2);
    polygon(ctx, [[-10, -6], [4, -6], [11, -4], [11, 4], [4, 6], [-10, 6]].map(rotate), '#29434d', '#12282d');
    polygon(ctx, rectanglePoints(7, -3, 4, 6).map(rotate), '#c7d7dd');
    disc(ctx, ...rotate([-4, 0]), 2, seen ? '#ff8471' : '#a6cae8');
    const tagX = index ? x - 39 : x + 14;
    paint(ctx, '#2d464c', tagX, y - 6, 25, 12);
    label(ctx, `C${index + 1}`, tagX + 12, y + 0.4, '#edf1df', 8, { align: 'center' });
  }

  function silhouettes(ctx, actor, thief) {
    const { x, y, angle, stride } = actor;
    const rotate = rotationAt(x, y, angle);
    disc(ctx, x + 2, y + 5, thief ? 15 : 13, '#74685d');
    const step = Math.sin(stride) * 3;
    ellipse(ctx, ...rotate([-10 + step, -6]), 7, 4, '#101c26', angle);
    ellipse(ctx, ...rotate([-10 - step, 6]), 7, 4, '#101c26', angle);

    if (thief) {
      polygon(ctx, [[-17, -11], [-10, -13], [6, -9], [10, 0], [6, 9], [-10, 13], [-19, 9], [-13, 0]].map(rotate), '#152326', '#ffe9b5', 1.7);
      ellipse(ctx, ...rotate([-9, 11]), 9, 6, '#b08b62', angle);
      segment(ctx, ...rotate([-11, 13]), ...rotate([-4, 8]), '#e0c194', 2);
      disc(ctx, ...rotate([3, 0]), 8, '#0a151a');
      polygon(ctx, rectanglePoints(-1, -8, 6, 16).map(rotate), '#292f30');
      polygon(ctx, rectanglePoints(4, -5, 2, 10).map(rotate), '#e6c480');
      disc(ctx, ...rotate([8, -3]), 2.4, '#fff1d2');
      disc(ctx, ...rotate([8, 3]), 2.4, '#fff1d2');
    } else {
      ellipse(ctx, ...rotate([-1, 0]), 11, 13, '#294258', angle);
      polygon(ctx, [[-8, -11], [2, -12], [6, -7], [3, 0], [6, 7], [0, 12], [-8, 11]].map(rotate), '#36536a', '#162633');
      polygon(ctx, rectanglePoints(-2, -11, 4, 3).map(rotate), '#b29253');
      disc(ctx, ...rotate([4, 0]), 8, '#192a3f', '#718b96');
      polygon(ctx, rectanglePoints(7, -8, 4, 16).map(rotate), '#121e32');
      disc(ctx, ...rotate([11, 10]), 4, '#232b31');
      disc(ctx, ...rotate([13, 10]), 3, '#ffe0a0');
    }
  }

  function actorTag(ctx, actor, text, color, y) {
    const width = text.length > 3 ? 62 : 23;
    const x = actor.x;
    paint(ctx, '#233535', Math.round(x - width / 2), Math.round(y - 8), width, 16);
    label(ctx, text, x, y + 0.5, color, 9, { align: 'center' });
  }

  function actors(ctx, state) {
    for (const guard of state.guards) {
      silhouettes(ctx, guard, false);
      if (guard.seen > 0 || guard.notice > 0) {
        const color = guard.seen > 0 || guard.state === 'pursuit' ? '#982f35' : '#645238';
        diamond(ctx, guard.x, guard.y - 26, 11, 12, color, '#f5d4a5');
        label(ctx, guard.seen > 0 || guard.state === 'pursuit' ? '!' : '?', guard.x, guard.y - 26, '#fff1ce', 15, { align: 'center' });
      } else actorTag(ctx, guard, guard.name, '#e4ddc5', guard.y - 24);
    }
    const player = state.player;
    silhouettes(ctx, player, true);
    actorTag(ctx, player, 'FOXGLOVE', '#ffdf9b', player.y - 25);
  }

  function noiseRings(ctx, state) {
    for (const ripple of state.noise) {
      const shade = ripple.life < 0.21 ? '#846c55' : '#9f8970';
      ring(ctx, ripple.x, ripple.y, ripple.radius, shade, 1);
      if (ripple.radius > 16) ring(ctx, ripple.x, ripple.y, ripple.radius - 8, shade, 1);
    }
  }

  function prompts(ctx, state) {
    const player = state.player;
    if (player.lifting) {
      ring(ctx, player.x, player.y, 21, '#323939', 4);
      ring(ctx, player.x, player.y, 21, '#ffe2a0', 3, -Math.PI / 2, -Math.PI / 2 + tau * clamp(player.liftTime / player.lifting.time, 0, 1));
    }
    const { nearby } = player;
    if (!nearby) return;
    const target = cases.find(item => item.id === nearby);
    let text = target ? 'HOLD  E  ·  LIFT' : 'STAR REQUIRED';
    if (player.lifting) text = 'LIFTING…';
    if (nearby === 'exit' && state.loot.has('star')) text = 'PRESS  E  ·  ESCAPE';
    const x = clamp(player.x, 102, 863);
    const y = player.y > 587 ? player.y - 57 : player.y + 31;
    paint(ctx, '#182b2c', x - 59, y - 10, 118, 20);
    outline(ctx, '#98794f', x - 58.5, y - 9.5, 117, 19);
    label(ctx, text, x, y, '#f4dcaa', 10, { align: 'center' });
  }

  function museum(ctx, state) {
    paint(ctx, '#101e1f', 0, 0, 1280, 720);
    paint(ctx, '#273d3b', 32, 121, 902, 527);
    rooms.forEach((room, index) => marble(ctx, room, index));
    doorSills(ctx);
    for (const runner of runners) carpet(ctx, runner);
    starFloor(ctx);
    rope(ctx, state.loot.has('star'));

    lights(ctx, state);
    for (const room of rooms) roomHeader(ctx, room);
    for (const box of walls) standingWall(ctx, box);
    for (const box of benches) bench(ctx, box);
    for (const box of pillars) pillar(ctx, box);
    for (const item of cases) displayCase(ctx, item, state.loot.has(item.id));
    for (const beam of lasers) drawLaser(ctx, beam, state);
    for (const mount of state.cameras) drawCamera(ctx, mount);
    noiseRings(ctx, state);
    prompts(ctx, state);
    actors(ctx, state);

    if (state.laserFlash > 0) outline(ctx, '#df6d65', 31, 120, 904, 529, 2);
  }

  function flare(ctx, x, y, radius, color, angle = 0) {
    const rotate = rotationAt(x, y, angle);
    polygon(ctx, [[0, -radius], [3, -3], [radius * 0.72, 0], [3, 3], [0, radius], [-3, 3], [-radius * 0.72, 0], [-3, -3]].map(rotate), color);
  }

  function foxEmblem(ctx, x, y, scale, dark, light, bright, angle = 0) {
    const rotate = rotationAt(x, y, angle);
    const place = ([px, py]) => rotate([px * scale, py * scale]);
    polygon(ctx, [[-78, -60], [-47, -31], [-27, -43], [25, -43], [49, -30], [78, -60], [68, -5], [88, 14], [50, 25], [35, 48], [0, 70], [-35, 48], [-50, 25], [-88, 14], [-68, -5]].map(place), dark, bright, 2 * scale);
    polygon(ctx, [[-70, -47], [-51, -20], [-61, -6]].map(place), bright);
    polygon(ctx, [[70, -47], [51, -20], [61, -6]].map(place), bright);
    polygon(ctx, [[-73, 13], [-34, 10], [-13, 33], [0, 35], [13, 33], [34, 10], [73, 13], [46, 22], [28, 47], [0, 63], [-28, 47], [-46, 22]].map(place), light);
    polygon(ctx, diamondPoints(-35, 1, 8, 4).map(place), bright);
    polygon(ctx, diamondPoints(35, 1, 8, 4).map(place), bright);
    polygon(ctx, diamondPoints(0, 41, 10, 6).map(place), dark);
  }

  function callingCard(ctx) {
    paint(ctx, '#152829', 0, 0, 1280, 720);
    referenceFrame(ctx, '#5d6550');
    const x = 958;
    const y = 350;
    for (const radius of [162, 192, 224, 252]) ring(ctx, x, y, radius, '#3d5550');
    radialMotif(ctx, x, y, 72, 228, 253, '#3b5750');
    diamond(ctx, x, y, 252, 302, null, '#526052');
    diamond(ctx, x, y, 209, 264, null, '#768066');
    for (const [px, py] of [[758, 334], [1158, 334], [958, 85], [958, 608]]) diamond(ctx, px, py, 6, 6, '#bc985c');

    const angle = -0.12;
    const rotate = rotationAt(x, y, angle);
    polygon(ctx, rectanglePoints(-141, -235, 307, 483).map(rotate), '#0b181a');
    polygon(ctx, rectanglePoints(-153, -241, 306, 477).map(rotate), '#d7bc83');
    polygon(ctx, rectanglePoints(-146.5, -234.5, 293, 464).map(rotate), null, '#764d40');
    polygon(ctx, rectanglePoints(-135, -223, 270, 442).map(rotate), '#6b353b');
    polygon(ctx, rectanglePoints(-129.5, -217.5, 259, 431).map(rotate), null, '#ba8761');
    polygon(ctx, diamondPoints(0, -27, 110, 158).map(rotate), '#472e35', '#a57356');
    polygon(ctx, diamondPoints(0, -27, 91, 132).map(rotate), null, '#806052');
    foxEmblem(ctx, ...rotate([0, -25]), 1.13, '#202b2c', '#e6c592', '#deb67a', angle);
    gem(ctx, ...rotate([0, 111]), 0.70, angle);
    flare(ctx, ...rotate([45, 88]), 13, '#eed5a2', angle);
    flare(ctx, ...rotate([-42, 122]), 7, '#eed5a2', angle);
    for (const [px, py] of [[-111, -199], [111, -199], [-111, 193], [111, 193]]) {
      polygon(ctx, diamondPoints(px, py, 8, 13).map(rotate), null, '#d7a772');
      polygon(ctx, diamondPoints(px, py, 2, 5).map(rotate), '#d7a772');
    }
    label(ctx, 'F O X G L O V E', ...rotate([0, 182]), '#efd4a4', 16, { align: 'center', serif: true });
  }

  function winIllustration(ctx) {
    paint(ctx, '#e5d8b8', 0, 0, 1280, 720);
    referenceFrame(ctx, '#968565');
    paint(ctx, '#243c3d', 71, 72, 580, 576);
    outline(ctx, '#9a8059', 81.5, 82.5, 559, 555);
    paint(ctx, '#172d31', 89, 90, 544, 285);
    const stars = seededNoise();
    for (let i = 0; i < 42; i++) {
      const x = 98 + stars() * 524;
      const y = 103 + stars() * 233;
      diamond(ctx, x, y, i % 9 ? 1 : 3, i % 9 ? 1 : 4, i % 3 ? '#809387' : '#d3b783');
    }
    disc(ctx, 343, 272, 128, '#dbbd85', '#f2d9a7', 3);
    ring(ctx, 343, 272, 116, '#af8a5a');
    radialMotif(ctx, 343, 272, 84, 118, 126, '#a17b50');
    foxEmblem(ctx, 343, 250, 1.03, '#1c383a', '#d8b77b', '#f0deac');
    gem(ctx, 343, 342, 0.70);
    flare(ctx, 396, 328, 16, '#ffe5ad');
    polygon(ctx, [[89, 489], [89, 366], [132, 337], [161, 354], [161, 328], [179, 319], [179, 365], [231, 392], [274, 354], [317, 385], [357, 395], [409, 358], [467, 402], [535, 340], [570, 368], [570, 318], [589, 318], [589, 381], [633, 405], [633, 489]], '#345051');
    polygon(ctx, [[89, 558], [89, 464], [137, 469], [182, 425], [220, 447], [252, 421], [252, 389], [272, 389], [272, 439], [302, 461], [345, 428], [389, 448], [421, 413], [470, 452], [515, 434], [563, 463], [600, 422], [633, 444], [633, 558]], '#162a2c');
    for (const [x, y] of [[119, 495], [170, 480], [200, 477], [216, 511], [279, 475], [395, 493], [416, 466], [432, 497], [595, 481]]) {
      paint(ctx, '#b48e5c', x, y, 8, 12);
      paint(ctx, '#263e3c', x + 3, y, 2, 12);
    }

    segment(ctx, 112, 550, 609, 550, '#94764f');
    label(ctx, 'A U R E L I A N   G A Z E T T E', 361, 578, '#ead7a5', 17, { align: 'center', serif: true });
    diamond(ctx, 361, 609, 5, 7, '#bb925f');
    diamond(ctx, 346, 609, 2, 4, '#bb925f');
    diamond(ctx, 376, 609, 2, 4, '#bb925f');
  }

  function draw(ctx, state) {
    if (state.phase === 'title') callingCard(ctx);
    else if (state.phase === 'win') winIllustration(ctx);
    else museum(ctx, state);
  }

  VV.render = { draw };
})();
