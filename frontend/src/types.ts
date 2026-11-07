export const ROOM_CATEGORIES = ['executive', 'deluxe', 'extended'] as const;

export type RoomCategory = (typeof ROOM_CATEGORIES)[number];

export type RoomFilterValue = 'all' | RoomCategory;

export type Language = 'en' | 'sw';

export interface LanguageChangeDetail {
  language: Language;
}
