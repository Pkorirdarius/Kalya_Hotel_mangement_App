/**
 * Typed React Query hooks, one per API resource.
 *
 * Pages call these hooks instead of `fetch` or endpoint functions directly, so
 * caching, retries and invalidation stay consistent across the site.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelBooking,
  completeSandboxPayment,
  createBooking,
  createConferenceEnquiry,
  createGymDayPass,
  createTableBooking,
  escalateOverdue,
  frontDeskAction,
  getBooking,
  getConferenceAvailability,
  getFrontDeskActivity,
  getFrontDeskQueue,
  getGymAvailability,
  getHotelSettings,
  getMealPlans,
  getMenu,
  getOffers,
  getPayment,
  getPaymentMethods,
  getPost,
  getPosts,
  getQuote,
  getRestaurantSlots,
  getReviews,
  getRoom,
  getRoomAvailability,
  getRooms,
  initiateBookingPayment,
  initiateGymPayment,
  sendContactMessage,
  staffLogin,
  staffLogout,
  staffMe,
  subscribeNewsletter,
} from '../api/endpoints';
import type {
  BookingCreate,
  ConferenceEnquiryCreate,
  DeskActionRequest,
  GymDayPassCreate,
  NewsletterSubscribe,
  PaymentInitiate,
  TableBookingCreate,
  ContactMessageCreate,
} from '../api/types';
import type { AvailabilityParams, Contact } from './keys';
import { queryKeys } from './keys';

type Enabled = { enabled?: boolean };

// ---------------------------------------------------------------------------
// Hotel content
// ---------------------------------------------------------------------------

export function useHotelSettings(options: Enabled = {}) {
  return useQuery({
    queryKey: queryKeys.hotel,
    queryFn: getHotelSettings,
    enabled: options.enabled ?? true,
  });
}

export function useRooms(options: Enabled = {}) {
  return useQuery({
    queryKey: queryKeys.rooms,
    queryFn: getRooms,
    enabled: options.enabled ?? true,
  });
}

export function useRoom(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.room(slug ?? ''),
    queryFn: () => getRoom(slug as string),
    enabled: Boolean(slug),
  });
}

export function useMealPlans() {
  return useQuery({ queryKey: queryKeys.mealPlans, queryFn: getMealPlans });
}

export function useOffers() {
  return useQuery({ queryKey: queryKeys.offers, queryFn: getOffers });
}

export function usePosts() {
  return useQuery({ queryKey: queryKeys.posts, queryFn: getPosts });
}

export function usePost(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.post(slug ?? ''),
    queryFn: () => getPost(slug as string),
    enabled: Boolean(slug),
  });
}

export function useReviews(options: Enabled = {}) {
  return useQuery({
    queryKey: queryKeys.reviews,
    queryFn: getReviews,
    enabled: options.enabled ?? true,
  });
}

export function useMenu(params?: { venue?: string; category?: string }) {
  return useQuery({
    queryKey: queryKeys.menu(params),
    queryFn: () => getMenu(params),
  });
}

// ---------------------------------------------------------------------------
// Room bookings
// ---------------------------------------------------------------------------

export function useRoomAvailability(params: AvailabilityParams, options: Enabled = {}) {
  return useQuery({
    queryKey: queryKeys.availability(params),
    queryFn: () => getRoomAvailability(params),
    enabled: (options.enabled ?? true) && Boolean(params.checkin && params.checkout),
  });
}

export interface QuoteBody {
  room_type: string;
  meal_plan: string;
  checkin: string;
  checkout: string;
  guests: number;
  rate_plan?: number | null;
}

export function useQuoteMutation() {
  return useMutation({ mutationFn: (body: QuoteBody) => getQuote(body) });
}

export function useCreateBookingMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: BookingCreate) => createBooking(body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useBooking(reference: string | undefined, contact: Contact) {
  return useQuery({
    queryKey: queryKeys.booking(reference ?? '', contact),
    queryFn: () => getBooking(reference as string, contact),
    enabled: Boolean(reference && (contact.email || contact.phone)),
  });
}

export function useCancelBookingMutation(contact: Contact) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ reference, reason }: { reference: string; reason?: string }) =>
      cancelBooking(reference, contact, reason),
    onSuccess: (booking) => {
      void client.invalidateQueries({ queryKey: ['booking', booking.reference] });
      void client.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Restaurant
// ---------------------------------------------------------------------------

export function useRestaurantSlots(date: string | undefined) {
  return useQuery({
    queryKey: queryKeys.restaurantSlots(date ?? ''),
    queryFn: () => getRestaurantSlots(date as string),
    enabled: Boolean(date),
  });
}

export function useCreateTableBookingMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: TableBookingCreate) => createTableBooking(body),
    onSuccess: (_data, variables) => {
      if (variables.date) {
        void client.invalidateQueries({ queryKey: queryKeys.restaurantSlots(variables.date) });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Conference
// ---------------------------------------------------------------------------

export function useConferenceAvailability(params?: { date?: string; session?: string }) {
  return useQuery({
    queryKey: queryKeys.conferenceAvailability(params),
    queryFn: () => getConferenceAvailability(params),
  });
}

export function useCreateConferenceEnquiryMutation() {
  return useMutation({
    mutationFn: (body: ConferenceEnquiryCreate) => createConferenceEnquiry(body),
  });
}

// ---------------------------------------------------------------------------
// Gym
// ---------------------------------------------------------------------------

export function useGymAvailability(date?: string) {
  return useQuery({
    queryKey: queryKeys.gymAvailability(date),
    queryFn: () => getGymAvailability(date),
  });
}

export function useCreateGymDayPassMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: GymDayPassCreate) => createGymDayPass(body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['gym-availability'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Marketing
// ---------------------------------------------------------------------------

export function useSubscribeNewsletterMutation() {
  return useMutation({
    mutationFn: (body: NewsletterSubscribe) => subscribeNewsletter(body),
  });
}

export function useSendContactMessageMutation() {
  return useMutation({
    mutationFn: (body: ContactMessageCreate) => sendContactMessage(body),
  });
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export function usePaymentMethods() {
  return useQuery({ queryKey: queryKeys.paymentMethods, queryFn: getPaymentMethods });
}

export function useInitiateBookingPaymentMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ reference, body }: { reference: string; body: PaymentInitiate }) =>
      initiateBookingPayment(reference, body),
    onSuccess: (_data, variables) => {
      void client.invalidateQueries({ queryKey: ['booking', variables.reference] });
    },
  });
}

export function useInitiateGymPaymentMutation() {
  return useMutation({
    mutationFn: ({ reference, body }: { reference: string; body: PaymentInitiate }) =>
      initiateGymPayment(reference, body),
  });
}

export function usePayment(reference: string | undefined, poll = false) {
  return useQuery({
    queryKey: queryKeys.payment(reference ?? ''),
    queryFn: () => getPayment(reference as string),
    enabled: Boolean(reference),
    refetchInterval: poll ? 3_000 : false,
  });
}

export function useCompleteSandboxPaymentMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ reference, success = true }: { reference: string; success?: boolean }) =>
      completeSandboxPayment(reference, success),
    onSuccess: (payment) => {
      void client.invalidateQueries({ queryKey: queryKeys.payment(payment.reference) });
    },
  });
}

// ---------------------------------------------------------------------------
// Staff auth + front desk
// ---------------------------------------------------------------------------

export function useStaffMe(options: Enabled = {}) {
  return useQuery({
    queryKey: queryKeys.staffMe,
    queryFn: staffMe,
    enabled: options.enabled ?? true,
    retry: false,
  });
}

export function useStaffLoginMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: staffLogin,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.staffMe });
    },
  });
}

export function useStaffLogoutMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: staffLogout,
    onSuccess: () => {
      client.removeQueries({ queryKey: ['staff'] });
      client.removeQueries({ queryKey: ['frontdesk'] });
    },
  });
}

export function useFrontDeskQueue(options: Enabled & { poll?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.frontDeskQueue,
    queryFn: getFrontDeskQueue,
    enabled: options.enabled ?? true,
    refetchInterval: options.poll ? 5_000 : false,
    retry: false,
  });
}

export function useFrontDeskActivity(limit = 12, options: Enabled = {}) {
  return useQuery({
    queryKey: queryKeys.frontDeskActivity(limit),
    queryFn: () => getFrontDeskActivity(limit),
    enabled: options.enabled ?? true,
    retry: false,
  });
}

export function useFrontDeskActionMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: DeskActionRequest) => frontDeskAction(body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['frontdesk'] });
    },
  });
}

export function useEscalateOverdueMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => escalateOverdue(),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['frontdesk'] });
    },
  });
}
