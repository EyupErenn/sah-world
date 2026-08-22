export type FocusSoundId = 'none' | 'ticking' | 'countdown' | 'wind' | 'classroom' | 'wildlife'

export const FOCUS_SOUNDS: Array<{ id: FocusSoundId; label: string; icon: string; note: string }> = [
  { id: 'none', label: 'Hiçbiri', icon: 'volume-off', note: 'Sessiz bir odak alanı' },
  { id: 'ticking', label: 'Tik-tak', icon: 'clock', note: 'Yumuşak mekanik ritim' },
  { id: 'countdown', label: 'Geri Sayım', icon: 'bell', note: 'Son saniyelerde nazik uyarı' },
  { id: 'wind', label: 'Rüzgar ve Cırcır Böcekleri', icon: 'wind', note: 'Hafif gece esintisi' },
  { id: 'classroom', label: 'Sınıf', icon: 'school', note: 'Sakin çalışma ortamı' },
  { id: 'wildlife', label: 'Vahşi Doğa', icon: 'trees', note: 'Uzak kuşlar ve orman dokusu' },
]

type StoppableNode = AudioScheduledSourceNode | OscillatorNode

export class FocusAudioEngine {
  private context: AudioContext | null = null
  private gain: GainNode | null = null
  private nodes: StoppableNode[] = []
  private timers: number[] = []
  private sound: FocusSoundId = 'none'
  private volume = .35

  async start(sound: FocusSoundId, volume = this.volume) {
    this.stop()
    this.sound = sound
    this.volume = volume
    if (sound === 'none' || sound === 'countdown') return
    this.context = this.context ?? new AudioContext()
    await this.context.resume()
    this.gain = this.context.createGain()
    this.gain.gain.value = volume * .22
    this.gain.connect(this.context.destination)
    if (sound === 'ticking') this.startTicking()
    else this.startNoise(sound)
  }

  setVolume(volume: number) {
    this.volume = volume
    if (this.context && this.gain) this.gain.gain.setTargetAtTime(volume * .22, this.context.currentTime, .05)
  }

  beep(frequency = 720, duration = .12) {
    const context = this.context ?? new AudioContext()
    this.context = context
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = frequency
    oscillator.type = 'sine'
    gain.gain.setValueAtTime(Math.max(.02, this.volume * .16), context.currentTime)
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + duration)
  }

  stop() {
    this.timers.forEach((timer) => window.clearInterval(timer))
    this.timers = []
    this.nodes.forEach((node) => { try { node.stop() } catch {} })
    this.nodes = []
    this.gain?.disconnect()
    this.gain = null
  }

  get activeSound() { return this.sound }

  private startTicking() {
    const tick = () => {
      if (!this.context || !this.gain) return
      const oscillator = this.context.createOscillator()
      const gain = this.context.createGain()
      oscillator.frequency.value = 1100
      gain.gain.setValueAtTime(.12, this.context.currentTime)
      gain.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + .035)
      oscillator.connect(gain).connect(this.gain)
      oscillator.start()
      oscillator.stop(this.context.currentTime + .04)
    }
    tick()
    this.timers.push(window.setInterval(tick, 1000))
  }

  private startNoise(sound: Exclude<FocusSoundId, 'none' | 'ticking' | 'countdown'>) {
    if (!this.context || !this.gain) return
    const length = this.context.sampleRate * 3
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1
    const source = this.context.createBufferSource()
    const filter = this.context.createBiquadFilter()
    source.buffer = buffer
    source.loop = true
    filter.type = sound === 'classroom' ? 'lowpass' : 'bandpass'
    filter.frequency.value = sound === 'wind' ? 420 : sound === 'classroom' ? 680 : 1550
    filter.Q.value = sound === 'wildlife' ? .55 : .35
    source.connect(filter).connect(this.gain)
    source.start()
    this.nodes.push(source)
    if (sound !== 'classroom') this.startNatureChirps(sound === 'wildlife' ? 4200 : 6800)
  }

  private startNatureChirps(interval: number) {
    const chirp = () => {
      if (!this.context || !this.gain) return
      const oscillator = this.context.createOscillator()
      const gain = this.context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(1600 + Math.random() * 900, this.context.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(2400 + Math.random() * 700, this.context.currentTime + .16)
      gain.gain.setValueAtTime(.001, this.context.currentTime)
      gain.gain.exponentialRampToValueAtTime(.08, this.context.currentTime + .025)
      gain.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + .2)
      oscillator.connect(gain).connect(this.gain)
      oscillator.start()
      oscillator.stop(this.context.currentTime + .22)
    }
    this.timers.push(window.setInterval(chirp, interval))
  }
}
