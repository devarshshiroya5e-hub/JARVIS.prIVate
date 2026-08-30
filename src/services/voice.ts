import { LanguageMode } from '../types';

export class VoiceEngine {
  private recognition: any = null;
  public isListening = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private audioDataArray: Uint8Array | null = null;

  public onResult?: (text: string) => void;
  public onWakeWord?: (word: string) => void;
  public onStateChange?: (isListening: boolean) => void;

  public wakeWordEnabled = true;
  public wakeWords = ['jarvis', 'hey jarvis', 'ok jarvis', 'जार्विस', 'हे जार्विस', 'नमस्ते जार्विस'];
  public language: LanguageMode = 'auto';
  public voicePitch = 1.0;
  public voiceRate = 1.05;
  public voiceVolume = 1.0;
  public voiceGender: 'male' | 'female' = 'male';

  constructor() {
    this.initSpeechRecognition();
  }

  private initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not available in this browser.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;
      this.updateLanguage();

      this.recognition.onresult = (event: any) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript.trim();

        // Check for wake word
        if (this.wakeWordEnabled && currentText) {
          const lower = currentText.toLowerCase();
          const matched = this.wakeWords.find((w) => lower.includes(w));
          if (matched && this.onWakeWord) {
            this.playChime('wake');
            this.onWakeWord(matched);
          }
        }

        if (this.onResult && currentText) {
          this.onResult(currentText);
        }
      };

      this.recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('Speech recognition error:', event.error);
        }
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch (_) {}
        }
      };
    } catch (e) {
      console.error('Failed to initialize Speech Recognition:', e);
    }
  }

  public setLanguage(lang: LanguageMode) {
    this.language = lang;
    this.updateLanguage();
  }

  private updateLanguage() {
    if (!this.recognition) return;
    if (this.language === 'hi') {
      this.recognition.lang = 'hi-IN';
    } else if (this.language === 'en') {
      this.recognition.lang = 'en-US';
    } else {
      this.recognition.lang = 'en-US';
    }
  }

  public async startListening(lang?: LanguageMode) {
    if (lang) {
      this.setLanguage(lang);
    }
    this.isListening = true;
    if (this.onStateChange) this.onStateChange(true);

    try {
      if (this.recognition) {
        this.recognition.start();
      }
    } catch (e) {
      // Already running
    }

    await this.initAudioVisualizer();
  }

  public stopListening() {
    this.isListening = false;
    if (this.onStateChange) this.onStateChange(false);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (_) {}
    }
    this.stopAudioVisualizer();
  }

  // Web Audio Analyzer for dynamic audio waveforms and orb frequency reaction
  private async initAudioVisualizer() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);
      this.audioDataArray = new Uint8Array(this.analyser.frequencyBinCount);
    } catch (e) {
      console.warn('Microphone visualizer stream unavailable:', e);
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
    if (!data || data.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return sum / data.length;
  }

  // Bilingual Speech Synthesis
  public speak(
    text: string,
    lang: 'en' | 'hi' | 'auto' = 'auto',
    gender: 'male' | 'female' = 'male',
    rate?: number,
    pitch?: number
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.warn('SpeechSynthesis not supported.');
        return resolve();
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate ?? this.voiceRate;
      utterance.pitch = pitch ?? this.voicePitch;
      utterance.volume = this.voiceVolume;

      // Check if text is predominantly Hindi/Devanagari
      const hasDevanagari = /[\u0900-\u097F]/.test(text);
      const targetLang = lang === 'hi' || (lang === 'auto' && hasDevanagari) ? 'hi-IN' : 'en-US';
      utterance.lang = targetLang;

      const voices = window.speechSynthesis.getVoices();
      let matchedVoice = null;

      if (targetLang === 'hi-IN') {
        matchedVoice = voices.find(
          (v) =>
            v.lang.includes('hi') ||
            v.name.toLowerCase().includes('hindi') ||
            v.name.toLowerCase().includes('india')
        );
      } else {
        if (gender === 'male') {
          matchedVoice =
            voices.find((v) => v.lang.includes('en-GB') && v.name.toLowerCase().includes('male')) ||
            voices.find(
              (v) =>
                v.lang.includes('en-GB') ||
                v.name.toLowerCase().includes('daniel') ||
                v.name.toLowerCase().includes('george')
            ) ||
            voices.find(
              (v) =>
                v.lang.includes('en-US') &&
                (v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('guy'))
            ) ||
            voices.find((v) => v.lang.startsWith('en'));
        } else {
          matchedVoice =
            voices.find((v) => v.lang.includes('en-US') && v.name.toLowerCase().includes('female')) ||
            voices.find(
              (v) =>
                v.lang.includes('en-US') ||
                v.name.toLowerCase().includes('samantha') ||
                v.name.toLowerCase().includes('victoria')
            ) ||
            voices.find((v) => v.lang.startsWith('en'));
        }
      }

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }

  public stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  // Futuristic Web Audio Synthesizer Chimes
  public playChime(type: 'wake' | 'success' | 'execute' | 'error') {
    try {
      const ctx = this.audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'wake') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.15);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'execute') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        gain.gain.exponentialRampToValueAtTime(110, now + 0.25);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (_) {}
  }
}

export const voiceEngine = new VoiceEngine();
