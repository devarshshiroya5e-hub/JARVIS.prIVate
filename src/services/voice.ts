import { LanguageMode } from '../types';

type SpeechRecognitionConstructor = new () => any;

export class VoiceEngine {
  private recognition: any = null;
  private recognitionCtor: SpeechRecognitionConstructor | null = null;
  private recognitionStarting = false;
  private recognitionRetryTimer: number | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private audioDataArray: Uint8Array | null = null;
  private voicesReady = false;

  public isListening = false;
  public onResult?: (text: string) => void;
  public onWakeWord?: (word: string) => void;
  public onStateChange?: (isListening: boolean) => void;
  public onError?: (message: string) => void;

  public wakeWordEnabled = true;
  public wakeWords = ['jarvis', 'hey jarvis', 'ok jarvis', 'जार्विस', 'हे जार्विस', 'नमस्ते जार्विस'];
  public language: LanguageMode = 'auto';
  public voicePitch = 1.0;
  public voiceRate = 1.05;
  public voiceVolume = 1.0;
  public voiceGender: 'male' | 'female' = 'male';

  constructor() {
    this.initSpeechRecognition();
    this.initSpeechSynthesis();
  }

  private initSpeechRecognition() {
    if (typeof window === 'undefined') return;
    const ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!ctor) return;
    try {
      this.recognitionCtor = ctor as SpeechRecognitionConstructor;
      this.recognition = new ctor();
      this.configureRecognition();
    } catch (error) {
      console.error('Speech recognition initialization failed:', error);
    }
  }

  private configureRecognition() {
    if (!this.recognition) return;
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.updateLanguage();

    this.recognition.onstart = () => {
      this.recognitionStarting = false;
      this.isListening = true;
      this.onStateChange?.(true);
    };

    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result?.isFinal) finalTranscript += result?.[0]?.transcript || '';
      }
      const clean = finalTranscript.trim();
      if (!clean) return;

      const lower = clean.toLowerCase();
      const matched = this.wakeWords.find((word) => lower.includes(word));
      if (this.wakeWordEnabled && matched) {
        this.playChime('wake');
        this.onWakeWord?.(matched);
      }

      this.stopRecognitionOnly();
      this.isListening = false;
      this.onStateChange?.(false);
      this.stopAudioVisualizer();
      this.onResult?.(clean);
    };

    this.recognition.onerror = (event: any) => {
      this.recognitionStarting = false;
      const code = event?.error || 'unknown';

      // These are commonly transient browser-service errors. Retry without
      // turning the JARVIS core red or interrupting the UI.
      if (code === 'network' || code === 'service-not-allowed') {
        if (this.isListening) this.scheduleRecognitionRetry();
        return;
      }

      if (code === 'aborted' || code === 'no-speech') return;

      const messages: Record<string, string> = {
        'audio-capture': 'No microphone was detected. Check the microphone and browser permissions.',
        'not-allowed': 'Microphone permission was denied. Allow microphone access for this site and try again.',
      };
      const message = messages[code] || `Speech recognition error: ${code}`;
      console.warn(message);
      this.isListening = false;
      this.onStateChange?.(false);
      this.onError?.(message);
      this.stopAudioVisualizer();
    };

    this.recognition.onend = () => {
      this.recognitionStarting = false;
      if (this.isListening) this.scheduleRecognitionRetry();
    };
  }

  private scheduleRecognitionRetry() {
    if (this.recognitionRetryTimer !== null || !this.isListening || !this.recognition) return;
    this.recognitionRetryTimer = window.setTimeout(() => {
      this.recognitionRetryTimer = null;
      if (!this.isListening || this.recognitionStarting) return;
      try {
        this.recognitionStarting = true;
        this.recognition.start();
      } catch (_) {
        this.recognitionStarting = false;
      }
    }, 300);
  }

  private initSpeechSynthesis() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const markReady = () => { this.voicesReady = true; };
    window.speechSynthesis.addEventListener('voiceschanged', markReady);
    markReady();
  }

  public setLanguage(lang: LanguageMode) {
    this.language = lang;
    this.updateLanguage();
  }

  private updateLanguage() {
    if (!this.recognition) return;
    this.recognition.lang = this.language === 'hi' ? 'hi-IN' : 'en-US';
  }

  public async startListening(lang?: LanguageMode): Promise<boolean> {
    if (lang) this.setLanguage(lang);

    if (!this.recognition && this.recognitionCtor) {
      try {
        this.recognition = new this.recognitionCtor();
        this.configureRecognition();
      } catch (_) {}
    }

    if (!this.recognition) {
      this.onError?.('Voice input is not supported here. Please use the latest Chrome or Edge.');
      return false;
    }

    this.stopSpeaking();
    this.isListening = true;
    this.onStateChange?.(true);
    await this.initAudioVisualizer();

    if (!this.isListening) return false;
    try {
      this.recognitionStarting = true;
      this.recognition.start();
      return true;
    } catch (_) {
      this.recognitionStarting = false;
      try {
        await new Promise((resolve) => window.setTimeout(resolve, 100));
        if (!this.isListening) return false;
        this.recognitionStarting = true;
        this.recognition.start();
        return true;
      } catch (error: any) {
        this.recognitionStarting = false;
        this.isListening = false;
        this.onStateChange?.(false);
        this.onError?.(error?.message || 'Could not start microphone recognition. Check browser permissions.');
        this.stopAudioVisualizer();
        return false;
      }
    }
  }

  private stopRecognitionOnly() {
    if (this.recognitionRetryTimer !== null) {
      window.clearTimeout(this.recognitionRetryTimer);
      this.recognitionRetryTimer = null;
    }
    if (this.recognition) {
      try { this.recognition.stop(); } catch (_) {}
    }
    this.recognitionStarting = false;
  }

  public stopListening(notify = true) {
    this.isListening = false;
    this.stopRecognitionOnly();
    if (notify) this.onStateChange?.(false);
    this.stopAudioVisualizer();
  }

  private async initAudioVisualizer() {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      if (!this.audioContext) {
        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextCtor) return;
        this.audioContext = new AudioContextCtor();
      }
      if (this.audioContext.state === 'suspended') await this.audioContext.resume();
      if (this.micStream) return;

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.65;
      source.connect(this.analyser);
      this.audioDataArray = new Uint8Array(this.analyser.frequencyBinCount);
    } catch (error) {
      // Visualizer failure must never disable SpeechRecognition.
      console.warn('Microphone visualizer unavailable:', error);
    }
  }

  private stopAudioVisualizer() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
  }

  public getAudioFrequencyData(): Uint8Array | null {
    if (this.analyser && this.audioDataArray) {
      this.analyser.getByteFrequencyData(this.audioDataArray);
      return this.audioDataArray;
    }
    return null;
  }

  public getAverageAudioVolume(): number {
    const data = this.getAudioFrequencyData();
    if (!data?.length) return 0;
    let sum = 0;
    for (const value of data) sum += value;
    return sum / data.length;
  }

  public speak(text: string, lang: 'en' | 'hi' | 'auto' = 'auto', gender: 'male' | 'female' = 'male', rate?: number, pitch?: number): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return resolve();
      const synth = window.speechSynthesis;
      this.stopListening();
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = Math.min(2, Math.max(0.5, rate ?? this.voiceRate));
      utterance.pitch = Math.min(2, Math.max(0, pitch ?? this.voicePitch));
      utterance.volume = Math.min(1, Math.max(0, this.voiceVolume));
      const hasDevanagari = /[\u0900-\u097F]/.test(text);
      const targetLang = lang === 'hi' || (lang === 'auto' && hasDevanagari) ? 'hi-IN' : 'en-US';
      utterance.lang = targetLang;

      const chooseVoice = () => {
        const voices = synth.getVoices();
        let matched: SpeechSynthesisVoice | undefined;
        if (targetLang === 'hi-IN') {
          matched = voices.find((v) => v.lang.toLowerCase().startsWith('hi')) || voices.find((v) => v.name.toLowerCase().includes('hindi'));
        } else if (gender === 'male') {
          matched = voices.find((v) => v.lang.toLowerCase() === 'en-gb' && /daniel|george|male/i.test(v.name)) || voices.find((v) => v.lang.toLowerCase().startsWith('en-gb')) || voices.find((v) => v.lang.toLowerCase().startsWith('en-us'));
        } else {
          matched = voices.find((v) => v.lang.toLowerCase().startsWith('en-us')) || voices.find((v) => v.lang.toLowerCase().startsWith('en'));
        }
        if (matched) utterance.voice = matched;
      };

      if (!this.voicesReady || synth.getVoices().length === 0) synth.addEventListener('voiceschanged', chooseVoice, { once: true });
      else chooseVoice();
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      synth.speak(utterance);
    });
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  public playChime(type: 'wake' | 'success' | 'execute' | 'error') {
    try {
      if (!this.audioContext) {
        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextCtor) return;
        this.audioContext = new AudioContextCtor();
      }
      const ctx = this.audioContext;
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;
      if (type === 'wake') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(587.33, now); osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3); osc.start(now); osc.stop(now + 0.3);
      } else if (type === 'success') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(523.25, now); osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.15); gain.gain.setValueAtTime(0.06, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35); osc.start(now); osc.stop(now + 0.35);
      } else if (type === 'execute') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(440, now); gain.gain.setValueAtTime(0.04, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15); osc.start(now); osc.stop(now + 0.15);
      } else {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(220, now); osc.frequency.exponentialRampToValueAtTime(110, now + 0.25); gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25); osc.start(now); osc.stop(now + 0.25);
      }
    } catch (_) {}
  }
}

export const voiceEngine = new VoiceEngine();
