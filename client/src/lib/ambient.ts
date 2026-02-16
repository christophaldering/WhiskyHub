export type Soundscape = 'fireplace' | 'rain' | 'night' | 'bagpipe';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let activeNodes: AudioNode[] = [];
let activeSoundscape: Soundscape | null = null;
let isPlaying = false;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function cleanup() {
  activeNodes.forEach((node) => {
    try {
      node.disconnect();
      if ('stop' in node && typeof (node as any).stop === 'function') {
        (node as any).stop();
      }
    } catch {}
  });
  activeNodes = [];
}

function createBrownNoise(ctx: AudioContext, gain: GainNode) {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * white) / 1.02;
      last = data[i];
      data[i] *= 3.5;
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 300;

  source.connect(filter);
  filter.connect(gain);
  source.start();

  activeNodes.push(source, filter);
}

function createCrackle(ctx: AudioContext, gain: GainNode) {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    if (Math.random() < 0.001) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
      const decay = Math.floor(Math.random() * 800) + 200;
      for (let j = 1; j < decay && i + j < bufferSize; j++) {
        data[i + j] = data[i] * Math.exp(-j / (decay * 0.3)) * (Math.random() * 0.5 + 0.5);
      }
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const crackleGain = ctx.createGain();
  crackleGain.gain.value = 0.4;

  source.connect(crackleGain);
  crackleGain.connect(gain);
  source.start();

  activeNodes.push(source, crackleGain);
}

function createFireplace(ctx: AudioContext, gain: GainNode) {
  createBrownNoise(ctx, gain);
  createCrackle(ctx, gain);
}

function createRain(ctx: AudioContext, gain: GainNode) {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 800;
  bandpass.Q.value = 0.5;

  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 200;

  const rainGain = ctx.createGain();
  rainGain.gain.value = 0.5;

  source.connect(bandpass);
  bandpass.connect(highpass);
  highpass.connect(rainGain);
  rainGain.connect(gain);
  source.start();

  activeNodes.push(source, bandpass, highpass, rainGain);

  const dropBuffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const dropData = dropBuffer.getChannelData(0);
  for (let i = 0; i < dropBuffer.length; i++) {
    if (Math.random() < 0.003) {
      const amp = Math.random() * 0.3 + 0.1;
      const len = Math.floor(Math.random() * 400) + 100;
      for (let j = 0; j < len && i + j < dropBuffer.length; j++) {
        dropData[i + j] += amp * Math.exp(-j / (len * 0.2)) * (Math.random() * 2 - 1);
      }
    }
  }

  const dropSource = ctx.createBufferSource();
  dropSource.buffer = dropBuffer;
  dropSource.loop = true;

  const dropGain = ctx.createGain();
  dropGain.gain.value = 0.25;

  dropSource.connect(dropGain);
  dropGain.connect(gain);
  dropSource.start();

  activeNodes.push(dropSource, dropGain);
}

function createNight(ctx: AudioContext, gain: GainNode) {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (last + 0.01 * white) / 1.01;
      last = data[i];
      data[i] *= 2;
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 180;

  const nightGain = ctx.createGain();
  nightGain.gain.value = 0.6;

  source.connect(filter);
  filter.connect(nightGain);
  nightGain.connect(gain);
  source.start();

  activeNodes.push(source, filter, nightGain);

  const cricketRate = 4;
  const cricketDuration = 3;
  const cricketBuffer = ctx.createBuffer(1, ctx.sampleRate * cricketDuration, ctx.sampleRate);
  const cricketData = cricketBuffer.getChannelData(0);

  for (let i = 0; i < cricketBuffer.length; i++) {
    const t = i / ctx.sampleRate;
    const chirp = Math.sin(2 * Math.PI * 4800 * t) * Math.sin(2 * Math.PI * cricketRate * t);
    const envelope = Math.max(0, Math.sin(2 * Math.PI * cricketRate * t));
    cricketData[i] = chirp * envelope * 0.03;
  }

  const cricketSource = ctx.createBufferSource();
  cricketSource.buffer = cricketBuffer;
  cricketSource.loop = true;

  const cricketGain = ctx.createGain();
  cricketGain.gain.value = 0.5;

  cricketSource.connect(cricketGain);
  cricketGain.connect(gain);
  cricketSource.start();

  activeNodes.push(cricketSource, cricketGain);
}

