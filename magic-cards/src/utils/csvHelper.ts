import { Flashcard } from '../types';

export interface CsvCardRow {
  word: string;
  img: string;
}

/**
 * Parses CSV / TSV / Semicolon-delimited text into flashcard data rows.
 * Handles quotes, commas inside fields, UTF-8 BOM, and header detection.
 */
export function parseCsvContent(text: string): CsvCardRow[] {
  if (!text) return [];

  // Remove UTF-8 BOM if present
  const clean = text.replace(/^\uFEFF/, '').trim();
  if (!clean) return [];

  // Split lines
  const rawLines = clean.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (rawLines.length === 0) return [];

  // Parse a single line respecting quotes and detecting delimiters
  const parseLine = (line: string): string[] => {
    let delimiter = ',';
    if (line.includes('\t')) delimiter = '\t';
    else if (line.includes(';') && !line.includes(',')) delimiter = ';';

    const fields: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        fields.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    fields.push(cur.trim());
    return fields;
  };

  const parsedRows = rawLines.map(parseLine);
  if (parsedRows.length === 0) return [];

  // Check if first row is a header row
  let startIndex = 0;
  const firstRow = parsedRows[0].map((c) => c.toLowerCase());
  const isHeader = firstRow.some((c) =>
    c.includes('từ vựng') ||
    c.includes('word') ||
    c.includes('câu hỏi') ||
    c.includes('hình ảnh') ||
    c.includes('image') ||
    c.includes('url')
  );

  if (isHeader) {
    startIndex = 1;
  }

  const results: CsvCardRow[] = [];
  const colors = ['f472b6', 'fb7185', 'c084fc', 'e879f9', '38bdf8', '34d399', 'fb923c'];

  for (let i = startIndex; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    if (row.length === 0) continue;

    const word = row[0]?.trim();
    if (!word) continue;

    let img = row[1]?.trim() || '';

    // If image URL is missing or not a link, provide a fallback colorful placeholder
    if (!img || (!img.startsWith('http://') && !img.startsWith('https://') && !img.startsWith('data:image/'))) {
      const col = colors[Math.floor(Math.random() * colors.length)];
      img = `https://placehold.co/400x300/${col}/ffffff?text=${encodeURIComponent(word)}`;
    }

    results.push({ word, img });
  }

  return results;
}

/**
 * Generates and downloads a sample CSV template file matching the user's required schema.
 */
export function downloadCsvTemplate(): void {
  const templateContent =
    '\uFEFF' +
    'Từ vựng / Câu hỏi (Word),URL Hình ảnh (Image URL)\r\n' +
    'go for a swim,https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&q=80\r\n' +
    'go for a ride,https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&q=80\r\n' +
    'watch a movie,https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80\r\n' +
    'read a book,https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&q=80\r\n' +
    'play football,https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&q=80\r\n';

  const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'mau_nhap_tu_vung_flashcards.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports current flashcards deck to CSV with standard quotes.
 */
export function exportCardsToCsv(cards: Flashcard[], roomName: string): void {
  if (cards.length === 0) return;

  let csvContent = '\uFEFF"Từ vựng / Câu hỏi (Word)","URL Hình ảnh (Image URL)"\r\n';
  cards.forEach((card) => {
    const escapedWord = card.word.replace(/"/g, '""');
    const escapedImg = card.img.replace(/"/g, '""');
    csvContent += `"${escapedWord}","${escapedImg}"\r\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `danh_sach_the_${roomName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
