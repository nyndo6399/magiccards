import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Volume2,
  Plus,
  Trash2,
  RotateCcw,
  ArrowLeft,
  Copy,
  Check,
  Edit2,
  FolderPlus,
  Play,
  HelpCircle,
  Shuffle,
  Upload,
  Layers,
  Heart,
  Home,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  X,
  Palette,
  CheckCircle2,
  Image as ImageIcon,
  FileSpreadsheet,
  Download,
  FileText,
  CheckCircle
} from 'lucide-react';
import { ThreeBackground } from './components/ThreeBackground';
import { Modal } from './components/Modal';
import { Flashcard, ModalConfig } from './types';
import { sfx, speechService, PRESET_VOICES } from './utils/audio';
import { getPresetNumbers1To10, getPresetAnimals, getPresetFruits } from './utils/presets';
import { CARD_BACK_THEMES, CardBackTheme } from './utils/cardBacks';
import { parseCsvContent, downloadCsvTemplate, exportCardsToCsv, CsvCardRow } from './utils/csvHelper';
import pinkCardImage from './assets/pink_card_front.png';

const STORAGE_PREFIX = 'flashcards_app_';

export default function App() {
  const [currentRoom, setCurrentRoom] = useState<string>(() => {
    return localStorage.getItem(`${STORAGE_PREFIX}active_room`) || 'default';
  });

  const [rooms, setRooms] = useState<string[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}rooms_list`);
    let parsed: string[] = saved ? JSON.parse(saved) : ['default'];
    if (!parsed.includes('default')) parsed.unshift('default');
    return parsed;
  });

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [showCoverHome, setShowCoverHome] = useState<boolean>(true);
  const [inGame, setInGame] = useState<boolean>(false);
  const [cardStates, setCardStates] = useState<Record<string, number>>({});
  const [voiceOptions, setVoiceOptions] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    return localStorage.getItem(`${STORAGE_PREFIX}voice`) || 'en-us-natural';
  });
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    speechService.selectedVoice = voice;
    localStorage.setItem(`${STORAGE_PREFIX}voice`, voice);
  };

  // Card Back / Cover Theme Selection
  const [selectedCardBack, setSelectedCardBack] = useState<string>(() => {
    return localStorage.getItem(`${STORAGE_PREFIX}card_back`) || CARD_BACK_THEMES[0].url;
  });
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const cardBackInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectCardBack = (url: string) => {
    setSelectedCardBack(url);
    localStorage.setItem(`${STORAGE_PREFIX}card_back`, url);
    sfx.playSuccess();
  };

  // Form states
  const [wordInput, setWordInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageFileName, setImageFileName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // CSV Batch Import States
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [csvParsedCards, setCsvParsedCards] = useState<CsvCardRow[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvActiveTab, setCsvActiveTab] = useState<'upload' | 'paste'>('upload');
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);

  // Quiz / Challenge Mode
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [quizTargetCard, setQuizTargetCard] = useState<Flashcard | null>(null);
  const [quizScore, setQuizScore] = useState(0);

  // Fullscreen and Zoom Card Mode
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomedCardIndex, setZoomedCardIndex] = useState<number | null>(null);
  const [zoomedCardState, setZoomedCardState] = useState<number>(0);

  // Sync fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  };

  // Sync zoomed card state with cardStates
  useEffect(() => {
    if (zoomedCardIndex !== null && cards[zoomedCardIndex]) {
      const cardId = cards[zoomedCardIndex].id;
      setZoomedCardState(cardStates[cardId] || 0);
    }
  }, [zoomedCardIndex, cards, cardStates]);

  const handleZoomedCardFlip = () => {
    if (zoomedCardIndex === null || !cards[zoomedCardIndex]) return;
    const card = cards[zoomedCardIndex];
    const next = zoomedCardState === 0 ? 1 : 0;
    setZoomedCardState(next);
    setCardStates((prev) => ({ ...prev, [card.id]: next }));

    if (next === 1) {
      sfx.playFlip();
      speechService.speak(card.word, selectedVoice);
    } else {
      sfx.playFlip();
      speechService.stop();
    }
  };

  const handleNextZoomedCard = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (zoomedCardIndex === null || cards.length === 0) return;
    const nextIdx = (zoomedCardIndex + 1) % cards.length;
    setZoomedCardIndex(nextIdx);
    const nextCard = cards[nextIdx];
    setZoomedCardState(cardStates[nextCard.id] || 0);
    sfx.playFlip();
  };

  const handlePrevZoomedCard = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (zoomedCardIndex === null || cards.length === 0) return;
    const prevIdx = (zoomedCardIndex - 1 + cards.length) % cards.length;
    setZoomedCardIndex(prevIdx);
    const prevCard = cards[prevIdx];
    setZoomedCardState(cardStates[prevCard.id] || 0);
    sfx.playFlip();
  };

  // Zoomed Card Keyboard Navigation
  useEffect(() => {
    if (zoomedCardIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZoomedCardIndex(null);
      } else if (e.key === 'ArrowRight') {
        handleNextZoomedCard();
      } else if (e.key === 'ArrowLeft') {
        handlePrevZoomedCard();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleZoomedCardFlip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomedCardIndex, cards, zoomedCardState, cardStates, selectedVoice]);

  // Load voices
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const available = window.speechSynthesis
          .getVoices()
          .filter((v) => v.lang.startsWith('en') || v.lang.startsWith('vi'))
          .sort((a, b) => {
            const isHighQuality = (v: SpeechSynthesisVoice) => {
              const n = v.name.toLowerCase();
              return n.includes('natural') || n.includes('neural') || n.includes('google') || n.includes('online') || n.includes('samantha');
            };
            const aHQ = isHighQuality(a) ? 1 : 0;
            const bHQ = isHighQuality(b) ? 1 : 0;
            return bHQ - aHQ;
          });
        setVoiceOptions(available);
      }
    };
    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Sync rooms list to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}rooms_list`, JSON.stringify(rooms));
  }, [rooms]);

  // Sync current room to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}active_room`, currentRoom);
  }, [currentRoom]);

  // Load cards for active room
  useEffect(() => {
    const key = `${STORAGE_PREFIX}deck_${currentRoom}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCards(parsed);
        return;
      } catch (e) {
        console.error('Error loading cards from storage', e);
      }
    }

    // If default room and empty, seed with Numbers 1-10
    if (currentRoom === 'default') {
      const defaultCards = getPresetNumbers1To10('default');
      setCards(defaultCards);
      localStorage.setItem(key, JSON.stringify(defaultCards));
    } else {
      setCards([]);
    }
  }, [currentRoom]);

  // Save cards on change
  const saveCardsToStorage = (updatedCards: Flashcard[], room: string = currentRoom) => {
    setCards(updatedCards);
    try {
      localStorage.setItem(`${STORAGE_PREFIX}deck_${room}`, JSON.stringify(updatedCards));
    } catch (e) {
      console.error('Quota exceeded or storage error', e);
      setModalConfig({
        isOpen: true,
        title: 'Storage Warning',
        message: 'Could not save some images due to browser storage limits. Please use smaller images or presets.',
      });
    }
  };

  // Image compression helper
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 600;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width = Math.round((width * MAX_HEIGHT) / height);
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.85));
            } else {
              resolve(e.target?.result as string);
            }
          } catch {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setModalConfig({
        isOpen: true,
        title: 'Invalid File',
        message: 'Please choose an image file (PNG, JPG, WebP, etc.).',
      });
      return;
    }

    setImageFileName(file.name);
    const compressed = await compressImage(file);
    setImagePreview(compressed);
  };

  const handleCustomCardBackUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setModalConfig({
        isOpen: true,
        title: 'Tệp không hợp lệ',
        message: 'Vui lòng chọn tệp hình ảnh (PNG, JPG, WebP, v.v.).',
      });
      return;
    }

    const compressed = await compressImage(file);
    handleSelectCardBack(compressed);
  };

  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCsvRawText(text);
        const parsed = parseCsvContent(text);
        setCsvParsedCards(parsed);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleCsvTextChange = (text: string) => {
    setCsvRawText(text);
    const parsed = parseCsvContent(text);
    setCsvParsedCards(parsed);
  };

  const handleApplyCsvImport = (mode: 'append' | 'replace') => {
    if (csvParsedCards.length === 0) return;

    const newCards: Flashcard[] = csvParsedCards.map((item, idx) => ({
      id: `card_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      word: item.word,
      img: item.img,
      createdAt: Date.now() + idx,
      roomId: currentRoom,
    }));

    let updatedList: Flashcard[];
    if (mode === 'replace') {
      updatedList = newCards;
    } else {
      updatedList = [...cards, ...newCards];
    }

    saveCardsToStorage(updatedList);
    setIsCsvModalOpen(false);
    setCsvRawText('');
    setCsvParsedCards([]);
    setCsvFileName('');
    if (csvFileInputRef.current) csvFileInputRef.current.value = '';

    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
    });
    sfx.playSuccess();
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWord = wordInput.trim();
    if (!cleanWord) return;

    setIsAdding(true);
    let finalImg = imagePreview;

    if (!finalImg) {
      const colors = ['f472b6', 'fb7185', 'c084fc', 'e879f9', '38bdf8', '34d399', 'fb923c'];
      const col = colors[Math.floor(Math.random() * colors.length)];
      finalImg = `https://placehold.co/400x300/${col}/ffffff?text=${encodeURIComponent(cleanWord)}`;
    }

    const newCard: Flashcard = {
      id: `card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      word: cleanWord,
      img: finalImg,
      createdAt: Date.now(),
      roomId: currentRoom,
    };

    saveCardsToStorage([...cards, newCard]);
    setWordInput('');
    setImagePreview('');
    setImageFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsAdding(false);
  };

  const handleDeleteCard = (cardId: string) => {
    const filtered = cards.filter((c) => c.id !== cardId);
    saveCardsToStorage(filtered);
  };

  const handleClearAll = () => {
    setModalConfig({
      isOpen: true,
      title: 'Clear All Cards',
      message: `Are you sure you want to remove all ${cards.length} cards in quest room "${currentRoom}"?`,
      showCancel: true,
      onConfirm: () => {
        saveCardsToStorage([]);
      },
    });
  };

  const handleLoadPreset = (type: 'numbers' | 'animals' | 'fruits') => {
    setModalConfig({
      isOpen: true,
      title: 'Load Preset Deck',
      message: `Replace current cards with preset: ${type.toUpperCase()}?`,
      showCancel: true,
      onConfirm: () => {
        let preset: Flashcard[] = [];
        if (type === 'numbers') preset = getPresetNumbers1To10(currentRoom);
        else if (type === 'animals') preset = getPresetAnimals(currentRoom);
        else if (type === 'fruits') preset = getPresetFruits(currentRoom);
        saveCardsToStorage(preset);
      },
    });
  };

  // Room Management
  const switchRoom = (roomId: string) => {
    setCurrentRoom(roomId);
    setCardStates({});
    setIsQuizMode(false);
  };

  const handleCreateRoom = () => {
    setModalConfig({
      isOpen: true,
      title: 'Tạo Phòng Mới',
      message: 'Nhập tên phòng (hỗ trợ viết tiếng Việt có dấu đầy đủ):',
      isPrompt: true,
      defaultValue: `Phòng ${rooms.length + 1}`,
      showCancel: true,
      onConfirm: (val) => {
        if (!val) return;
        const formatted = val.trim().replace(/\s+/g, ' ');
        if (!formatted) return;
        if (!rooms.includes(formatted)) {
          setRooms((prev) => [...prev, formatted]);
        }
        switchRoom(formatted);
      },
    });
  };

  const handleRenameRoom = () => {
    setModalConfig({
      isOpen: true,
      title: 'Đổi Tên Phòng ',
      message: `Nhập tên mới cho phòng "${currentRoom}" (viết tiếng Việt có dấu thoải mái):`,
      isPrompt: true,
      defaultValue: currentRoom,
      showCancel: true,
      onConfirm: (val) => {
        if (!val) return;
        const formatted = val.trim().replace(/\s+/g, ' ');
        if (!formatted || formatted === currentRoom) return;

        // migrate cards
        const oldKey = `${STORAGE_PREFIX}deck_${currentRoom}`;
        const newKey = `${STORAGE_PREFIX}deck_${formatted}`;
        const oldCards = localStorage.getItem(oldKey);
        if (oldCards) {
          localStorage.setItem(newKey, oldCards);
          localStorage.removeItem(oldKey);
        }

        setRooms((prev) => prev.map((r) => (r === currentRoom ? formatted : r)));
        setCurrentRoom(formatted);
      },
    });
  };

  const handleDeleteRoom = () => {
    if (rooms.length <= 1) {
      setModalConfig({
        isOpen: true,
        title: 'Cannot Delete',
        message: 'You must keep at least one quest room.',
      });
      return;
    }

    setModalConfig({
      isOpen: true,
      title: 'Delete Quest Room',
      message: `Are you sure you want to delete room "${currentRoom}" and all its flashcards?`,
      showCancel: true,
      onConfirm: () => {
        localStorage.removeItem(`${STORAGE_PREFIX}deck_${currentRoom}`);
        const remaining = rooms.filter((r) => r !== currentRoom);
        setRooms(remaining);
        setCurrentRoom(remaining[0] || 'default');
      },
    });
  };

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(currentRoom);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Game Logic
  const startGame = () => {
    if (cards.length === 0) return;
    setCardStates({});
    setInGame(true);
    setIsQuizMode(false);
    setQuizScore(0);
  };

  const stopGame = () => {
    speechService.stop();
    setInGame(false);
    setIsQuizMode(false);
  };

  const resetAllCards = () => {
    speechService.stop();
    setCardStates({});
    sfx.playFlip();
  };

  const flipAllCards = () => {
    sfx.playFlip();
    const allUp: Record<string, number> = {};
    cards.forEach((c) => {
      allUp[c.id] = 1;
    });
    setCardStates(allUp);
  };

  const shuffleCards = () => {
    sfx.playFlip();
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCardStates({});
  };

  const handleCardClick = (card: Flashcard) => {
    const currentState = cardStates[card.id] || 0;

    // Quiz Mode
    if (isQuizMode && quizTargetCard) {
      if (card.id === quizTargetCard.id) {
        // Correct answer!
        sfx.playSuccess();
        confetti({
          particleCount: 75,
          spread: 80,
          origin: { y: 0.6 },
        });
        setCardStates((prev) => ({ ...prev, [card.id]: 1 }));
        speechService.speak(`Awesome! ${card.word}`, selectedVoice);
        setQuizScore((prev) => prev + 1);

        setTimeout(() => {
          pickNextQuizTarget();
        }, 1600);
      } else {
        // Incorrect
        sfx.playFlip();
        speechService.speak(`Not quite, that is not ${quizTargetCard.word}. Try again!`, selectedVoice);
      }
      return;
    }

    // 2-state immediate flip:
    // 1st click: Flip over, show picture & word immediately, pronounce word!
    // 2nd click: Flip back down to the front face!
    if (currentState === 0) {
      sfx.playFlip();
      setCardStates((prev) => ({ ...prev, [card.id]: 1 }));
      speechService.speak(card.word, selectedVoice);

      const nextStates = { ...cardStates, [card.id]: 1 };
      const allFlipped = cards.every((c) => nextStates[c.id] === 1);
      if (allFlipped && cards.length >= 3) {
        confetti({
          particleCount: 100,
          spread: 90,
          origin: { y: 0.6 },
        });
        sfx.playSuccess();
      }
    } else {
      sfx.playFlip();
      speechService.stop();
      setCardStates((prev) => ({ ...prev, [card.id]: 0 }));
    }
  };

  const startQuizMode = () => {
    setIsQuizMode(true);
    resetAllCards();
    setQuizScore(0);
    setTimeout(() => {
      pickNextQuizTarget();
    }, 400);
  };

  const pickNextQuizTarget = () => {
    if (cards.length === 0) return;
    const randomCard = cards[Math.floor(Math.random() * cards.length)];
    setQuizTargetCard(randomCard);
    speechService.speak(`Find the magic card for: ${randomCard.word}!`, selectedVoice);
  };

  // FULLSCREEN 3D COVER HOMEPAGE
  if (showCoverHome) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden flex flex-col justify-between selection:bg-pink-500 selection:text-white bg-slate-950 font-sans">
        {/* Fullscreen Cover Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none select-none transition-all duration-700"
          style={{ backgroundImage: "url('/assets/aistudio/MAGIC_CARDS_5f1ef7a5_2K_f51e65ab.jpg')" }}
        />

        {/* Bottom Soft Shadow for START button readability while keeping MAGIC CARDS title vibrant */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none z-10" />

        {/* Top Header on Cover */}
        <header className="relative z-20 flex items-center justify-between p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {/* Active Room Badge */}
          <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-pink-400/40 shadow-xl text-xs sm:text-sm font-bold text-pink-200">
            <Heart className="w-4 h-4 text-pink-400 fill-pink-400" />
            <span>Phòng: <strong className="text-white font-mono">{currentRoom}</strong></span>
            <span className="text-pink-300/80">({cards.length} thẻ)</span>
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 sm:px-3.5 sm:py-2 bg-slate-900/85 hover:bg-slate-800 text-pink-200 hover:text-white font-bold rounded-2xl border border-pink-400/40 backdrop-blur-md shadow-xl flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer transition-all hover:scale-105 active:scale-95"
            title={isFullscreen ? 'Thu nhỏ (Exit Fullscreen)' : 'Phóng to full màn hình (Fullscreen)'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4 text-pink-300" />
                <span className="hidden sm:inline">Thu nhỏ</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-pink-300" />
                <span className="hidden sm:inline">Full màn hình</span>
              </>
            )}
          </button>
        </header>

        {/* Bottom Call-To-Action (Vào Trò Chơi) */}
        <div className="relative z-20 pb-8 sm:pb-12 md:pb-16 px-4 flex flex-col items-center text-center">
          {/* Main 3D START Button */}
          <button
            type="button"
            onClick={() => {
              setShowCoverHome(false);
              sfx.playSuccess();
            }}
            className="group relative px-10 sm:px-14 md:px-18 py-4 sm:py-5 md:py-6 bg-gradient-to-b from-pink-400 via-rose-500 to-purple-700 hover:from-pink-300 hover:via-rose-400 hover:to-purple-600 text-white font-black text-3xl sm:text-4xl md:text-5xl rounded-[2.5rem] border-[5px] border-amber-300/95 shadow-[0_12px_0_#831843,0_20px_35px_rgba(0,0,0,0.5),inset_0_5px_8px_rgba(255,255,255,0.8),inset_0_-5px_8px_rgba(0,0,0,0.35)] cursor-pointer transition-all duration-200 hover:scale-105 active:translate-y-2 active:shadow-[0_4px_0_#831843,0_8px_15px_rgba(0,0,0,0.4)] flex items-center justify-center gap-3.5 sm:gap-4 select-none pulse-glow"
          >
            {/* Top Gloss Reflection */}
            <div className="absolute top-1.5 inset-x-6 h-[40%] bg-gradient-to-b from-white/45 via-white/20 to-transparent rounded-full pointer-events-none" />

            {/* Glowing 3D Play Icon Bubble */}
            <div className="relative z-10 w-11 h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-full bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500 border-2 border-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <Play className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 fill-slate-950 text-slate-950 ml-1" />
            </div>

            {/* Big 3D START Text */}
            <span className="relative z-10 tracking-widest font-heading font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
              START
            </span>

            {/* Sparkle Icon */}
            <Sparkles className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 text-yellow-300 animate-pulse drop-shadow" />
          </button>

          {/* Quick Sub-buttons */}
          <div className="mt-4 flex items-center gap-3 flex-wrap justify-center">
            <button
              type="button"
              onClick={() => {
                setShowCoverHome(false);
                startGame();
                sfx.playSuccess();
              }}
              className="px-4 py-2 bg-slate-900/80 hover:bg-slate-800 text-pink-200 border border-pink-400/40 rounded-xl text-xs sm:text-sm font-bold backdrop-blur-md shadow-lg transition hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-pink-300" />
              <span>Chơi game ngay ({cards.length} thẻ)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCoverHome(false);
                sfx.playFlip();
              }}
              className="px-4 py-2 bg-slate-900/80 hover:bg-slate-800 text-pink-200 border border-pink-400/40 rounded-xl text-xs sm:text-sm font-bold backdrop-blur-md shadow-lg transition hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Layers className="w-4 h-4 text-purple-300" />
              <span>Cài đặt & Quản lý phòng</span>
            </button>
          </div>
        </div>

        {/* Custom Modal if needed */}
        <Modal config={modalConfig} onClose={() => setModalConfig(null)} />
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen text-slate-100 pb-16 selection:bg-pink-500 selection:text-white bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('/assets/game_bg_inside.jpg')" }}
    >
      {/* 3D Floating Hearts Three.js Canvas */}
      <ThreeBackground />

      {/* Subtle dark glass overlay for high visual clarity */}
      <div className="fixed inset-0 bg-slate-950/20 pointer-events-none" />

      <div className="relative z-10 w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {/* Header */}
        <header className="text-center mb-8 relative">
          {/* Top-Left Home Cover Button */}
          <div className="absolute top-1 left-1 sm:top-2 sm:left-2 z-20">
            <button
              type="button"
              onClick={() => {
                setShowCoverHome(true);
                sfx.playFlip();
              }}
              className="p-2 sm:px-3.5 sm:py-2 bg-slate-900/80 hover:bg-slate-800 text-pink-200 hover:text-white font-bold rounded-2xl border border-pink-400/40 backdrop-blur-md shadow-lg flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer transition-all hover:scale-105 active:scale-95"
              title="Quay lại bìa trang chủ full màn hình"
            >
              <Home className="w-4 h-4 text-pink-300" />
              <span className="hidden sm:inline">Trang chủ</span>
            </button>
          </div>

          {/* Top-Right Fullscreen Arrow Button */}
          <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 sm:px-3 sm:py-2 bg-slate-900/80 hover:bg-slate-800 text-pink-200 hover:text-white font-bold rounded-2xl border border-pink-400/40 backdrop-blur-md shadow-lg flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer transition-all hover:scale-105 active:scale-95"
              title={isFullscreen ? 'Thu nhỏ (Exit Fullscreen)' : 'Phóng to full màn hình (Fullscreen)'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-pink-300" />
                  <span className="hidden sm:inline">Thu nhỏ</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-pink-300" />
                  <span className="hidden sm:inline">Full màn hình</span>
                </>
              )}
            </button>
          </div>

          {/* 3D Cartoon Title Logo (Transparent Background) */}
          <div className="inline-flex justify-center items-center transform hover:scale-105 transition-transform duration-300 cursor-pointer drop-shadow-[0_12px_24px_rgba(244,114,182,0.45)]">
            <img
              src="/assets/magic_cards_logo_transparent.png"
              alt="Magic Cards"
              className="h-16 sm:h-20 md:h-24 lg:h-28 max-w-[94vw] w-auto object-contain select-none pointer-events-none filter drop-shadow-xl"
              loading="eager"
            />
          </div>
          <p className="text-pink-200/90 text-xs sm:text-sm md:text-base font-semibold mt-1 drop-shadow">
            Interactive 3D Flashcards
          </p>
        </header>

        {/* SETUP SCREEN */}
        {!inGame ? (
          <section className="bg-gradient-to-b from-pink-100/95 via-rose-50/95 to-pink-100/95 backdrop-blur-2xl rounded-[2.5rem] sm:rounded-[3rem] shadow-[0_20px_50px_rgba(244,114,182,0.35),0_10px_20px_rgba(219,39,119,0.15),inset_0_3px_6px_rgba(255,255,255,0.9),inset_0_-4px_8px_rgba(244,114,182,0.25)] p-6 sm:p-8 md:p-10 lg:p-12 border-4 sm:border-[6px] border-pink-300/90 w-full max-w-[1640px] mx-auto text-slate-800 transition-all">
            {/* Quest Room Control Panel */}
            <div className="mb-6 p-5 rounded-2xl bg-slate-950/85 border border-pink-400/40 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Heart className="w-5 h-5 text-pink-400 fill-pink-400" />
                  <span className="font-extrabold text-pink-200 text-sm md:text-base">
                    Phòng hiện tại:
                  </span>
                  <span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-mono px-3.5 py-1 rounded-xl text-sm font-black shadow border border-pink-200/40">
                    {currentRoom}
                  </span>
                  <button
                    type="button"
                    onClick={handleRenameRoom}
                    className="text-xs bg-rose-600 hover:bg-rose-500 text-white border border-rose-300/40 px-3 py-1.5 rounded-xl font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer"
                    title="Đổi tên phòng (hỗ trợ tiếng Việt có dấu)"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Đổi tên
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleCopyRoomCode}
                  className="text-xs bg-pink-600 hover:bg-pink-500 text-white border border-pink-300/40 px-3.5 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4 text-green-300" /> Đã sao chép!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Sao chép tên
                    </>
                  )}
                </button>
              </div>

              {/* Room Selector & Actions */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1">
                  <select
                    value={currentRoom}
                    onChange={(e) => switchRoom(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-pink-400/50 text-sm bg-slate-900 text-pink-200 font-bold focus:ring-2 focus:ring-pink-400 outline-none cursor-pointer"
                  >
                    {rooms.map((r) => (
                      <option key={r} value={r}>
                        Phòng: {r}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  className="px-4 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white text-sm font-black rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Tạo phòng mới (hỗ trợ tiếng Việt có dấu)"
                >
                  <FolderPlus className="w-4 h-4" /> Tạo phòng mới
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRoom}
                  className="px-4 py-2.5 bg-slate-900 text-red-300 hover:bg-red-950/80 border border-red-500/40 text-sm font-black rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Xóa phòng
                </button>
              </div>

              {/* Rooms Badges Bar */}
              <div>
                <span className="text-xs font-black text-pink-200 block mb-2 uppercase tracking-wider flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400" />
                  Danh sách phòng:
                </span>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto custom-scrollbar p-2 bg-slate-900/90 rounded-xl border border-pink-400/20">
                  {rooms.map((r) => {
                    const isActive = r === currentRoom;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => switchRoom(r)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow flex items-center gap-1.5 cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white ring-2 ring-pink-300 scale-105 shadow-pink-500/30'
                            : 'bg-slate-800 text-pink-200 hover:bg-slate-700 border border-pink-400/30'
                        }`}
                      >
                        <Heart
                          className={`w-3 h-3 ${isActive ? 'text-yellow-300 fill-yellow-300' : 'text-pink-400'}`}
                        />
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Voice Caster Selector */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-pink-400/30 shadow-inner">
              <label className="font-extrabold text-pink-200 whitespace-nowrap flex items-center text-sm gap-2">
                <Volume2 className="w-5 h-5 text-pink-400" />
                Giọng đọc phát âm:
              </label>
              <select
                value={selectedVoice}
                onChange={(e) => handleVoiceChange(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-pink-400/40 bg-slate-900 text-white font-bold text-sm outline-none focus:ring-2 focus:ring-pink-400 cursor-pointer"
              >
                <optgroup label="🌟 Giọng chuẩn bản xứ tự nhiên (Khuyên dùng)">
                  {PRESET_VOICES.map((pv) => (
                    <option key={pv.id} value={pv.id}>
                      {pv.emoji} {pv.name}
                    </option>
                  ))}
                </optgroup>
                {voiceOptions.length > 0 && (
                  <optgroup label="🌐 Giọng hệ thống thiết bị">
                    {voiceOptions.map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <button
                type="button"
                onClick={() => speechService.speak('Welcome to Flashcard Adventure! Let\'s learn english together!', selectedVoice)}
                className="px-4 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white border border-pink-300/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow"
              >
                <Volume2 className="w-3.5 h-3.5" /> Nghe thử giọng
              </button>
            </div>

            {/* Card Back / Cover Theme Gallery (13 Cartoon Themes + Custom Upload) */}
            <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-slate-950/85 border border-pink-400/40 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-pink-400" />
                  <span className="text-sm sm:text-base font-black text-pink-100 font-heading">
                    Mẫu Mặt Sau Thẻ ({CARD_BACK_THEMES.length} Mẫu Hoạt Hình Dễ Thương):
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={cardBackInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCustomCardBackUpload}
                    className="hidden"
                    id="custom-card-back-input"
                  />
                  <button
                    type="button"
                    onClick={() => cardBackInputRef.current?.click()}
                    className="text-xs px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-pink-200 border border-pink-400/40 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
                    title="Tải ảnh bìa mặt sau từ thiết bị của bạn"
                  >
                    <Upload className="w-3.5 h-3.5 text-pink-300" />
                    <span>Tải ảnh từ máy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsThemeModalOpen(true)}
                    className="text-xs px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow border border-pink-300/40"
                  >
                    <span>Xem lưới 13 mẫu</span>
                  </button>
                </div>
              </div>

              {/* Horizontal Scrollable Thumbnails */}
              <div className="flex gap-3 overflow-x-auto pb-3 pt-1 px-1 custom-scrollbar">
                {CARD_BACK_THEMES.map((theme) => {
                  const isSelected = selectedCardBack === theme.url;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleSelectCardBack(theme.url)}
                      className={`group relative shrink-0 w-24 sm:w-28 rounded-2xl p-1.5 flex flex-col items-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-b from-pink-500 to-purple-600 scale-105 shadow-xl shadow-pink-500/30 ring-2 ring-white'
                          : 'bg-slate-900/90 hover:bg-slate-800 border border-pink-400/30 hover:border-pink-400/70 hover:scale-102'
                      }`}
                    >
                      {/* Card Thumbnail */}
                      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-slate-950 border border-white/20 shadow">
                        <img
                          src={theme.url}
                          alt={theme.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/pink_card_front.png';
                          }}
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-white text-pink-600 rounded-full p-0.5 shadow-md">
                            <CheckCircle2 className="w-4 h-4 fill-pink-500 text-white" />
                          </div>
                        )}
                      </div>
                      {/* Label */}
                      <span className="mt-1.5 text-[11px] font-black text-center truncate w-full text-pink-100 flex items-center justify-center gap-1">
                        <span>{theme.emoji}</span>
                        <span className="truncate">{theme.name}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add Card Form */}
            <form onSubmit={handleAddCard} className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                  Từ Vựng (Tiếng Việt / English)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Apple, Star, Cat..."
                  value={wordInput}
                  onChange={(e) => setWordInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-pink-300/80 bg-slate-950 text-white focus:ring-2 focus:ring-pink-400 transition outline-none font-bold placeholder:text-slate-400 text-sm shadow-inner"
                />
              </div>

              <div className="flex-1">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                  Card Illustration (Optional)
                </label>
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="card-img-file"
                  />
                  <label
                    htmlFor="card-img-file"
                    className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-pink-400/70 bg-slate-950 flex items-center justify-center cursor-pointer hover:bg-slate-900 transition text-slate-200 font-bold text-sm shadow-inner"
                  >
                    <Upload className="w-4 h-4 mr-2 text-pink-400" />
                    <span className="truncate max-w-[200px]">
                      {imageFileName || 'Upload image or auto-generate'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  disabled={isAdding || !wordInput.trim()}
                  className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black rounded-xl shadow-lg transition cursor-pointer uppercase tracking-wider text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed border border-pink-200/40 shrink-0"
                >
                  <Plus className="w-4 h-4" /> Add Card
                </button>
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(true)}
                  className="w-full md:w-auto px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black rounded-xl shadow-lg transition cursor-pointer text-sm flex items-center justify-center gap-1.5 border border-emerald-200/40 shrink-0"
                  title="Nhập hàng loạt từ vựng và link ảnh bằng file CSV"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Nhập CSV
                </button>
              </div>
            </form>

            {/* Deck List Header */}
            <div className="mb-3 flex flex-wrap justify-between items-center gap-2">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-pink-600" />
                Cards in Deck (<span className="text-pink-600 font-black">{cards.length}</span>)
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(true)}
                  className="text-xs text-emerald-950 font-black bg-emerald-300 hover:bg-emerald-200 px-3 py-1.5 rounded-lg border border-emerald-400/60 transition cursor-pointer shadow flex items-center gap-1.5"
                  title="Nhập danh sách từ vựng & hình ảnh từ file CSV / Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Nhập CSV
                </button>
                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="text-xs text-sky-950 font-bold bg-sky-300 hover:bg-sky-200 px-3 py-1.5 rounded-lg border border-sky-400/60 transition cursor-pointer shadow flex items-center gap-1.5"
                  title="Tải tệp mẫu CSV chuẩn để xem mẫu"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải file mẫu
                </button>
                {cards.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => exportCardsToCsv(cards, currentRoom)}
                      className="text-xs text-purple-950 font-bold bg-purple-300 hover:bg-purple-200 px-3 py-1.5 rounded-lg border border-purple-400/60 transition cursor-pointer shadow flex items-center gap-1.5"
                      title="Xuất danh sách thẻ hiện tại ra file CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Xuất CSV
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-xs text-red-300 hover:text-red-200 font-bold bg-red-950/60 hover:bg-red-900/60 px-3 py-1.5 rounded-lg border border-red-400/30 transition cursor-pointer shadow"
                    >
                      Clear All
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Deck Card Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto custom-scrollbar p-2 bg-slate-950/80 rounded-2xl border border-pink-400/30">
              {cards.length === 0 ? (
                <div className="col-span-full text-center text-slate-400 py-8 italic font-medium">
                  No flashcards in this room yet. Add one above or load a quick preset deck!
                </div>
              ) : (
                cards.map((card, idx) => (
                  <div
                    key={card.id}
                    className="flex items-center p-2.5 bg-slate-900/90 rounded-xl shadow border border-pink-400/30 hover:border-pink-400 transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center font-black text-white text-xs shrink-0 mr-2.5 shadow border border-white/40">
                      {idx + 1}
                    </div>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-950 shrink-0 mr-2.5 flex items-center justify-center border border-pink-300/30 p-0.5">
                      <img
                        src={card.img}
                        alt={card.word}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://placehold.co/100x100/e2e8f0/000000?text=${encodeURIComponent(card.word.charAt(0))}`;
                        }}
                      />
                    </div>
                    <span className="font-bold text-white truncate flex-1 text-sm">{card.word}</span>
                    <button
                      type="button"
                      onClick={() => speechService.speak(card.word, selectedVoice)}
                      className="text-pink-300 hover:text-pink-200 p-1.5"
                      title="Speak word"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCard(card.id)}
                      className="text-red-400 hover:text-red-300 p-1.5 ml-1"
                      title="Delete card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Launch Game Button */}
            <div className="mt-8 text-center border-t border-pink-400/30 pt-6">
              <button
                type="button"
                onClick={startGame}
                disabled={cards.length === 0}
                className="game-btn px-10 py-4 bg-gradient-to-r from-pink-300 via-rose-400 to-purple-400 hover:from-pink-200 hover:to-purple-300 text-slate-950 text-xl font-black rounded-2xl shadow-xl transition uppercase tracking-wider pulse-glow cursor-pointer border-4 border-pink-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-none flex items-center justify-center mx-auto gap-3"
              >
                <Play className="w-6 h-6 fill-slate-950 text-slate-950" />
                START ADVENTURE
              </button>
            </div>
          </section>
        ) : (
          /* GAME SCREEN */
          <section className="bg-gradient-to-b from-pink-100/95 via-rose-50/95 to-pink-100/95 backdrop-blur-2xl rounded-[2.5rem] sm:rounded-[3rem] shadow-[0_20px_50px_rgba(244,114,182,0.35),0_10px_20px_rgba(219,39,119,0.15),inset_0_3px_6px_rgba(255,255,255,0.9),inset_0_-4px_8px_rgba(244,114,182,0.25)] p-6 sm:p-8 md:p-10 lg:p-12 border-4 sm:border-[6px] border-pink-300/90 w-full max-w-[1750px] mx-auto text-slate-100 transition-all">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    stopGame();
                    setShowCoverHome(true);
                    sfx.playFlip();
                  }}
                  className="px-3.5 py-2 bg-slate-900/90 hover:bg-slate-800 text-pink-200 hover:text-white font-black rounded-xl shadow border border-pink-400/40 cursor-pointer text-xs sm:text-sm flex items-center gap-1.5 transition hover:scale-105 active:scale-95"
                  title="Quay về bìa trang chủ full màn hình"
                >
                  <Home className="w-4 h-4 text-pink-300" />
                  <span>Trang chủ</span>
                </button>
                <button
                  type="button"
                  onClick={stopGame}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-pink-100 font-black rounded-xl shadow border border-pink-300/50 cursor-pointer text-xs sm:text-sm flex items-center gap-1.5 transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Cài đặt
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className="text-xs font-black bg-pink-200 text-pink-900 px-3 py-1.5 rounded-xl border border-pink-400/40">
                  Room: {currentRoom} ({cards.length} cards)
                </span>
                <button
                  type="button"
                  onClick={shuffleCards}
                  className="px-3 py-1.5 bg-purple-600 text-purple-200 hover:text-purple-100 font-bold rounded-xl border border-purple-300/40 text-xs flex items-center gap-1 cursor-pointer transition hover:bg-purple-500"
                >
                  <Shuffle className="w-3.5 h-3.5" /> Shuffle
                </button>
                <button
                  type="button"
                  onClick={resetAllCards}
                  className="px-3 py-1.5 bg-slate-950 text-rose-200 hover:text-rose-100 font-bold rounded-xl border border-rose-300/40 text-xs flex items-center gap-1 cursor-pointer transition hover:bg-slate-900"
                  title="Úp tất cả các thẻ xuống"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Úp thẻ
                </button>
                <button
                  type="button"
                  onClick={flipAllCards}
                  className="px-3 py-1.5 bg-pink-700/80 hover:bg-pink-600 text-pink-100 font-bold rounded-xl border border-pink-300/40 text-xs flex items-center gap-1 cursor-pointer transition shadow"
                  title="Lật tất cả các thẻ để xem hình"
                >
                  <Layers className="w-3.5 h-3.5" /> Lật xem hình
                </button>
                <button
                  type="button"
                  onClick={() => setIsThemeModalOpen(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold rounded-xl border border-pink-300/40 text-xs flex items-center gap-1.5 cursor-pointer transition shadow"
                  title="Chọn hình mặt sau thẻ (13 mẫu hoạt hình)"
                >
                  <Palette className="w-3.5 h-3.5 text-pink-200" />
                  <span>Đổi mặt sau thẻ </span>
                </button>
                {/* Fullscreen Arrow Button in Game Toolbar */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black rounded-xl border border-pink-200/50 text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition hover:scale-105 active:scale-95"
                  title={isFullscreen ? 'Thu nhỏ màn hình (Exit Fullscreen)' : 'Phóng to full màn hình (Fullscreen)'}
                >
                  {isFullscreen ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-pink-200" />
                      <span>Thu nhỏ</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-white" />
                      <span>Full màn hình</span>
                    </>
                  )}
                </button>
              </div>

              {/* Challenge / Quiz Mode Toggle */}
              <button
                type="button"
                onClick={() => (isQuizMode ? setIsQuizMode(false) : startQuizMode())}
                className={`px-4 py-2 font-black rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow transition cursor-pointer border ${
                  isQuizMode
                    ? 'bg-amber-400 text-slate-950 border-amber-200 ring-2 ring-amber-300 animate-pulse'
                    : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-300/50'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                {isQuizMode ? `Quiz Active (${quizScore} pts)` : 'Challenge Mode'}
              </button>
            </div>

            {/* Quiz Banner if in Quiz Mode */}
            {isQuizMode && quizTargetCard && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-center animate-in fade-in">
                <p className="text-sm font-bold text-amber-200 mb-1">
                  🎯 Voice Challenge: Click the card that matches this word!
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl font-black text-white font-heading">
                    &quot;{quizTargetCard.word}&quot;
                  </span>
                  <button
                    type="button"
                    onClick={() => speechService.speak(quizTargetCard.word, selectedVoice)}
                    className="p-2 bg-amber-400 text-slate-950 rounded-xl hover:bg-amber-300 transition cursor-pointer"
                    title="Repeat Audio"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* In-Game Voice Caster Bar & Tips */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl bg-slate-950/75 border border-pink-400/40 shadow-inner">
              <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
                <div className="flex items-center gap-1.5 text-xs font-black text-pink-300 uppercase tracking-wider shrink-0">
                  <Volume2 className="w-4 h-4 text-pink-400" />
                  <span>Giọng phát âm:</span>
                </div>
                <select
                  value={selectedVoice}
                  onChange={(e) => handleVoiceChange(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-pink-400/50 bg-slate-900 text-white font-bold text-xs outline-none focus:ring-2 focus:ring-pink-400 cursor-pointer shadow flex-1 max-w-xs"
                >
                  <optgroup label="🌟 Giọng chuẩn bản xứ tự nhiên (Khuyên dùng)">
                    {PRESET_VOICES.map((pv) => (
                      <option key={pv.id} value={pv.id}>
                        {pv.emoji} {pv.name}
                      </option>
                    ))}
                  </optgroup>
                  {voiceOptions.length > 0 && (
                    <optgroup label="🌐 Giọng hệ thống thiết bị">
                      {voiceOptions.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => speechService.speak(cards[0]?.word || 'Awesome! Ready to learn?', selectedVoice)}
                  className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1 cursor-pointer shadow border border-pink-300/40 shrink-0"
                  title="Nghe thử giọng đọc này"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Nghe thử</span>
                </button>
              </div>

              <div className="text-xs font-semibold text-pink-200/90 flex items-center gap-1.5">
                <span>💡 Bấm thẻ để lật & nghe phát âm</span>
              </div>
            </div>

            {/* 3D Flashcards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-6 sm:gap-7 auto-rows-[340px] sm:auto-rows-[380px] md:auto-rows-[415px]">
              {cards.map((card, index) => {
                const state = cardStates[card.id] || 0;
                const isFlipped = state === 1;

                return (
                  <div
                    key={card.id}
                    onClick={() => handleCardClick(card)}
                    className={`card-container w-full h-full select-none ${
                      isFlipped ? 'flipped' : ''
                    }`}
                  >
                    <div className="card-inner">
                      {/* Front: Cartoon Playing Card Cover */}
                      <div className="card-front group">
                        {/* Cartoon Graphic Image */}
                        <img
                          src={selectedCardBack}
                          alt="Card Cover"
                          className="w-full h-full object-cover select-none pointer-events-none absolute inset-0 rounded-[2rem]"
                          loading="eager"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/pink_card_front.png';
                          }}
                        />

                        {/* 3D Flower Number Badge */}
                        <div
                          className="absolute top-2 left-2 z-10 w-11 h-11 sm:w-12 sm:h-12 drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)] pointer-events-none select-none flex items-center justify-center transition-transform group-hover:scale-110"
                        >
                          <img
                            src="/flower_badge_base.png"
                            alt="Flower Badge"
                            className="w-full h-full object-contain pointer-events-none select-none"
                            draggable={false}
                          />
                          <span
                            className="absolute inset-0 flex items-center justify-center font-black text-white text-base sm:text-lg font-heading leading-none pt-0.5 select-none"
                            style={{
                              textShadow: '0 2px 0 #92400e, 0 -1px 0 #92400e, 1px 0 0 #92400e, -1px 0 0 #92400e, 0 3px 4px rgba(120,53,15,0.7)',
                            }}
                          >
                            {index + 1}
                          </span>
                        </div>

                        {/* Fullscreen Zoom Arrow Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomedCardIndex(index);
                          }}
                          className="absolute top-2.5 right-2.5 z-20 p-2 rounded-full bg-slate-950/70 hover:bg-slate-900 text-pink-200 hover:text-white backdrop-blur-md border border-pink-300/60 shadow-lg transition-transform hover:scale-115 active:scale-95 cursor-pointer"
                          title="Phóng to thẻ này (Full màn hình thẻ)"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Hover Sheen Effect */}
                        <div className="absolute inset-0 bg-pink-400/0 group-hover:bg-pink-400/10 transition-colors pointer-events-none rounded-[2rem]" />
                      </div>

                      {/* Back: Picture + Word Reveal */}
                      <div className="card-back">
                        {/* Fullscreen Zoom Arrow Button on Back too */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomedCardIndex(index);
                          }}
                          className="absolute top-2.5 right-2.5 z-20 p-2 rounded-full bg-slate-950/70 hover:bg-slate-900 text-pink-200 hover:text-white backdrop-blur-md border border-pink-300/60 shadow-lg transition-transform hover:scale-115 active:scale-95 cursor-pointer"
                          title="Phóng to thẻ này (Full màn hình thẻ)"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="image-wrapper p-2 bg-white flex items-center justify-center">
                          <img
                            src={card.img}
                            alt={card.word}
                            className="max-w-full max-h-full w-full h-full object-contain select-none"
                            draggable={false}
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `https://placehold.co/400x300/f472b6/ffffff?text=${encodeURIComponent(card.word)}`;
                            }}
                          />
                        </div>
                        <div className="content">
                          <span className="word-text text-sm sm:text-base font-extrabold text-slate-800 tracking-wide font-heading truncate max-w-full px-2">
                            {card.word}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Zoomed Card Fullscreen Overlay Modal */}
      {zoomedCardIndex !== null && cards[zoomedCardIndex] && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setZoomedCardIndex(null)}
        >
          {/* Header Bar of Zoom Modal */}
          <div
            className="w-full max-w-[480px] sm:max-w-[540px] md:max-w-[600px] flex items-center justify-between mb-3 px-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black text-xs px-3 py-1.5 rounded-xl border border-pink-300/40 shadow">
                Thẻ {zoomedCardIndex + 1} / {cards.length}
              </span>
              <button
                type="button"
                onClick={() => speechService.speak(cards[zoomedCardIndex].word, selectedVoice)}
                className="p-2 bg-pink-500/20 hover:bg-pink-500/40 text-pink-200 border border-pink-400/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
                title="Phát âm"
              >
                <Volume2 className="w-4 h-4 text-pink-300" />
                <span className="hidden sm:inline">Phát âm</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-pink-200 hover:text-white border border-pink-400/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
                title={isFullscreen ? 'Thu nhỏ màn hình' : 'Full màn hình'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
              </button>
              <button
                type="button"
                onClick={() => setZoomedCardIndex(null)}
                className="p-2 bg-slate-900 hover:bg-red-950/80 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/50 rounded-xl text-xs font-bold transition cursor-pointer shadow"
                title="Đóng phóng to (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Large 3D Card Container */}
          <div
            className="w-full max-w-[480px] sm:max-w-[540px] md:max-w-[590px] h-[520px] sm:h-[590px] md:h-[640px] max-h-[80vh]"
            onClick={(e) => {
              e.stopPropagation();
              handleZoomedCardFlip();
            }}
          >
            <div
              className={`card-container w-full h-full cursor-pointer ${
                zoomedCardState === 1 ? 'flipped' : ''
              }`}
            >
              <div className="card-inner">
                {/* Large Front Face with cartoon cover art */}
                <div className="card-front shadow-2xl">
                  {/* Cartoon Graphic Image */}
                  <img
                    src={selectedCardBack}
                    alt="Card Cover"
                    className="w-full h-full object-cover select-none pointer-events-none absolute inset-0 rounded-[2rem]"
                    loading="eager"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/pink_card_front.png';
                    }}
                  />

                  {/* Zoomed Card 3D Flower Number Badge */}
                  <div
                    className="absolute top-3 left-3 z-10 w-14 h-14 sm:w-16 sm:h-16 drop-shadow-[0_6px_12px_rgba(0,0,0,0.4)] pointer-events-none select-none flex items-center justify-center"
                  >
                    <img
                      src="/flower_badge_base.png"
                      alt="Flower Badge"
                      className="w-full h-full object-contain pointer-events-none select-none"
                      draggable={false}
                    />
                    <span
                      className="absolute inset-0 flex items-center justify-center font-black text-white text-xl sm:text-2xl font-heading leading-none pt-0.5 select-none"
                      style={{
                        textShadow: '0 2px 0 #92400e, 0 -1px 0 #92400e, 1px 0 0 #92400e, -1px 0 0 #92400e, 0 3px 5px rgba(120,53,15,0.7)',
                      }}
                    >
                      {zoomedCardIndex + 1}
                    </span>
                  </div>
                  <div className="absolute bottom-4 inset-x-4 text-center z-10 pointer-events-none">
                    <span className="inline-block px-3.5 py-1.5 rounded-full bg-slate-950/75 backdrop-blur-md text-pink-200 text-xs font-bold border border-pink-300/50 shadow">
                      👆 Chạm để lật thẻ & nghe phát âm
                    </span>
                  </div>
                </div>

                {/* Large Back Face */}
                <div className="card-back border-4 border-pink-400">
                  <div className="image-wrapper p-3 sm:p-4 bg-white flex items-center justify-center">
                    <img
                      src={cards[zoomedCardIndex].img}
                      alt={cards[zoomedCardIndex].word}
                      className="max-w-full max-h-full w-full h-full object-contain select-none"
                      draggable={false}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://placehold.co/500x400/f472b6/ffffff?text=${encodeURIComponent(
                          cards[zoomedCardIndex].word
                        )}`;
                      }}
                    />
                  </div>
                  <div className="content">
                    <span className="word-text text-base sm:text-lg font-extrabold text-slate-800 tracking-wide font-heading">
                      {cards[zoomedCardIndex].word}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Controls Bar */}
          <div
            className="flex items-center gap-4 mt-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handlePrevZoomedCard}
              className="p-3 bg-slate-900/90 hover:bg-slate-800 text-pink-200 hover:text-white border border-pink-400/40 rounded-2xl transition cursor-pointer shadow-lg hover:scale-110 active:scale-95"
              title="Thẻ trước (Mũi tên trái)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={handleZoomedCardFlip}
              className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black text-sm rounded-xl border border-pink-200/50 shadow-lg transition cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>
                {zoomedCardState === 0 ? 'Lật thẻ (Flip)' : 'Úp lại mặt trước'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleNextZoomedCard}
              className="p-3 bg-slate-900/90 hover:bg-slate-800 text-pink-200 hover:text-white border border-pink-400/40 rounded-2xl transition cursor-pointer shadow-lg hover:scale-110 active:scale-95"
              title="Thẻ tiếp theo (Mũi tên phải)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Card Back Themes Modal */}
      {isThemeModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsThemeModalOpen(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] bg-slate-900/95 border-4 border-pink-400/60 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-pink-400/30 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg">
                  <Palette className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-2xl font-black text-pink-200 font-heading">
                    Chọn Mẫu Mặt Sau Thẻ ({CARD_BACK_THEMES.length} Mẫu)
                  </h3>
                  <p className="text-xs sm:text-sm text-pink-300/80 font-semibold">
                    Chọn một mẫu hoạt hình dễ thương hoặc tự tải ảnh bìa riêng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsThemeModalOpen(false)}
                className="p-2 bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-300 rounded-xl border border-pink-400/30 transition cursor-pointer"
                title="Đóng (Close)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Grid of Themes */}
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {CARD_BACK_THEMES.map((theme) => {
                  const isSelected = selectedCardBack === theme.url;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        handleSelectCardBack(theme.url);
                      }}
                      className={`group relative p-2.5 rounded-2xl flex flex-col items-center transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-gradient-to-b from-pink-500 to-purple-600 shadow-xl shadow-pink-500/30 ring-4 ring-pink-300 scale-[1.02]'
                          : 'bg-slate-950/80 hover:bg-slate-800 border-2 border-pink-400/30 hover:border-pink-400 hover:scale-[1.02]'
                      }`}
                    >
                      {/* Image Preview */}
                      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-slate-900 shadow-md border border-white/20">
                        <img
                          src={theme.url}
                          alt={theme.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/pink_card_front.png';
                          }}
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-white text-pink-600 rounded-full p-1 shadow-lg flex items-center justify-center">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      {/* Info & Emoji */}
                      <div className="w-full mt-2.5 flex items-center justify-between px-1">
                        <span className="text-xs sm:text-sm font-extrabold text-white truncate flex items-center gap-1.5">
                          <span>{theme.emoji}</span>
                          <span className="truncate">{theme.name}</span>
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full text-pink-100 shrink-0">
                            Đang dùng
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-pink-400/30 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomCardBackUpload}
                  className="hidden"
                  id="modal-custom-card-back"
                />
                <label
                  htmlFor="modal-custom-card-back"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-pink-200 border border-pink-400/40 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition shadow"
                >
                  <Upload className="w-4 h-4 text-pink-400" />
                  <span>Tải ảnh mặt sau từ thiết bị</span>
                </label>
              </div>

              <button
                type="button"
                onClick={() => setIsThemeModalOpen(false)}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black text-sm rounded-xl shadow cursor-pointer transition border border-pink-200/40"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Batch Import Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border-4 border-pink-400/80 shadow-2xl shadow-pink-900/40 overflow-hidden text-slate-100">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-pink-400/30 flex items-center justify-between bg-gradient-to-r from-pink-950/50 via-slate-900 to-purple-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 border border-emerald-200/50">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    Nhập Từ Vựng Hàng Loạt (File CSV / Excel)
                  </h3>
                  <p className="text-xs text-pink-200 font-medium">
                    Nhập cùng lúc nhiều từ vựng và link hình ảnh theo định dạng 2 cột chuẩn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
                title="Đóng"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-5">
              {/* Format Guide matching user's Excel screenshot */}
              <div className="bg-slate-950/70 p-3.5 sm:p-4 rounded-2xl border border-emerald-500/30 shadow-inner">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                      Mẫu bảng tính 2 cột chuẩn (Khuyên dùng)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={downloadCsvTemplate}
                    className="text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 px-3 py-1.5 rounded-lg transition shadow flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Tải tệp mẫu chuẩn (.csv)
                  </button>
                </div>

                {/* Visual Excel table preview */}
                <div className="overflow-x-auto rounded-xl border border-slate-700 font-mono text-xs shadow">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-800 text-slate-300 border-b border-slate-700">
                        <th className="px-3 py-2 text-emerald-400 font-black w-12 text-center border-r border-slate-700">#</th>
                        <th className="px-3 py-2 text-emerald-400 font-black border-r border-slate-700">
                          Cột A: Từ vựng / Câu hỏi (Word)
                        </th>
                        <th className="px-3 py-2 text-emerald-400 font-black">
                          Cột B: URL Hình ảnh (Image URL)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/90 text-slate-300">
                      <tr>
                        <td className="px-3 py-1.5 text-center text-slate-500 border-r border-slate-700">1</td>
                        <td className="px-3 py-1.5 font-bold text-white border-r border-slate-700">go for a swim</td>
                        <td className="px-3 py-1.5 text-slate-400 truncate max-w-[280px]">https://example.com/duck.png</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1.5 text-center text-slate-500 border-r border-slate-700">2</td>
                        <td className="px-3 py-1.5 font-bold text-white border-r border-slate-700">go for a ride</td>
                        <td className="px-3 py-1.5 text-slate-400 truncate max-w-[280px]">https://example.com/bike.png</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1.5 text-center text-slate-500 border-r border-slate-700">3</td>
                        <td className="px-3 py-1.5 font-bold text-white border-r border-slate-700">watch a movie</td>
                        <td className="px-3 py-1.5 text-slate-400 truncate max-w-[280px]">https://example.com/movie.png</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  * Hệ thống tự nhận diện dòng tiêu đề, dấu phẩy (,), dấu chấm phẩy (;), tab copy từ Excel/Google Sheets và tự động bổ sung ảnh nền đẹp nếu để trống URL.
                </p>
              </div>

              {/* Import Method Tabs */}
              <div>
                <div className="flex border-b border-slate-800 mb-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCsvActiveTab('upload')}
                    className={`pb-2 px-3 text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-1.5 border-b-2 ${
                      csvActiveTab === 'upload'
                        ? 'text-pink-400 border-pink-400'
                        : 'text-slate-400 border-transparent hover:text-slate-200'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    Cách 1: Chọn file CSV từ máy tính
                  </button>
                  <button
                    type="button"
                    onClick={() => setCsvActiveTab('paste')}
                    className={`pb-2 px-3 text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-1.5 border-b-2 ${
                      csvActiveTab === 'paste'
                        ? 'text-pink-400 border-pink-400'
                        : 'text-slate-400 border-transparent hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Cách 2: Dán trực tiếp từ Excel / Sheets
                  </button>
                </div>

                {csvActiveTab === 'upload' ? (
                  <div className="space-y-3">
                    <input
                      ref={csvFileInputRef}
                      type="file"
                      accept=".csv,.tsv,.txt"
                      onChange={handleCsvFileSelect}
                      className="hidden"
                      id="csv-file-upload-input"
                    />
                    <label
                      htmlFor="csv-file-upload-input"
                      className="w-full border-2 border-dashed border-emerald-400/50 hover:border-emerald-400 bg-slate-950/60 hover:bg-slate-950 p-6 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition text-center group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition flex items-center justify-center mb-2">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-sm text-white">
                        {csvFileName ? `Đã chọn: ${csvFileName}` : 'Nhấn vào đây để tải lên tệp .CSV / .TSV'}
                      </span>
                      <span className="text-xs text-slate-400 mt-1">
                        Hỗ trợ file xuất từ Excel, Google Sheets, Notepad (UTF-8)
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300">
                      Dán các hàng sao chép từ Excel hoặc Google Sheets (hoặc nội dung CSV) vào ô dưới đây:
                    </label>
                    <textarea
                      rows={5}
                      value={csvRawText}
                      onChange={(e) => handleCsvTextChange(e.target.value)}
                      placeholder={`Từ vựng / Câu hỏi (Word)\tURL Hình ảnh (Image URL)\ngo for a swim\thttps://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&q=80\ngo for a ride\thttps://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&q=80`}
                      className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs text-white placeholder:text-slate-500 focus:border-pink-400 focus:ring-1 focus:ring-pink-400 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Parsed Result Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Xem trước kết quả nhận diện:
                  </h4>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {csvParsedCards.length} thẻ hợp lệ
                  </span>
                </div>

                {csvParsedCards.length === 0 ? (
                  <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs italic">
                    Chưa có thẻ nào được nhận diện. Vui lòng chọn tệp CSV hoặc dán dữ liệu bảng từ Excel vào ô trên.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto custom-scrollbar rounded-xl border border-slate-800 bg-slate-950/70 p-2 space-y-2">
                    {csvParsedCards.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-md bg-pink-500/30 text-pink-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {idx + 1}
                          </span>
                          <div className="w-9 h-9 rounded-md overflow-hidden bg-slate-950 shrink-0 border border-slate-700 p-0.5">
                            <img
                              src={item.img}
                              alt={item.word}
                              className="max-w-full max-h-full object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `https://placehold.co/100x100/ec4899/ffffff?text=${encodeURIComponent(item.word.charAt(0))}`;
                              }}
                            />
                          </div>
                          <span className="font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                            {item.word}
                          </span>
                        </div>
                        <span className="text-slate-400 truncate max-w-[180px] text-[11px] font-mono hidden sm:inline">
                          {item.img}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-pink-400/30 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/80">
              <button
                type="button"
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setCsvParsedCards([]);
                  setCsvRawText('');
                  setCsvFileName('');
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>

              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  disabled={csvParsedCards.length === 0}
                  onClick={() => handleApplyCsvImport('append')}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-300/40 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Thêm vào danh sách (+{csvParsedCards.length} thẻ)
                </button>
                <button
                  type="button"
                  disabled={csvParsedCards.length === 0}
                  onClick={() => handleApplyCsvImport('replace')}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-pink-300/40 flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Thay thế toàn bộ ({csvParsedCards.length} thẻ)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal for Prompts & Alerts */}
      <Modal config={modalConfig} onClose={() => setModalConfig(null)} />
    </div>
  );
}
