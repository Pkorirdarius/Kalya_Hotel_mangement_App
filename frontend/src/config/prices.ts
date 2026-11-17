/**
 * Guest-facing prices that are also stored in the backend `HotelSetting`.
 *
 * The gym day pass is the only price duplicated in the frontend as a fallback
 * when the public settings API is unavailable. It must remain 500 KES and is
 * checked against `HotelSetting.gym_day_pass_price` by
 * `backend/apps/common/tests/test_gym_price.py`.
 *
 * Still pending hotel confirmation; see docs/LAUNCH-CHECKLIST.md.
 */
export const GYM_DAY_PASS_PRICE = 500;
