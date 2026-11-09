export interface Flashcard {
  id: string;
  word: string;
  img: string;
  createdAt: number;
  roomId: string;
}

export interface ModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  isPrompt?: boolean;
  defaultValue?: string;
  showCancel?: boolean;
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
}
