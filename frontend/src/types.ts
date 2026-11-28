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
  /** Room-only nightly base used by the quote fallback. */
  price: number;
  /** Nightly bed-and-breakfast total for one guest, shown to guests. */
  fromPrice: number;
  sleeps: number;
  bedKey: string;
  image: string;
  bestForKey: string;
}

export const ROOMS: RoomType[] = [
  {
    id: 'superior',
    nameKey: 'room.superior.name',
    price: 6000,
    fromPrice: 7000,
    sleeps: 2,
    bedKey: 'room.superior.bed',
    image: '/images/room-standard.webp',
    bestForKey: 'room.superior.bestFor',
  },
  {
    id: 'deluxe',
    nameKey: 'room.deluxe.name',
    price: 6000,
    fromPrice: 7000,
    sleeps: 2,
    bedKey: 'room.deluxe.bed',
    image: '/images/room-deluxe.webp',
    bestForKey: 'room.deluxe.bestFor',
  },
  {
    id: 'twin',
    nameKey: 'room.twin.name',
    price: 6000,
    fromPrice: 7000,
    sleeps: 2,
    bedKey: 'room.twin.bed',
    image: '/images/room-gallery-3.webp',
    bestForKey: 'room.twin.bestFor',
  },
  {
    id: 'en-suite',
    nameKey: 'room.ensuite.name',
    price: 9000,
    fromPrice: 10000,
    sleeps: 2,
    bedKey: 'room.ensuite.bed',
    image: '/images/room-mara.webp',
    bestForKey: 'room.ensuite.bestFor',
  },
];

export type MealPlanId = 'room-only' | 'breakfast' | 'dinner' | 'half-board' | 'full-board';

export interface MealPlan {
  id: MealPlanId;
  labelKey: string;
  /** Board supplement for one guest, per room per night. */
  supplement: number;
  /** Added per night for each guest beyond the first. */
  extraPerson: number;
  noteKey: string;
}

export const MEAL_PLANS: MealPlan[] = [
  { id: 'room-only', labelKey: 'meal.roomOnly', supplement: 0, extraPerson: 0, noteKey: 'meal.roomOnlyNote' },
  { id: 'breakfast', labelKey: 'meal.breakfast', supplement: 1000, extraPerson: 1500, noteKey: 'meal.breakfastNote' },
  { id: 'dinner', labelKey: 'meal.dinner', supplement: 1800, extraPerson: 1500, noteKey: 'meal.dinnerNote' },
  { id: 'half-board', labelKey: 'meal.halfBoard', supplement: 2500, extraPerson: 1500, noteKey: 'meal.halfBoardNote' },
  { id: 'full-board', labelKey: 'meal.fullBoard', supplement: 4000, extraPerson: 1500, noteKey: 'meal.fullBoardNote' },
];
