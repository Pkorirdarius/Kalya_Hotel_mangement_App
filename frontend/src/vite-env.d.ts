/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_ANALYTICS_DOMAIN?: string;
  readonly VITE_HOTEL_NAME?: string;
  readonly VITE_HOTEL_SHORT_NAME?: string;
  readonly VITE_HOTEL_MONOGRAM?: string;
  readonly VITE_HOTEL_LEGAL_NAME?: string;
  readonly VITE_HOTEL_DOMAIN?: string;
  readonly VITE_HOTEL_WEBSITE_URL?: string;
  readonly VITE_HOTEL_LOGO_SUBLINE?: string;
  readonly VITE_HOTEL_ADDRESS_LINE?: string;
  readonly VITE_HOTEL_TOWN?: string;
  readonly VITE_HOTEL_COUNTY?: string;
  readonly VITE_HOTEL_COUNTRY?: string;
  readonly VITE_HOTEL_MAP_QUERY?: string;
  readonly VITE_HOTEL_PHONE_DISPLAY?: string;
  readonly VITE_HOTEL_PHONE_HREF?: string;
  readonly VITE_HOTEL_WHATSAPP_NUMBER?: string;
  readonly VITE_HOTEL_EMAIL?: string;
  readonly VITE_HOTEL_RESTAURANT_NAME?: string;
  readonly VITE_HOTEL_CAFE_NAME?: string;
  readonly VITE_HOTEL_HALL_NAME?: string;
  readonly VITE_HOTEL_HALL_NAMES?: string;
  readonly VITE_HOTEL_GYM_NAME?: string;
  readonly VITE_HOTEL_FACEBOOK_URL?: string;
  readonly VITE_HOTEL_INSTAGRAM_URL?: string;
  readonly VITE_HOTEL_X_URL?: string;
  readonly VITE_HOTEL_LINKEDIN_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
