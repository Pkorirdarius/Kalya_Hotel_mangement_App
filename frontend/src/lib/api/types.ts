import type { components, operations } from '../api-schema';

/**
 * Re-exported generated OpenAPI types.
 *
 * These are produced by `npm run api:types` from `backend/openapi.yaml`.
 * Never hand-write a DTO that already exists here.
 */
export type Schemas = components['schemas'];
export type Operations = operations;

export type Room = Schemas['RoomTypePublic'];
export type RoomDetail = Schemas['RoomTypeDetail'];
export type MealPlan = Schemas['MealPlan'];
export type HotelSettings = Schemas['PublicHotelSetting'];
export type AvailabilityRow = Schemas['AvailabilityRow'];
export type Quote = Schemas['QuoteResponse'];
export type Booking = Schemas['BookingPublic'];
export type BookingCreate = Schemas['BookingCreateRequest'];
export type BookingCreateResponse = Schemas['BookingCreateResponse'];
export type Payment = Schemas['Payment'];
export type PaymentInitiate = Schemas['PaymentInitiateRequest'];
export type PaymentInitiateResponse = Schemas['PaymentInitiateResponse'];
export type PaymentMethod = Schemas['MethodEnum'];
export type MenuItem = Schemas['MenuItem'];
export type TableBooking = Schemas['TableBooking'];
export type TableBookingCreate = Schemas['TableBookingCreateRequest'];
export type TableBookingCreateResponse = Schemas['TableBookingCreateResponse'];
export type RestaurantSlot = Schemas['RestaurantSlot'];
export type ConferenceAvailability = Schemas['ConferenceAvailability'];
export type ConferenceEnquiry = Schemas['ConferenceEnquiry'];
export type ConferenceEnquiryCreate = Schemas['ConferenceEnquiryCreateRequest'];
export type ConferenceEnquiryCreateResponse = Schemas['ConferenceEnquiryCreateResponse'];
export type GymAvailability = Schemas['GymAvailability'];
export type GymDayPass = Schemas['GymDayPass'];
export type GymDayPassCreate = Schemas['GymDayPassCreateRequest'];
export type GymDayPassCreateResponse = Schemas['GymDayPassCreateResponse'];
export type Offer = Schemas['Offer'];
export type BlogPost = Schemas['BlogPost'];
export type Review = Schemas['Review'];
export type ReviewList = Schemas['ReviewList'];
export type ContactMessageCreate = Schemas['ContactMessageCreateRequest'];
export type ContactMessageEnvelope = Schemas['ContactMessageEnvelope'];
export type NewsletterSubscribe = Schemas['NewsletterSubscribeRequest'];
export type NewsletterSubscribeResponse = Schemas['NewsletterSubscribeResponse'];
export type PaymentMethodsResponse = Schemas['PaymentMethodsResponse'];
export type QueueResponse = Schemas['QueueResponse'];
export type QueueItem = Schemas['QueueItem'];
export type DeskAction = Schemas['DeskAction'];
export type DeskActionRequest = Schemas['DeskActionRequestRequest'];
export type ActivityRow = Schemas['ActivityRow'];
export type ActivityResponse = Schemas['ActivityResponse'];
export type EscalateResponse = Schemas['EscalateResponse'];
export type Overview = Schemas['Overview'];
export type User = Schemas['User'];

export type StaffBooking = Schemas['StaffBooking'];
export type ConferenceEnquiryStaff = Schemas['ConferenceEnquiryStaff'];
export type TableBookingStaff = Schemas['TableBookingStaff'];
export type GymDayPassStaff = Schemas['GymDayPassStaff'];
export type MenuItemStaff = Schemas['MenuItemStaff'];

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
