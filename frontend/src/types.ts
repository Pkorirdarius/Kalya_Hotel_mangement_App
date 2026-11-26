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
  size: number;
  bedKey: string;
  image: string;
}

export const ROOMS: RoomType[] = [
  {
    id: 'standard-executive',
    nameKey: 'room.standard.name',
    price: 8500,
    sleeps: 2,
    size: 28,
    bedKey: 'room.standard.bed',
    image:
      '/images/room-standard.jpg',
  },
  {
    id: 'deluxe-garden-suite',
    nameKey: 'room.deluxe.name',
    price: 12800,
    sleeps: 2,
    size: 42,
    bedKey: 'room.deluxe.bed',
    image:
      '/images/room-deluxe.jpg',
  },
  {
    id: 'mara-residence',
    nameKey: 'room.mara.name',
    price: 18500,
    sleeps: 3,
    size: 58,
    bedKey: 'room.mara.bed',
    image:
      '/images/room-mara.jpg',
  },
];

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
