/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private playbackQueue: Int16Array[] = [];
  private isPlaying = false;
  private nextStartTime = 0;

  constructor(private sampleRate: number = 16000, private outputSampleRate: number = 24000) {}

  async start(onAudioData: (base64Data: string) => void) {
    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    
    // Using ScriptProcessorNode for simplicity in this environment, 
    // though AudioWorklet is preferred in modern apps.
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmData = this.float32ToInt16(inputData);
      const base64Data = this.arrayBufferToBase64(pcmData.buffer);
      onAudioData(base64Data);
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  stop() {
    this.source?.disconnect();
    this.processor?.disconnect();
    this.stream?.getTracks().forEach(track => track.stop());
    this.audioContext?.close();
    this.audioContext = null;
    this.stream = null;
    this.processor = null;
    this.source = null;
    this.playbackQueue = [];
    this.isPlaying = false;
  }

  addAudioChunk(base64Data: string) {
    const arrayBuffer = this.base64ToArrayBuffer(base64Data);
    const pcmData = new Int16Array(arrayBuffer);
    this.playbackQueue.push(pcmData);
    if (!this.isPlaying) {
      this.playNextChunk();
    }
  }

  private async playNextChunk() {
    if (this.playbackQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const pcmData = this.playbackQueue.shift()!;
    const float32Data = this.int16ToFloat32(pcmData);
    
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: this.outputSampleRate });
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, this.outputSampleRate);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;

    source.onended = () => {
      this.playNextChunk();
    };
  }

  clearQueue() {
    this.playbackQueue = [];
    this.nextStartTime = 0;
  }

  private float32ToInt16(buffer: Float32Array): Int16Array {
    const l = buffer.length;
    const buf = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      buf[i] = Math.min(1, Math.max(-1, buffer[i])) * 0x7FFF;
    }
    return buf;
  }

  private int16ToFloat32(buffer: Int16Array): Float32Array {
    const l = buffer.length;
    const buf = new Float32Array(l);
    for (let i = 0; i < l; i++) {
      buf[i] = buffer[i] / 0x7FFF;
    }
    return buf;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
