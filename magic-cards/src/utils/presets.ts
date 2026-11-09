import { Flashcard } from '../types';

export const getPresetNumbers1To10 = (roomId: string): Flashcard[] => {
  const numbers = [
    { num: '1', word: 'One', color: 'f472b6', emoji: '1️⃣' },
    { num: '2', word: 'Two', color: 'fb7185', emoji: '2️⃣' },
    { num: '3', word: 'Three', color: 'c084fc', emoji: '3️⃣' },
    { num: '4', word: 'Four', color: 'e879f9', emoji: '4️⃣' },
    { num: '5', word: 'Five', color: '38bdf8', emoji: '5️⃣' },
    { num: '6', word: 'Six', color: '34d399', emoji: '6️⃣' },
    { num: '7', word: 'Seven', color: 'facc15', emoji: '7️⃣' },
    { num: '8', word: 'Eight', color: 'fb923c', emoji: '8️⃣' },
    { num: '9', word: 'Nine', color: 'f43f5e', emoji: '9️⃣' },
    { num: '10', word: 'Ten', color: 'a855f7', emoji: '🔟' },
  ];

  return numbers.map((item, idx) => ({
    id: `num_${item.num}_${Date.now()}_${idx}`,
    word: item.word,
    img: `https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=400&q=80#${item.word}`,
    createdAt: Date.now() + idx,
    roomId,
  }));
};

export const getPresetAnimals = (roomId: string): Flashcard[] => {
  const animals = [
    { word: 'Lion', img: 'https://images.unsplash.com/photo-1614027164847-1b28caa1407c?auto=format&fit=crop&w=400&q=80' },
    { word: 'Elephant', img: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=400&q=80' },
    { word: 'Panda', img: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?auto=format&fit=crop&w=400&q=80' },
    { word: 'Tiger', img: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?auto=format&fit=crop&w=400&q=80' },
    { word: 'Rabbit', img: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=400&q=80' },
    { word: 'Monkey', img: 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?auto=format&fit=crop&w=400&q=80' },
    { word: 'Penguin', img: 'https://images.unsplash.com/photo-1598439210625-5067c578f3f6?auto=format&fit=crop&w=400&q=80' },
    { word: 'Dolphin', img: 'https://images.unsplash.com/photo-1570481662006-a3a1374699e8?auto=format&fit=crop&w=400&q=80' },
  ];

  return animals.map((a, idx) => ({
    id: `animal_${idx}_${Date.now()}`,
    word: a.word,
    img: a.img,
    createdAt: Date.now() + idx,
    roomId,
  }));
};

export const getPresetFruits = (roomId: string): Flashcard[] => {
  const fruits = [
    { word: 'Apple', img: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80' },
    { word: 'Banana', img: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80' },
    { word: 'Strawberry', img: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=400&q=80' },
    { word: 'Orange', img: 'https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=400&q=80' },
    { word: 'Watermelon', img: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=400&q=80' },
    { word: 'Grapes', img: 'https://images.unsplash.com/photo-1596363505729-4190a9506133?auto=format&fit=crop&w=400&q=80' },
    { word: 'Pineapple', img: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=400&q=80' },
    { word: 'Mango', img: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=400&q=80' },
  ];

  return fruits.map((f, idx) => ({
    id: `fruit_${idx}_${Date.now()}`,
    word: f.word,
    img: f.img,
    createdAt: Date.now() + idx,
    roomId,
  }));
};
