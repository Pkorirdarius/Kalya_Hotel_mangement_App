/**
 * Typed endpoint functions for the hotel public + staff API.
 *
 * Everything here is generated from `backend/openapi.yaml` via `npm run api:types`.
 * Pages and hooks call these functions; they never build URLs themselves.
 */

import { apiRequest } from './client';
import type {
  AvailabilityRow,
  BlogPost,
  Booking,
  BookingCreate,
  BookingCreateResponse,
  ConferenceAvailability,
  ConferenceEnquiryCreate,
  ConferenceEnquiryCreateResponse,
  ContactMessageCreate,
  ContactMessageEnvelope,
  DeskAction,
  DeskActionRequest,
  GymAvailability,
  GymDayPassCreate,
  GymDayPassCreateResponse,
  HotelSettings,
  MealPlan,
  MenuItem,
  NewsletterSubscribe,
  NewsletterSubscribeResponse,
  Offer,
  Payment,
  PaymentInitiate,
  PaymentInitiateResponse,
  PaymentMethodsResponse,
  QueueResponse,
  Quote,
  RestaurantSlot,
  ReviewList,
  Room,
  RoomDetail,
  TableBookingCreate,
  TableBookingCreateResponse,
  User,
} from './types';

// ---------------------------------------------------------------------------
// Hotel content
// ---------------------------------------------------------------------------

export const getHotelSettings = () => apiRequest<HotelSettings>('/common/hotel/');

export const getRooms = () => apiRequest<Room[]>('/rooms/');

export const getRoom = (slug: string) => apiRequest<RoomDetail>(`/rooms/${slug}/`);

export const getMealPlans = () => apiRequest<MealPlan[]>('/meal-plans/');

export const getOffers = () => apiRequest<Offer[]>('/content/offers/');

export const getPosts = () => apiRequest<BlogPost[]>('/content/posts/');

export const getPost = (slug: string) => apiRequest<BlogPost>(`/content/posts/${slug}/`);

export const getReviews = () => apiRequest<ReviewList>('/content/reviews/');

export const getMenu = (params?: { venue?: string; category?: string }) =>
  apiRequest<MenuItem[]>('/facilities/menu/', { params });

// ---------------------------------------------------------------------------
// Room bookings + availability
// ---------------------------------------------------------------------------

export const getRoomAvailability = (params: {
  checkin: string;
  checkout: string;
  guests?: number;
}) => apiRequest<AvailabilityRow[]>('/bookings/availability/', { params });

export const getQuote = (body: {
  room_type: string;
  meal_plan: string;
  checkin: string;
  checkout: string;
  guests: number;
  rate_plan?: number | null;
}) => apiRequest<Quote>('/bookings/quote/', { method: 'POST', body });

export const createBooking = (body: BookingCreate) =>
  apiRequest<BookingCreateResponse>('/bookings/', { method: 'POST', body });

export const getBooking = (
  reference: string,
  contact: { email?: string; phone?: string },
) => apiRequest<Booking>(`/bookings/${encodeURIComponent(reference)}/`, { params: contact });

export const cancelBooking = (
  reference: string,
  contact: { email?: string; phone?: string },
  reason?: string,
) =>
  apiRequest<Booking>(`/bookings/${encodeURIComponent(reference)}/cancel/`, {
    method: 'POST',
    params: contact,
    body: { reason: reason ?? '' },
  });

// ---------------------------------------------------------------------------
// Restaurant
// ---------------------------------------------------------------------------

export const getRestaurantSlots = (date: string) =>
  apiRequest<RestaurantSlot[]>('/facilities/restaurant/slots/', {
    params: { date },
  });

export const createTableBooking = (body: TableBookingCreate) =>
  apiRequest<TableBookingCreateResponse>('/facilities/restaurant/bookings/', {
    method: 'POST',
    body,
  });

// ---------------------------------------------------------------------------
// Conference
// ---------------------------------------------------------------------------

export const getConferenceAvailability = (params?: { date?: string; session?: string }) =>
  apiRequest<ConferenceAvailability[]>('/facilities/conference/availability/', { params });

export const createConferenceEnquiry = (body: ConferenceEnquiryCreate) =>
  apiRequest<ConferenceEnquiryCreateResponse>('/facilities/conference/enquiries/', {
    method: 'POST',
    body,
  });

// ---------------------------------------------------------------------------
// Gym
// ---------------------------------------------------------------------------

export const getGymAvailability = (date?: string) =>
  apiRequest<GymAvailability>('/facilities/gym/availability/', { params: { date } });

export const createGymDayPass = (body: GymDayPassCreate) =>
  apiRequest<GymDayPassCreateResponse>('/facilities/gym/day-passes/', {
    method: 'POST',
    body,
  });

// ---------------------------------------------------------------------------
// Marketing
// ---------------------------------------------------------------------------

export const subscribeNewsletter = (body: NewsletterSubscribe) =>
  apiRequest<NewsletterSubscribeResponse>('/marketing/newsletter/', {
    method: 'POST',
    body,
  });

export const sendContactMessage = (body: ContactMessageCreate) =>
  apiRequest<ContactMessageEnvelope>('/marketing/contact/', {
    method: 'POST',
    body,
  });

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export const getPaymentMethods = () =>
  apiRequest<PaymentMethodsResponse>('/payments/methods/');

export const initiateBookingPayment = (reference: string, body: PaymentInitiate) =>
  apiRequest<PaymentInitiateResponse>(
    `/payments/bookings/${encodeURIComponent(reference)}/`,
    { method: 'POST', body },
  );

export const initiateGymPayment = (reference: string, body: PaymentInitiate) =>
  apiRequest<PaymentInitiateResponse>(
    `/payments/gym/day-passes/${encodeURIComponent(reference)}/`,
    { method: 'POST', body },
  );

export const getPayment = (reference: string) =>
  apiRequest<Payment>(`/payments/${encodeURIComponent(reference)}/`);

export const completeSandboxPayment = (reference: string, success = true) =>
  apiRequest<Payment>(`/payments/${encodeURIComponent(reference)}/sandbox-complete/`, {
    method: 'POST',
    body: { success },
  });

// ---------------------------------------------------------------------------
// Staff auth + front desk
// ---------------------------------------------------------------------------

export interface LoginBody {
  username: string;
  password: string;
}

export interface UserEnvelope {
  user: User;
}

export const staffLogin = (body: LoginBody) =>
  apiRequest<UserEnvelope>('/staff/auth/login/', { method: 'POST', body });

export const staffLogout = () =>
  apiRequest<void>('/staff/auth/logout/', { method: 'POST' });

export const staffMe = () => apiRequest<UserEnvelope>('/staff/auth/me/');

export const getFrontDeskQueue = () =>
  apiRequest<QueueResponse>('/staff/frontdesk/queue/');

export const frontDeskAction = (body: DeskActionRequest) =>
  apiRequest<DeskAction>('/staff/frontdesk/actions/', { method: 'POST', body });

export const getFrontDeskActivity = (limit = 12) =>
  apiRequest<import('./types').ActivityResponse>('/staff/frontdesk/activity/', {
    params: { limit },
  });

export const escalateOverdue = () =>
  apiRequest<import('./types').EscalateResponse>('/staff/frontdesk/escalate/', {
    method: 'POST',
  });
