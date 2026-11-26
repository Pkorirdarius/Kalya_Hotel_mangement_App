export type Language = 'en' | 'sw';

export interface LanguageChangeDetail {
  language: Language;
}

export type PageId =
  | 'home'
  | 'rooms'
  | 'booking'
  | 'facilities'
  | 'dining'
  | 'conference'
  | 'gym'
  | 'dashboard'
  | 'offers'
  | 'contact';

export interface RoomType {
  id: string;
  nameKey: string;
  price: number;
  sleeps: number;
  roomCount: number;
  roomNumbers: string;
  bedKey: string;
  image: string;
  bestForKey: string;
  noteKey?: string;
}

export const ROOMS: RoomType[] = [
  {
    id: 'superior',
    nameKey: 'room.superior.name',
    price: 8500,
    sleeps: 2,
    roomCount: 2,
    roomNumbers: '201, 202',
    bedKey: 'room.superior.bed',
    image: '/images/room-standard.webp',
    bestForKey: 'room.superior.bestFor',
    noteKey: 'room.superior.note',
  },
  {
    id: 'deluxe',
    nameKey: 'room.deluxe.name',
    price: 12800,
    sleeps: 2,
    roomCount: 6,
    roomNumbers: '204, 205, 206, 207, 108, 109',
    bedKey: 'room.deluxe.bed',
    image: '/images/room-deluxe.webp',
    bestForKey: 'room.deluxe.bestFor',
  },
  {
    id: 'twin',
    nameKey: 'room.twin.name',
    price: 8500,
    sleeps: 2,
    roomCount: 1,
    roomNumbers: '',
    bedKey: 'room.twin.bed',
    image: '/images/room-gallery-3.webp',
    bestForKey: 'room.twin.bestFor',
  },
  {
    id: 'en-suite',
    nameKey: 'room.ensuite.name',
    price: 18500,
    sleeps: 2,
    roomCount: 1,
    roomNumbers: '203',
    bedKey: 'room.ensuite.bed',
    image: '/images/room-mara.webp',
    bestForKey: 'room.ensuite.bestFor',
  },
];

type Translation = (key: string, vars?: Record<string, string | number>) => string;

/** Render the confirmed "count | numbers | bed" line for a room type. */
export function roomInventory(room: RoomType, t: Translation): string {
  const count =
    room.roomCount === 1
      ? t('room.count.one')
      : t('room.count.other', { count: room.roomCount });
  return [count, room.roomNumbers || null, t(room.bedKey)]
    .filter(Boolean)
    .join(' | ');
}

export type MealPlanId = 'room-only' | 'breakfast' | 'dinner' | 'half-board' | 'full-board';

export interface MealPlan {
  id: MealPlanId;
  labelKey: string;
  supplement: number;
  noteKey: string;
}

export const MEAL_PLANS: MealPlan[] = [
  { id: 'room-only', labelKey: 'meal.roomOnly', supplement: 0, noteKey: 'meal.roomOnlyNote' },
  { id: 'breakfast', labelKey: 'meal.breakfast', supplement: 1200, noteKey: 'meal.breakfastNote' },
  { id: 'dinner', labelKey: 'meal.dinner', supplement: 1800, noteKey: 'meal.dinnerNote' },
  { id: 'half-board', labelKey: 'meal.halfBoard', supplement: 2800, noteKey: 'meal.halfBoardNote' },
  { id: 'full-board', labelKey: 'meal.fullBoard', supplement: 4200, noteKey: 'meal.fullBoardNote' },
];
