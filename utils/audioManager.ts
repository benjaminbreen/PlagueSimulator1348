
// A procedural audio synthesizer to avoid external assets
class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambienceNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
  private isMuted: boolean = false;
  private isInitialized: boolean = false;
  private volume: number = 0.5;

  init() {
    if (this.isInitialized) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = this.volume;
    this.isInitialized = true;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this.isMuted ? 0 : this.volume, 
        this.ctx!.currentTime, 
        0.1
      );
    }
    return this.isMuted;
  }

  setVolume(val: number) {
      this.volume = val;
      if (this.masterGain && !this.isMuted) {
          this.masterGain.gain.setTargetAtTime(val, this.ctx!.currentTime, 0.1);
      }
  }

  // --- SOUND FX ---

  playBlip() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  playTypewriter() {
    if (!this.ctx || this.isMuted) return;
    // Filtered noise click
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.01; // 10ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.05;
    
    // Lowpass filter to make it sound like a dull mechanical thud
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    noise.start(t);
  }

  playHeartbeat() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  // --- AMBIENCE ---

  startAmbience() {
    if (!this.ctx || this.ambienceNodes.length > 0) return;

    // Create a low rumble (Pink noise approximation via low oscs)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    
    osc1.type = 'triangle';
    osc1.frequency.value = 55; // Low drone A
    gain1.gain.value = 0.01; // Very subtle

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1; // Slow modulation
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.005;
    
    lfo.connect(lfoGain);
    lfoGain.connect(gain1.gain);

    osc1.connect(gain1);
    gain1.connect(this.masterGain!);
    
    osc1.start();
    lfo.start();

    this.ambienceNodes.push({ osc: osc1, gain: gain1 });
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
}

export const audioManager = new AudioManager();
