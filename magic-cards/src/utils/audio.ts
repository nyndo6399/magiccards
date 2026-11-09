class SoundEffects {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playFlip() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(540, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Ignore audio context errors
    }
  }

  playReveal() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.28);
    } catch {
      // Ignore
    }
  }

  playSuccess() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.3);
      });
    } catch {
      // Ignore
    }
  }
}

export const sfx = new SoundEffects();

export interface VoicePreset {
  id: string;
  name: string;
  tag: string;
  emoji: string;
}

export const PRESET_VOICES: VoicePreset[] = [
  { id: 'en-us-natural', name: 'Mỹ Bản Xứ Tự Nhiên (US Natural HD)', tag: 'Khuyên Dùng', emoji: '🌟' },
  { id: 'en-uk-natural', name: 'Anh - Anh Chuẩn Oxford (UK English HD)', tag: 'Chuẩn Bản Xứ', emoji: '🇬🇧' },
  { id: 'en-us-youdao', name: 'Mỹ Năng Động (US Native Clear)', tag: 'Rõ Ràng', emoji: '🇺🇸' },
  { id: 'en-au-natural', name: 'Úc Tự Nhiên (Australian English HD)', tag: 'Thân Thiện', emoji: '🇦🇺' },
];

export class SpeechService {
  private currentAudio: HTMLAudioElement | null = null;
  public selectedVoice: string = 'en-us-natural';
  private currentRequestId: number = 0;
  private lastSpeakTime: number = 0;
  private lastSpokenText: string = '';

