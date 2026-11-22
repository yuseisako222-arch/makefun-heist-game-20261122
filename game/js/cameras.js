(() => {
  'use strict';

  const VV = window.VV;
  const { cameras } = VV.museum;

  function create() {
    return cameras.map((mount, index) => ({
      ...mount, index, angle: mount.direction,
      halfAngle: 0.39, reach: 179, blind: 28, seen: 0,
    }));
  }

  function update(units, player, time) {
    let detection = 0;
    for (const camera of units) {
      camera.angle = camera.direction + camera.sweep * Math.sin(time * Math.PI * 2 / camera.period + camera.phase);
      camera.seen = VV.vision.exposure(camera, camera.angle, camera.halfAngle, camera.reach, player, camera.blind);
      detection += 24 * camera.seen;
    }
    return detection;
  }

  VV.cameras = { create, update };
})();
