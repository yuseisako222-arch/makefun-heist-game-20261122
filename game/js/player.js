(() => {
  'use strict';

  const VV = window.VV;
  const { entrance, exit, cases, lasers } = VV.museum;
  const { clamp, distance, laserCycle, move } = VV.geometry;

  function create() {
    return {
      ...entrance, sneak: false, stride: 0, stepDistance: 0,
      lifting: null, liftTime: 0, nearby: null,
    };
  }

  function movePlayer(state, keys, dt) {
    const player = state.player;
    const down = (...codes) => codes.some(code => keys.has(code));
    const dx = Number(down('ArrowRight', 'KeyD')) - Number(down('ArrowLeft', 'KeyA'));
    const dy = Number(down('ArrowDown', 'KeyS')) - Number(down('ArrowUp', 'KeyW'));
    player.sneak = down('ShiftLeft', 'ShiftRight');
    const speed = player.sneak ? 83 : 155;
    const oldX = player.x;
    const oldY = player.y;

    if (dx || dy) {
      const length = Math.hypot(dx, dy);
      player.angle = Math.atan2(dy, dx);
      move(player, dx / length * speed * dt, dy / length * speed * dt, 10);
    }

    const travelled = Math.hypot(player.x - oldX, player.y - oldY);
    player.stride += travelled * 0.18;
    if (player.sneak) player.stepDistance = 0;
    else if (travelled > 0) {
      player.stepDistance += travelled;
      if (player.stepDistance >= 35) {
        player.stepDistance -= 35;
        state.noise.push({ x: player.x, y: player.y, life: 0, radius: 9 });
        VV.audio.cues.step();
      }
    }
    return { x: oldX, y: oldY };
  }

  function updateNoise(state, dt) {
    for (const ripple of state.noise) {
      ripple.life += dt;
      ripple.radius = Math.min(89, 9 + ripple.life * 185);
    }
    state.noise = state.noise.filter(ripple => ripple.life < 0.48);
  }

  function tripLasers(state, previous) {
    const { player } = state;
    let spike = 0;
    for (const beam of lasers) {
      if (Math.abs(beam.x - player.x) > 11) state.laserLatch.delete(beam.id);
      if (previous.x === player.x || state.laserLatch.has(beam.id)) continue;
      const fraction = (beam.x - previous.x) / (player.x - previous.x);
      if (fraction < 0 || fraction > 1) continue;
      const y = previous.y + fraction * (player.y - previous.y);
      if (y <= beam.y1 || y >= beam.y2 || !laserCycle(beam, state.attemptTime).live) continue;
      state.laserLatch.add(beam.id);
      state.laserFlash = 0.66;
      state.trips++;
      spike += 35;
      VV.audio.cues.laser();
    }
    return spike;
  }

  function caseDistance(player, item) {
    const x = clamp(player.x, item.x, item.x + item.w);
    const y = clamp(player.y, item.y, item.y + item.h);
    return distance(player, { x, y });
  }

  function interaction(state, keys, pressed, dt, previous) {
    const player = state.player;
    player.nearby = null;
    if (distance(player, exit) < 33) {
      player.nearby = 'exit';
      if (state.loot.has('star') && pressed.has('KeyE')) return true;
    }

    let target;
    let closest = 27;
    for (const item of cases) {
      if (state.loot.has(item.id)) continue;
      const gap = caseDistance(player, item);
      if (gap < closest) {
        closest = gap;
        target = item;
      }
    }
    if (target) player.nearby = target.id;

    const stationary = player.x === previous.x && player.y === previous.y;
    if (!target || !keys.has('KeyE') || !stationary) {
      player.lifting = null;
      player.liftTime = 0;
      return false;
    }
    if (player.lifting !== target) {
      player.lifting = target;
      player.liftTime = 0;
    }
    player.liftTime += dt;
    if (player.liftTime >= target.time) {
      state.loot.add(target.id);
      state.value += target.value;
      state.lastLoot = { id: target.id, time: state.attemptTime };
      player.lifting = null;
      player.liftTime = 0;
      VV.audio.cues[target.id === 'star' ? 'star' : 'treasure']();
    }
    return false;
  }

  VV.player = { create, movePlayer, updateNoise, tripLasers, interaction };
})();
