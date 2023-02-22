export type TypedArrayConstructor =
  | Int8ArrayConstructor
  | Int16ArrayConstructor
  | Int32ArrayConstructor
  | Float32ArrayConstructor;

export type TypedArray = Int8Array | Int16Array | Int32Array | Float32Array;

export interface Option {
  encoding: TypedArrayConstructor;
  channels: number;
  sampleRate: number;
  flushingTime: number;
}

export class PCMPlayer {
  option: Option;
  samples: Float32Array;
  maxValue: number;
  typedArray: TypedArrayConstructor;
  audioCtx: AudioContext;
  gainNode: GainNode;
  startTime: number;
  interval: number;

  #encodings = {
    [Int8Array.name]: 128,
    [Int16Array.name]: 32768,
    [Int32Array.name]: 2147483648,
    [Float32Array.name]: 1,
  };

  constructor(option: Option) {
    const defaults: Option = {
      encoding: Int16Array,
      channels: 1,
      sampleRate: 8000,
      flushingTime: 1000,
    };
    this.option = { ...defaults, ...option };
    this.samples = new Float32Array();
    this.interval = setInterval(this.flush, this.option.flushingTime);
    this.typedArray = this.option.encoding ?? Int16Array;
    this.maxValue = this.#encodings[this.typedArray.name];
    this.createContext();
  }

  createContext() {
    this.audioCtx = new globalThis.AudioContext();
    this.audioCtx.resume();
    this.audioCtx.onstatechange = () => console.log(this.audioCtx.state);

    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.value = 1;
    this.gainNode.connect(this.audioCtx.destination);
    this.startTime = this.audioCtx.currentTime;
  }

  feed = (data: TypedArray) => {
    const float32 = this.getFormatedValue(data);
    const tmp = new Float32Array(this.samples.length + float32.length);
    tmp.set(this.samples, 0);
    tmp.set(float32, this.samples.length);
    this.samples = tmp;
  };

  getFormatedValue(raw: TypedArray): Float32Array {
    const data = new this.typedArray(raw.buffer);
    const float32 = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) float32[i] = data[i] / this.maxValue;
    return float32;
  }

  volume(volume: number) {
    this.gainNode.gain.value = volume;
  }

  destroy() {
    if (this.interval) clearInterval(this.interval);
    this.samples = new Float32Array();
    this.audioCtx.close();
  }

  flush = () => {
    if (!this.samples.length) return;
    const bufferSource = this.audioCtx.createBufferSource();
    const audioBuffer = this.audioCtx.createBuffer(
      this.option.channels,
      this.samples.length / this.option.channels,
      this.option.sampleRate
    );

    for (let c = 0; c < this.option.channels; c++) {
      const channelData = audioBuffer.getChannelData(c);
      for (let i = 0; i < channelData.length; i++) {
        const sample = this.samples[i * this.option.channels + c];
        const f =
          i < 50
            ? i / 50
            : i >= channelData.length - 51
            ? (channelData.length - i - 1) / 50
            : 1;
        channelData[i] += sample * f;
      }
    }

    bufferSource.buffer = audioBuffer;
    bufferSource.connect(this.gainNode);
    bufferSource.start(this.startTime);
    this.startTime += audioBuffer.duration;
    this.samples = new Float32Array();
  };
}