  stop() {
    // Invalidate any ongoing or pending requests
    this.currentRequestId++;

    if (this.currentAudio) {
      try {
        // Detach listeners before pausing/resetting to prevent onerror firing on clear
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.currentAudio.pause();
        this.currentAudio.removeAttribute('src');
      } catch {
        // Ignore audio pause errors
      }
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  }

  speak(text: string, voiceName: string = this.selectedVoice) {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();

    // Prevent duplicate triggers if clicked multiple times rapidly (within 350ms)
    const now = Date.now();
    if (cleanText === this.lastSpokenText && now - this.lastSpeakTime < 350) {
      return;
    }
    this.lastSpeakTime = now;
    this.lastSpokenText = cleanText;

    // Stop previous audio and speech synthesis immediately
    this.stop();
    const requestId = this.currentRequestId;

    const containsVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(cleanText);
    const isExplicitViVoice = voiceName === 'vi-standard' || voiceName === 'vi-browser' || voiceName.toLowerCase().includes('vietnam') || voiceName.toLowerCase().startsWith('vi');
    const shouldUseVietnamese = isExplicitViVoice || containsVietnamese;

    let fallbackTriggered = false;
    const triggerFallbackOnce = (type: 'us' | 'uk' | 'cartoon' | 'vi' = 'us') => {
      if (fallbackTriggered || requestId !== this.currentRequestId) return;
      fallbackTriggered = true;
      this.speakWebSpeech(cleanText, voiceName, shouldUseVietnamese, type, requestId);
    };

    // 1. Vietnamese HD audio via Google TTS
    if (shouldUseVietnamese || voiceName === 'vi-standard') {
      try {
        const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
        this.playAudioUrl(audioUrl, requestId, () => triggerFallbackOnce('vi'));
      } catch {
        triggerFallbackOnce('vi');
      }
      return;
    }

    // 2. UK Oxford English HD
    if (voiceName === 'en-uk-natural') {
      try {
        const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en-GB&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
        this.playAudioUrl(audioUrl, requestId, () => triggerFallbackOnce('uk'));
      } catch {
        triggerFallbackOnce('uk');
      }
      return;
    }

    // 3. Cheerful Cartoon / Storyteller Voice
    if (voiceName === 'en-cartoon-kids') {
      // Best rendered with tuned pitch and playful rate via top natural voice
      this.speakWebSpeech(cleanText, voiceName, false, 'cartoon', requestId);
      return;
    }

    // 4. Australian English HD
    if (voiceName === 'en-au-natural') {
      try {
        const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en-AU&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
        this.playAudioUrl(audioUrl, requestId, () => triggerFallbackOnce('us'));
      } catch {
        triggerFallbackOnce('us');
      }
      return;
    }

    // 5. Youdao US Native Clear Accent
    if (voiceName === 'en-us-youdao') {
      try {
        const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(cleanText)}&type=2`;
        this.playAudioUrl(audioUrl, requestId, () => triggerFallbackOnce('us'));
      } catch {
        triggerFallbackOnce('us');
      }
      return;
    }

    // 6. Default US Natural Studio HD (en-us-natural or hd-magical)
    if (voiceName === 'en-us-natural' || voiceName === 'hd-magical' || !voiceName) {
      try {
        const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en-US&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
        this.playAudioUrl(audioUrl, requestId, () => triggerFallbackOnce('us'));
      } catch {
        triggerFallbackOnce('us');
      }
      return;
    }

    // 7. Fallback to chosen browser voice directly
    this.speakWebSpeech(cleanText, voiceName, false, 'us', requestId);
  }

  private playAudioUrl(url: string, requestId: number, onFail: () => void) {
    const audio = new Audio();
    this.currentAudio = audio;

    audio.onended = () => {
      if (requestId === this.currentRequestId) {
        this.currentAudio = null;
      }
    };

    audio.onerror = () => {
      onFail();
    };

    audio.src = url;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        onFail();
      });
    }
  }

  private speakWebSpeech(
    text: string,
    voiceName: string,
    isVietnamese: boolean,
    style: 'us' | 'uk' | 'cartoon' | 'vi',
    requestId: number
  ) {
    if (requestId !== this.currentRequestId) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();

      if (isVietnamese) {
        utterance.lang = 'vi-VN';
        let matched = voices.find((v) => v.name === voiceName);
        if (!matched) {
          matched = voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith('vi') ||
              v.name.toLowerCase().includes('vietnam') ||
              v.name.toLowerCase().includes('tiếng việt') ||
              v.name.toLowerCase().includes('an') ||
              v.name.toLowerCase().includes('hoaimy')
          );
        }
        if (matched) utterance.voice = matched;
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
      } else {
        utterance.lang = style === 'uk' ? 'en-GB' : 'en-US';

        let chosenVoice: SpeechSynthesisVoice | undefined;

        if (voiceName && !voiceName.startsWith('en-') && !voiceName.startsWith('vi-') && voiceName !== 'hd-magical') {
          chosenVoice = voices.find((v) => v.name === voiceName);
        }

        if (!chosenVoice) {
          if (style === 'uk') {
            chosenVoice =
              voices.find((v) => v.lang.startsWith('en-GB') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Online'))) ||
              voices.find((v) => v.name.toLowerCase().includes('sonia') || v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('oliver')) ||
              voices.find((v) => v.lang.startsWith('en-GB'));
          } else if (style === 'cartoon') {
            chosenVoice =
              voices.find((v) => v.name.includes('Jenny') || v.name.includes('Samantha') || v.name.includes('Aria') || v.name.includes('Zira')) ||
              voices.find((v) => v.lang.startsWith('en') && v.name.includes('Natural')) ||
              voices.find((v) => v.lang.startsWith('en-US'));
          } else {
            // US Natural
            chosenVoice =
              voices.find((v) => v.lang.startsWith('en-US') && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google'))) ||
              voices.find((v) => v.name.toLowerCase().includes('jenny') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('ava') || v.name.toLowerCase().includes('guy')) ||
              voices.find((v) => v.lang.startsWith('en-US'));
          }
        }

        if (chosenVoice) utterance.voice = chosenVoice;

        if (style === 'cartoon') {
          utterance.rate = 0.92;
          utterance.pitch = 1.18; // Playful and friendly
        } else {
          utterance.rate = 0.94; // Clear, easy to comprehend
          utterance.pitch = 1.0;
        }
      }

      utterance.onend = () => {
        // Utterance completed
      };
      utterance.onerror = () => {
        // Utterance error handled
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore synthesis errors
    }
  }
}

export const speechService = new SpeechService();
