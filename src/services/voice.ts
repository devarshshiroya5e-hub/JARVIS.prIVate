import { LanguageMode } from '../types';

type SpeechRecognitionConstructor = new () => any;

type SpeakOptions = {
  rate?: number;
  pitch?: number;
  volume?: number;
  gender?: 'male' | 'female';
};

export class VoiceEngine {
  private recognition: any = null;
  private recognitionCtor: SpeechRecognitionConstructor | null = null;
  private recognitionStarting = false;
  private recognitionRetryTimer: number | null = null;
  private audioContext: AudioContext | null = null;
  private voicesReady = false;
  private speechGeneration = 0;

  public isListening = false;
  public isSpeaking = false;
  public onResult?: (text: string) => void;
  public onWakeWord?: (word: string) => void;
  public onStateChange?: (isListening: boolean) => void;
  public onError?: (message: string) => void;
  public onSpeakingChange?: (speaking: boolean) => void;

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
    } catch (_) {}
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
      this.onResult?.(clean);
    };

    this.recognition.onerror = (event: any) => {
      this.recognitionStarting = false;
      const code = event?.error || 'unknown';
      if (code === 'network' || code === 'service-not-allowed') {
        if (this.isListening) this.scheduleRecognitionRetry();
        return;
      }
      if (code === 'aborted' || code === 'no-speech') return;
      this.isListening = false;
      this.onStateChange?.(false);
      this.onError?.(`Voice recognition error: ${code}`);
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
    }, 350);
  }

  private initSpeechSynthesis() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const markReady = () => {
      this.voicesReady = synth.getVoices().length > 0;
    };
    synth.addEventListener('voiceschanged', markReady);
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
      this.onError?.('Speech recognition is not supported by this browser.');
      return false;
    }

    this.stopSpeaking();
    this.isListening = true;
    this.onStateChange?.(true);

    try {
      this.recognitionStarting = true;
      this.recognition.start();
      return true;
    } catch (_) {
      this.recognitionStarting = false;
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      if (!this.isListening) return false;
      try {
        this.recognitionStarting = true;
        this.recognition.start();
        return true;
      } catch (_) {
        this.recognitionStarting = false;
        this.isListening = false;
        this.onStateChange?.(false);
        this.onError?.('Microphone could not be started. Check browser microphone permission.');
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
  }

  private async waitForVoices(timeoutMs = 1500) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [] as SpeechSynthesisVoice[];
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing.length) {
      this.voicesReady = true;
      return existing;
    }
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        synth.removeEventListener('voiceschanged', finish);
        resolve();
      };
      synth.addEventListener('voiceschanged', finish, { once: true });
      window.setTimeout(finish, timeoutMs);
      try { synth.getVoices(); } catch (_) {}
    });
    const voices = synth.getVoices();
    this.voicesReady = voices.length > 0;
    return voices;
  }

  private selectVoice(voices: SpeechSynthesisVoice[], targetLang: string, gender: 'male' | 'female') {
    const langPrefix = targetLang.toLowerCase().split('-')[0];
    const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
    if (!langVoices.length) return voices[0];
    if (targetLang === 'hi-IN') {
      return langVoices.find((v) => /hindi|india/i.test(v.name)) || langVoices[0];
    }
    if (gender === 'male') {
      return langVoices.find((v) => /male|daniel|george|alex|david|mark/i.test(v.name)) || langVoices.find((v) => v.lang.toLowerCase() === 'en-gb') || langVoices[0];
    }
    return langVoices.find((v) => /female|samantha|zira|susan|karen/i.test(v.name)) || langVoices[0];
  }

  private splitSpeech(text: string, maxChars = 180) {
    const clean = text.replace(/```[\s\S]*?```/g, ' code block ').replace(/[#*_>`]/g, '').replace(/\s+/g, ' ').trim();
    if (clean.length <= maxChars) return clean ? [clean] : [];
    const chunks: string[] = [];
    let remaining = clean;
    while (remaining.length > maxChars) {
      let cut = Math.max(60, remaining.lastIndexOf(' ', maxChars));
      if (cut < 60) cut = maxChars;
      chunks.push(remaining.slice(0, cut).trim());
      remaining = remaining.slice(cut).trim();
    }
    if (remaining) chunks.push(remaining);
    return chunks;
  }

  public async speak(text: string, lang: 'en' | 'hi' | 'auto' = 'auto', gender: 'male' | 'female' = this.voiceGender, rate = this.voiceRate, pitch = this.voicePitch): Promise<void> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.onError?.('Speech synthesis is not supported by this browser.');
      return;
    }
    const cleanText = text?.trim();
    if (!cleanText) return;

    const synth = window.speechSynthesis;
    const generation = ++this.speechGeneration;
    this.stopListening();
    synth.cancel();
    try { synth.resume(); } catch (_) {}

    const voices = await this.waitForVoices();
    if (generation !== this.speechGeneration) return;
    const hasDevanagari = /[\u0900-\u097F]/.test(cleanText);
    const targetLang = lang === 'hi' || (lang === 'auto' && hasDevanagari) ? 'hi-IN' : 'en-US';
    const voice = this.selectVoice(voices, targetLang, gender);
    const chunks = this.splitSpeech(cleanText);
    if (!chunks.length) return;

    this.isSpeaking = true;
    this.onSpeakingChange?.(true);
    try {
      for (const chunk of chunks) {
        if (generation !== this.speechGeneration) break;
        await new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(chunk);
          utterance.lang = targetLang;
          utterance.rate = Math.min(2, Math.max(0.5, rate));
          utterance.pitch = Math.min(2, Math.max(0, pitch));
          utterance.volume = Math.min(1, Math.max(0, this.voiceVolume));
          if (voice) utterance.voice = voice;
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
          };
          utterance.onend = finish;
          utterance.onerror = finish;
          try {
            synth.speak(utterance);
            // Chrome can occasionally stall an utterance without firing onend.
            window.setTimeout(() => {
              if (!synth.speaking) finish();
            }, Math.max(3000, chunk.length * 120));
          } catch (_) {
            finish();
          }
        });
      }
    } finally {
      if (generation === this.speechGeneration) {
        this.isSpeaking = false;
        this.onSpeakingChange?.(false);
      }
    }
  }

  public stopSpeaking() {
    this.speechGeneration++;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      synth.cancel();
      try { synth.resume(); } catch (_) {}
    }
    if (this.isSpeaking) {
      this.isSpeaking = false;
      this.onSpeakingChange?.(false);
    }
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
      const presets = {
        wake: ['sine', 587.33, 880, 0.30, 0.08],
        success: ['sine', 523.25, 1046.5, 0.35, 0.06],
        execute: ['triangle', 440, 440, 0.15, 0.04],
        error: ['sawtooth', 220, 110, 0.25, 0.05],
      } as const;
      const [wave, startFreq, endFreq, duration, volume] = presets[type];
      osc.type = wave;
      osc.frequency.setValueAtTime(startFreq, now);
      if (startFreq !== endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.start(now);
      osc.stop(now + duration);
    } catch (_) {}
  }
}

export const voiceEngine = new VoiceEngine();