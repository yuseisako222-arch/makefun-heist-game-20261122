(() => {
  'use strict';

  const VV = window.VV;
  let context;
  let muted = false;
  let stepIndex = 0;

  function unlock() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext || muted) return;
    try {
      context ||= new AudioContext();
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch {
      context = null;
    }
  }

  function note(from, to, offset, length, volume, type = 'sine') {
    if (muted || !context || context.state !== 'running') return;
    const begin = context.currentTime + offset;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, begin);
    oscillator.frequency.exponentialRampToValueAtTime(to, begin + length);
    gain.gain.setValueAtTime(0.001, begin);
    gain.gain.linearRampToValueAtTime(volume, begin + 0.007);
    gain.gain.exponentialRampToValueAtTime(0.001, begin + length);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(begin);
    oscillator.stop(begin + length + 0.015);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }

  function melody(pitches, spacing, type = 'triangle') {
    pitches.forEach((pitch, index) => note(pitch, pitch, index * spacing, 0.26, 0.048, type));
  }

  const cues = {
    step() {
      stepIndex = 1 - stepIndex;
      note(123 + stepIndex * 18, 42, 0, 0.083, 0.048, 'triangle');
      note(375, 116, 0, 0.037, 0.019);
    },
    treasure() {
      melody([659.25, 987.77, 1318.51], 0.075);
    },
    star() {
      melody([392, 587.33, 783.99, 1174.66, 1567.98], 0.10);
      note(196, 196, 0.17, 0.46, 0.042);
    },
    laser() {
      note(122, 74, 0, 0.22, 0.052, 'sawtooth');
      note(440, 160, 0.022, 0.17, 0.044, 'square');
    },
    alarm(level) {
      const pitch = 340 + level * 6;
      note(pitch, pitch * 0.92, 0, 0.085, 0.04, 'triangle');
    },
    caught() {
      melody([392, 311.13, 246.94, 146.83], 0.12, 'sawtooth');
      note(110, 64, 0.2, 0.57, 0.09);
    },
    escape() {
      melody([329.63, 392, 493.88, 587.33, 659.25, 783.99], 0.12);
      note(130.81, 130.81, 0.48, 0.87, 0.055);
      note(261.63, 261.63, 0.72, 0.64, 0.062, 'triangle');
    },
  };

  function toggle() {
    muted = !muted;
    if (!muted) unlock();
    return muted;
  }

  VV.audio = { unlock, cues, toggle };
})();
