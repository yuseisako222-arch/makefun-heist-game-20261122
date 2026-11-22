(() => {
  'use strict';

  const VV = window.VV;
  const { cases } = VV.museum;
  const { clamp } = VV.geometry;
  const byId = id => document.getElementById(id);
  const stage = byId('stage');
  const viewport = byId('viewport');
  const context = byId('scene').getContext('2d');
  const keys = new Set();
  const pressed = new Set();
  const requested = new URLSearchParams(window.location.search).get('shot');
  const items = Array.from(document.querySelectorAll('[data-loot]'));
  const input = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
    'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyP', 'Escape', 'KeyM',
  ]);
  const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  const nodes = {};
  for (const id of [
    'mission', 'title-screen', 'interruption', 'win-screen', 'alarm', 'alarm-meter',
    'alarm-fill', 'alarm-number', 'security-state', 'loot-value', 'treasure-count',
    'objective-title', 'objective-body', 'attempt-label', 'run-time', 'interrupt-label',
    'interrupt-title', 'interrupt-detail', 'interrupt-action', 'return-button',
    'sound-button', 'sound-label', 'pause-button', 'start-button', 'again-button',
    'win-rank', 'win-time', 'win-value', 'win-treasures', 'win-spotted', 'win-trips', 'win-attempts',
  ]) nodes[id] = byId(id);

  function newAttempt() {
    return {
      player: VV.player.create(), guards: VV.guards.create(), cameras: VV.cameras.create(),
      attemptTime: 0, alarm: 0, alert: false, noise: [], loot: new Set(), value: 0,
      contact: 0, quiet: 1, hasSpotted: false, lastSeen: null, reports: 0,
      lastLoot: null, tick: 0, laserFlash: 0, laserLatch: new Set(),
    };
  }

  function newRun() {
    return {
      ...newAttempt(), phase: 'title', elapsed: 0, attempts: 1, spotted: 0, trips: 0,
    };
  }

  let state = newRun();
  let frozen = false;
  let lastFrame;
  let needsDraw = true;

  function text(id, value) {
    const node = nodes[id];
    const next = String(value);
    if (node.textContent !== next) node.textContent = next;
  }

  function timecode(value) {
    const seconds = Math.floor(value);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
  }

  function optionalCount() {
    return state.loot.size - Number(state.loot.has('star'));
  }

  function rank() {
    const treasures = optionalCount();
    if (state.spotted === 0 && treasures === 3) return 'GHOST';
    if (treasures >= 2 && state.spotted <= 2 && state.trips <= 1 && state.attempts === 1) return 'MASTER THIEF';
    if (state.attempts <= 2 && state.spotted <= 5 && state.trips <= 3) return 'CAT BURGLAR';
    return 'SMASH AND GRAB';
  }

  function notes() {
    if (state.laserFlash > 0) return ['Laser tripped', 'Break line of sight until the security alarm falls.'];
    if (state.lastLoot && state.attemptTime - state.lastLoot.time < 1.65 && state.lastLoot.id !== 'star') {
      const item = cases.find(candidate => candidate.id === state.lastLoot.id);
      return [item.name + ' secured', dollars.format(item.value) + ' added to the take.'];
    }
    if (state.loot.has('star')) return ['Get to the rope', 'The skylight is open. Head back to the entrance hall and press E at the rope.'];
    return ['Lift the Star', 'Cross to the Star Gallery. Hold E at the centerpiece to lift it.'];
  }

  function updateHud() {
    const level = Math.round(state.alarm);
    const alarm = nodes.alarm;
    alarm.dataset.level = state.alert || level === 100 ? 'red' : 'clear';
    text('alarm-number', `${level}%`);
    text('security-state', level === 100 ? 'LOCKDOWN' : state.alert ? 'ON ALERT' : level > 0 ? 'RISING RISK' : 'CLEAR');
    nodes['alarm-fill'].style.width = `${state.alarm.toFixed(2)}%`;
    nodes['alarm-meter'].setAttribute('aria-valuenow', String(level));
    text('loot-value', dollars.format(state.value));
    text('run-time', timecode(state.elapsed));
    text('attempt-label', `ATTEMPT ${String(state.attempts).padStart(2, '0')}`);
    text('treasure-count', `${optionalCount()} / 3 OPTIONAL`);
    const [heading, body] = notes();
    text('objective-title', heading);
    text('objective-body', body);
    for (const row of items) row.classList.toggle('collected', state.loot.has(row.dataset.loot));
  }

  function phase(next, manageFocus = true) {
    state.phase = next;
    stage.dataset.phase = next;
    needsDraw = true;
    const paused = next === 'paused';
    const caught = next === 'caught';
    nodes.mission.hidden = next === 'title' || next === 'win';
    nodes.mission.inert = paused || caught;
    nodes['title-screen'].hidden = next !== 'title';
    nodes.interruption.hidden = !paused && !caught;
    nodes['win-screen'].hidden = next !== 'win';

    if (paused || caught) {
      text('interrupt-label', caught ? 'Museum lockdown' : 'Heist suspended');
      text('interrupt-title', caught ? 'CAUGHT' : 'Paused');
      text('interrupt-detail', caught
        ? `Attempt ${state.attempts} ended. Retry to reset your loot. The clock is still running.`
        : 'The museum is on hold. Resume when you’re ready to make your move.');
      text('interrupt-action', caught ? 'Retry from the entrance' : 'Resume heist');
      if (manageFocus) nodes['interrupt-action'].focus({ preventScroll: true });
    }

    if (next === 'win') {
      text('win-rank', rank());
      text('win-time', timecode(state.elapsed));
      text('win-value', dollars.format(state.value));
      text('win-treasures', `${optionalCount()} / 3`);
      text('win-spotted', state.spotted);
      text('win-trips', state.trips);
      text('win-attempts', state.attempts);
      if (manageFocus) nodes['again-button'].focus({ preventScroll: true });
    }

    if (next === 'title' && manageFocus) nodes['start-button'].focus({ preventScroll: true });
    updateHud();
  }

  function start() {
    frozen = false;
    state = newRun();
    keys.clear();
    pressed.clear();
    VV.audio.unlock();
    phase('play');
  }

  function retry() {
    frozen = false;
    Object.assign(state, newAttempt());
    state.attempts++;
    keys.clear();
    pressed.clear();
    phase('play');
  }

  function goToTitle() {
    frozen = false;
    state = newRun();
    keys.clear();
    pressed.clear();
    phase('title');
  }

  function togglePause() {
    if (state.phase === 'play') phase('paused');
    else if (state.phase === 'paused') phase('play');
  }

  function toggleMute() {
    const muted = VV.audio.toggle();
    nodes['sound-button'].setAttribute('aria-pressed', String(muted));
    text('sound-label', muted ? 'Sound off' : 'Sound on');
  }

  function rememberPosition() {
    const { x, y } = state.player;
    state.lastSeen = { x, y, time: state.attemptTime, id: ++state.reports };
  }

  function assessSecurity(visibility, laserSpike, dt) {
    const seen = visibility > 0;
    if (seen) {
      state.contact += dt;
      state.quiet = 0;
      if (!state.hasSpotted && state.contact > 0.12) {
        state.spotted++;
        state.hasSpotted = true;
      }
      if (!state.lastSeen || state.attemptTime - state.lastSeen.time > 0.62) rememberPosition();
    } else {
      state.quiet += dt;
      state.contact = 0;
      if (state.quiet > 0.55) state.hasSpotted = false;
    }
    if (laserSpike) rememberPosition();

    const drift = seen ? visibility * dt : laserSpike ? 0 : -20 * dt;
    state.alarm = clamp(state.alarm + drift + laserSpike, 0, 100);
    state.alert = state.alarm >= (state.alert ? 40 : 50);
    state.tick = Math.max(0, state.tick - dt);
    if ((seen || state.alert) && state.alarm > 12 && state.tick === 0) {
      VV.audio.cues.alarm(state.alarm);
      state.tick = 0.37 - state.alarm * 0.0026;
    }
  }

  function advance(dt) {
    if (state.phase === 'caught') {
      state.elapsed += dt;
      return;
    }
    if (state.phase !== 'play') return;

    state.attemptTime += dt;
    state.elapsed += dt;
    state.laserFlash = Math.max(0, state.laserFlash - dt);
    const previous = VV.player.movePlayer(state, keys, dt);
    VV.player.updateNoise(state, dt);
    const spike = VV.player.tripLasers(state, previous);
    const attention = VV.guards.update(state.guards, state, dt)
      + VV.cameras.update(state.cameras, state.player, state.attemptTime);
    assessSecurity(attention, spike, dt);

    if (state.alarm >= 100) {
      VV.audio.cues.caught();
      phase('caught');
    } else if (VV.player.interaction(state, keys, pressed, dt, previous)) {
      VV.audio.cues.escape();
      phase('win');
    }
  }

  function frame(now) {
    const dt = lastFrame === undefined ? 0 : clamp((now - lastFrame) / 1000, 0, 0.06);
    lastFrame = now;
    if (!frozen && dt > 0) {
      if (state.phase === 'play') needsDraw = true;
      advance(dt);
      if (state.phase === 'play' || state.phase === 'caught') updateHud();
      pressed.clear();
    }
    if (needsDraw) {
      VV.render.draw(context, state);
      needsDraw = false;
    }
    window.requestAnimationFrame(frame);
  }

  function resize() {
    const width = viewport.clientWidth || window.innerWidth;
    stage.style.setProperty('--scale', width / 1280);
  }

  function stageShot(name) {
    switch (name) {
      case 'play':
        state.attemptTime = 1.35;
        state.elapsed = 23;
        state.alarm = 15;
        state.loot.add('mask');
        state.value = 12500;
        Object.assign(state.player, { x: 461, y: 277, angle: 0.05, stride: 1.8 });
        Object.assign(state.guards[0], { x: 217, y: 392, angle: -1.4, stride: 1 });
        Object.assign(state.guards[1], { x: 494, y: 489, angle: -2.25, stride: 2 });
        Object.assign(state.guards[2], { x: 870, y: 282, angle: 1.72, stride: 3 });
        state.cameras[0].angle = 1.37;
        state.cameras[1].angle = 3.52;
        state.noise.push({ x: 438, y: 287, life: 0.24, radius: 32 });
        phase('play', false);
        return true;
      case 'alert':
        state.attemptTime = 3.55;
        state.elapsed = 46;
        state.alarm = 70;
        state.alert = true;
        state.spotted = 1;
        state.loot.add('mask');
        state.value = 12500;
        Object.assign(state.player, { x: 462, y: 330, angle: -0.20, stride: 1.0, lifting: cases[1], liftTime: 0.52, nearby: 'serpent' });
        Object.assign(state.guards[0], { x: 266, y: 474, angle: 0.35, stride: 2, notice: 0.6, state: 'pursuit' });
        Object.assign(state.guards[1], { x: 389, y: 261, angle: 0.76, seen: 0.72, reach: 185, halfAngle: 0.52 });
        Object.assign(state.guards[2], { x: 871, y: 434, angle: -2.19, stride: 1.1 });
        state.cameras[0].angle = 2.02;
        state.cameras[1].angle = 3.46;
        phase('play', false);
        return true;
      case 'win':
        for (const item of cases) {
          state.loot.add(item.id);
          state.value += item.value;
        }
        state.elapsed = 114;
        phase('win', false);
        return true;
      default:
        phase('title', false);
        return false;
    }
  }

  nodes['start-button'].addEventListener('click', start);
  nodes['again-button'].addEventListener('click', goToTitle);
  nodes['return-button'].addEventListener('click', goToTitle);
  nodes['pause-button'].addEventListener('click', togglePause);
  nodes['sound-button'].addEventListener('click', toggleMute);
  nodes['interrupt-action'].addEventListener('click', () => {
    if (state.phase === 'caught') retry();
    else togglePause();
  });
  window.addEventListener('keydown', event => {
    const code = event.code;
    if (!input.has(code)) return;
    event.preventDefault();

    if (frozen && state.phase === 'play' && code !== 'KeyM') frozen = false;
    if (code === 'KeyP' || code === 'Escape') {
      if (!event.repeat) togglePause();
      return;
    }
    if (code === 'KeyM') {
      if (!event.repeat) toggleMute();
      return;
    }
    if (state.phase !== 'play') return;
    VV.audio.unlock();
    if (!keys.has(code)) pressed.add(code);
    keys.add(code);
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => {
    keys.clear();
    pressed.clear();
  });
  window.addEventListener('resize', resize);

  VV.game = { get state() { return state; } };
  resize();
  frozen = stageShot(requested);
  window.requestAnimationFrame(frame);
})();