function createBagpipe(ctx: AudioContext, gain: GainNode) {
  const droneFreqs = [130.81, 196.0, 261.63];
  droneFreqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    const oscGain = ctx.createGain();
    oscGain.gain.value = idx === 0 ? 0.18 : 0.09;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600 + idx * 200;
    filter.Q.value = 2;

    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(gain);
    osc.start();
    activeNodes.push(osc, filter, oscGain);
  });

  const melodyNotes = [392, 440, 494, 523, 587, 523, 494, 440, 392, 349, 330, 349, 392, 440, 494, 523];
  const noteDuration = 0.6;
  const totalDuration = melodyNotes.length * noteDuration;
  const bufferLength = Math.ceil(ctx.sampleRate * totalDuration);
  const melodyBuffer = ctx.createBuffer(1, bufferLength, ctx.sampleRate);
  const data = melodyBuffer.getChannelData(0);

  for (let n = 0; n < melodyNotes.length; n++) {
    const freq = melodyNotes[n];
    const startSample = Math.floor(n * noteDuration * ctx.sampleRate);
    const endSample = Math.floor((n + 1) * noteDuration * ctx.sampleRate);
    for (let i = startSample; i < endSample && i < bufferLength; i++) {
      const t = (i - startSample) / ctx.sampleRate;
      const notePos = (i - startSample) / (endSample - startSample);
      const env = Math.min(1, notePos * 20) * Math.min(1, (1 - notePos) * 8);
      const saw = 2 * ((t * freq) % 1) - 1;
      const harmonic = Math.sin(2 * Math.PI * freq * 2 * t) * 0.3;
      data[i] = (saw + harmonic) * env * 0.12;
    }
  }

  const melodySource = ctx.createBufferSource();
  melodySource.buffer = melodyBuffer;
  melodySource.loop = true;

  const melodyFilter = ctx.createBiquadFilter();
  melodyFilter.type = 'bandpass';
  melodyFilter.frequency.value = 800;
  melodyFilter.Q.value = 1.5;

  const melodyGain = ctx.createGain();
  melodyGain.gain.value = 0.55;

  melodySource.connect(melodyFilter);
  melodyFilter.connect(melodyGain);
  melodyGain.connect(gain);
  melodySource.start();
  activeNodes.push(melodySource, melodyFilter, melodyGain);

  const breathBuffer = ctx.createBuffer(2, 2 * ctx.sampleRate, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const chData = breathBuffer.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < breathBuffer.length; i++) {
      const white = Math.random() * 2 - 1;
      chData[i] = (last + 0.015 * white) / 1.015;
      last = chData[i];
      chData[i] *= 1.5;
    }
  }
  const breathSource = ctx.createBufferSource();
  breathSource.buffer = breathBuffer;
  breathSource.loop = true;
  const breathFilter = ctx.createBiquadFilter();
  breathFilter.type = 'bandpass';
  breathFilter.frequency.value = 400;
  breathFilter.Q.value = 0.8;
  const breathGain = ctx.createGain();
  breathGain.gain.value = 0.06;
  breathSource.connect(breathFilter);
  breathFilter.connect(breathGain);
  breathGain.connect(gain);
  breathSource.start();
  activeNodes.push(breathSource, breathFilter, breathGain);
}

export function playSoundscape(soundscape: Soundscape) {
  const ctx = getContext();
  cleanup();

  switch (soundscape) {
    case 'fireplace':
      createFireplace(ctx, masterGain!);
      break;
    case 'rain':
      createRain(ctx, masterGain!);
      break;
    case 'night':
      createNight(ctx, masterGain!);
      break;
    case 'bagpipe':
      createBagpipe(ctx, masterGain!);
      break;
  }

  activeSoundscape = soundscape;
  isPlaying = true;
}

export function stopSoundscape() {
  cleanup();
  activeSoundscape = null;
  isPlaying = false;
  if (audioCtx && audioCtx.state === 'running') {
    audioCtx.suspend();
  }
}

export function setVolume(vol: number) {
  const clamped = Math.max(0, Math.min(1, vol));
  if (masterGain && audioCtx) {
    masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
    masterGain.gain.value = clamped;
  }
}

export function getState() {
  return { isPlaying, activeSoundscape };
}
