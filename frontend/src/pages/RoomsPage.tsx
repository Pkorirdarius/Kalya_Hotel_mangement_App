import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Link } from '../components/LocalizedLink';
import { usePageMeta } from '../components/Page';
import { useI18n } from '../i18n-context';
import { ROOMS, roomInventory, type RoomType } from '../types';

interface RoomDetail {
  id: string;
  rating: string;
  pill: string;
  pillIcon: string;
  pillKey: string;
  images: Array<{ src: string; alt: string }>;
  amenities: Array<{ icon: string; key: string }>;
}

const SHARED_AMENITIES: Array<{ icon: string; key: string }> = [
  { icon: 'wifi', key: 'amenities.wifi' },
  { icon: 'tv', key: 'amenities.tv' },
  { icon: 'room_service', key: 'amenities.roomService' },
  { icon: 'lock', key: 'amenities.safe' },
  { icon: 'iron', key: 'amenities.ironing' },
  { icon: 'iron', key: 'amenities.ironingBox' },
  { icon: 'door_front', key: 'amenities.smartCardDoors' },
];

const ROOM_DETAILS: RoomDetail[] = [
  {
    id: 'superior',
    rating: '4.8',
    pill: 'bg-cream/95 text-forest',
    pillIcon: 'star',
    pillKey: 'room.popular',
    images: [
      {
        src: '/images/room-standard.webp',
        alt: 'Superior Room with king bed and writing desk',
      },
      {
        src: '/images/offer-longstay.webp',
        alt: 'Superior Room in warm evening light',
      },
      {
        src: '/images/room-gallery-3.webp',
        alt: 'Superior Room bathroom and bed detail',
      },
      {
        src: '/images/room-gallery-4.webp',
        alt: 'Superior Room seating corner',
      },
    ],
    amenities: [
      ...SHARED_AMENITIES,
      { icon: 'bed', key: 'amenities.orthopedic' },
      { icon: 'balcony', key: 'amenities.spacious' },
    ],
  },
  {
    id: 'deluxe',
    rating: '4.9',
    pill: 'bg-gold text-forest-dark',
    pillIcon: 'check_circle',
    pillKey: 'room.spacious',
    images: [
      {
        src: '/images/room-deluxe.webp',
        alt: 'Deluxe Room with queen bed',
      },
      {
        src: '/images/room-deluxe-2.webp',
        alt: 'Deluxe Room reading corner',
      },
      {
        src: '/images/room-deluxe-3.webp',
        alt: 'Deluxe Room bathroom detail',
      },
      {
        src: '/images/room-deluxe-4.webp',
        alt: 'Deluxe Room seating area',
      },
    ],
    amenities: [
      ...SHARED_AMENITIES,
      { icon: 'bed', key: 'amenities.orthopedic' },
      { icon: 'balcony', key: 'amenities.spacious' },
      { icon: 'kitchen', key: 'amenities.fridge' },
      { icon: 'balcony', key: 'amenities.balcony' },
    ],
  },
  {
    id: 'twin',
    rating: '4.7',
    pill: 'bg-cream/95 text-forest',
    pillIcon: 'group',
    pillKey: 'room.shared',
    images: [
      {
        src: '/images/room-gallery-3.webp',
        alt: 'Twin Room with two single beds',
      },
      {
        src: '/images/room-gallery-4.webp',
        alt: 'Twin Room seating corner',
      },
      {
        src: '/images/room-deluxe-2.webp',
        alt: 'Twin Room bathroom detail',
      },
      {
        src: '/images/room-standard.webp',
        alt: 'Twin Room prepared for guests',
      },
    ],
    amenities: [
      ...SHARED_AMENITIES,
      { icon: 'single_bed', key: 'amenities.singleBeds' },
      { icon: 'bed', key: 'amenities.orthopedic' },
      { icon: 'balcony', key: 'amenities.spacious' },
      { icon: 'kitchen', key: 'amenities.fridge' },
    ],
  },
  {
    id: 'en-suite',
    rating: '5.0',
    pill: 'bg-gold text-forest-dark',
    pillIcon: 'work',
    pillKey: 'room.vip',
    images: [
      {
        src: '/images/room-mara.webp',
        alt: 'En-suite Room lounge area with seating for four',
      },
      {
        src: '/images/room-mara-2.webp',
        alt: 'En-suite Room bedroom',
      },
      {
        src: '/images/room-mara-3.webp',
        alt: 'En-suite Room kitchenette and dining table',
      },
      {
        src: '/images/room-deluxe-4.webp',
        alt: 'En-suite Room seating and work corner',
      },
    ],
    amenities: [
      { icon: 'wifi', key: 'amenities.wifi' },
      { icon: 'tv', key: 'amenities.tv' },
      { icon: 'room_service', key: 'amenities.roomService' },
      { icon: 'lock', key: 'amenities.safe' },
      { icon: 'iron', key: 'amenities.ironing' },
      { icon: 'iron', key: 'amenities.ironingStandBox' },
      { icon: 'door_front', key: 'amenities.smartCardDoors' },
      { icon: 'bed', key: 'amenities.orthopedic' },
      { icon: 'balcony', key: 'amenities.spacious' },
      { icon: 'kitchen', key: 'amenities.fridge' },
      { icon: 'microwave', key: 'amenities.microwave' },
      { icon: 'countertops', key: 'amenities.miniKitchenette' },
      { icon: 'phone', key: 'amenities.ipPhone' },
      { icon: 'groups', key: 'amenities.loungeFour' },
    ],
  },
];

function thumbnailSrc(src: string): string {
  return src.replace(/\.webp$/, '-thumb.webp');
}

function RoomCard({ room, detail }: { room: RoomType; detail: RoomDetail }) {
  const { t, formatMoney } = useI18n();
  const [activeImage, setActiveImage] = useState(0);
  const prefix = room.nameKey.replace('.name', '');

  return (
    <article
      id={room.id}
      data-content-defer=""
      className="overflow-hidden rounded-[28px] border border-line bg-white shadow-soft scroll-mt-24"
    >
      <div className="grid lg:grid-cols-[1.08fr_1fr]">
        <div className="p-3 sm:p-4">
          <div>
            <div className="relative aspect-[16/11] overflow-hidden rounded-2xl bg-sand">
              <img
                src={detail.images[activeImage].src}
                srcSet={`${thumbnailSrc(detail.images[activeImage].src)} 600w, ${detail.images[activeImage].src.replace(/\.webp$/, '-800.webp')} 800w, ${detail.images[activeImage].src} 1200w`}
                sizes="(min-width: 1024px) 55vw, 100vw"
                alt={detail.images[activeImage].alt}
                className="h-full w-full object-cover transition-[transform,opacity] duration-300 ease-out"
                loading="lazy"
              />
              <span className={`pill absolute left-4 top-4 ${detail.pill}`}>
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                  {detail.pillIcon}
                </span>
                <span>{t(detail.pillKey)}</span>
              </span>
              <span className="absolute bottom-4 left-4 rounded-full bg-forest/90 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur">
                {t('common.freeCancellation')}
              </span>
            </div>
            <div
              className="mt-3 grid grid-cols-4 gap-2"
              role="group"
              aria-label={t('rooms.galleryLabel')}
            >
              {detail.images.map((image, index) => {
                const selected = index === activeImage;
                return (
                  <button
                    key={image.src}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={`overflow-hidden rounded-xl transition ${
                      selected
                        ? 'ring-2 ring-gold ring-offset-2 ring-offset-white'
                        : 'opacity-75 ring-1 ring-line hover:opacity-100'
                    }`}
                    aria-pressed={selected}
                    aria-label={image.alt}
                  >
                    <img
                      src={thumbnailSrc(image.src)}
                      alt=""
                      className="aspect-[4/3] w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{t(`${prefix}.tagline`)}</p>
              <h2 className="heading-sm mt-2">{t(room.nameKey)}</h2>
            </div>
            <span className="pill shrink-0 bg-forest-50 text-forest">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                star
              </span>
              {detail.rating}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">{t(`${prefix}.description`)}</p>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-semibold text-forest">
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[17px] text-gold-deep" aria-hidden="true">
                meeting_room
              </span>
              <span>{roomInventory(room, t)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[17px] text-gold-deep" aria-hidden="true">
                group
              </span>
              <span>{t(`room.sleeps${room.sleeps}`)}</span>
            </span>
          </div>
          <p className="mt-3 text-[12px] font-semibold text-gold-deep">{t(room.bestForKey)}</p>
          {room.noteKey ? (
            <p className="mt-1 text-[12px] font-medium text-muted">{t(room.noteKey)}</p>
          ) : null}

          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              {t('rooms.amenities')}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2.5 text-[12px] font-medium text-ink/80">
              {detail.amenities.map((amenity) => (
                <span key={amenity.key} className="inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-gold-deep" aria-hidden="true">
                    {amenity.icon}
                  </span>
                  <span>{t(amenity.key)}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-6">
            <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-5">
              <div>
                <p className="text-[11px] font-semibold text-muted">{t('common.from')}</p>
                <p className="mt-0.5 text-2xl font-bold tracking-tight text-forest">
                  KES {formatMoney(room.price)}{' '}
                  <span className="text-[11px] font-semibold text-muted">{t('common.perNight')}</span>
                </p>
                <p className="mt-1 text-[11px] text-muted">{t('common.taxesIncluded')}</p>
                <p className="mt-1 text-[11px] font-medium text-gold-deep">{t('common.pricesPending')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={`/booking?room=${room.id}`} className="btn-primary btn-sm">
                  {t('common.checkAvailability')}
                </Link>
                <Link to="/contact" className="btn-outline btn-sm">
                  {t('rooms.ask.cta')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function RoomsPage() {
  const { t } = useI18n();
  const { hash } = useLocation();
  usePageMeta(t('meta.rooms.title'), t('meta.rooms.description'));

  useEffect(() => {
    if (!hash) return;
    const target = document.getElementById(hash.slice(1));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hash]);

  return (
    <>
      <section className="border-b border-line bg-sand/60 py-14 md:py-20">
        <div className="container-page grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="eyebrow">{t('rooms.eyebrow')}</p>
            <h1 className="display mt-4">{t('rooms.title')}</h1>
            <p className="lede mt-5 max-w-xl">{t('rooms.text')}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/booking" className="btn-primary">
                {t('common.bookDirect')}
              </Link>
              <a href="#room-list" className="btn-outline">
                {t('common.viewRooms')}
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[12px] font-semibold text-forest">
              {[
                { icon: 'event_available', key: 'common.freeCancellation' },
                { icon: 'wifi', key: 'amenities.wifi' },
                { icon: 'local_parking', key: 'home.hero.parking' },
              ].map((item) => (
                <span key={item.key} className="inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px] text-gold-deep" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{t(item.key)}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-[28px] shadow-lift">
              <img
                src="/images/hero-rooms.webp"
                srcSet="/images/hero-rooms-mobile.webp 600w, /images/hero-rooms-900.webp 900w, /images/hero-rooms.webp 1000w"
                sizes="(min-width: 1024px) 45vw, 100vw"
                alt={t('rooms.heroAlt')}
                fetchPriority="high"
                className="aspect-[5/4] w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-5 left-4 right-8 rounded-2xl border border-line bg-white p-4 shadow-soft sm:left-8 sm:right-auto sm:w-72">
              <p className="flex items-center gap-2 text-[12px] font-bold text-forest">
                <span className="material-symbols-outlined text-[18px] text-gold-deep" aria-hidden="true">
                  verified
                </span>
                <span>{t('booking.bestRate')}</span>
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {t('booking.freeCancelShort')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section data-content-defer="" id="room-list" className="section scroll-mt-24">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">{t('rooms.list.eyebrow')}</p>
            <h2 className="heading mt-4">{t('rooms.list.title')}</h2>
            <p className="lede mt-4">{t('rooms.note')}</p>
          </div>

          <div className="mt-12 flex flex-col gap-8">
            {ROOMS.map((room) => {
              const detail = ROOM_DETAILS.find((item) => item.id === room.id);
              return detail ? <RoomCard key={room.id} room={room} detail={detail} /> : null;
            })}
          </div>
        </div>
      </section>

      <section data-content-defer="" className="bg-sand/70 py-14">
        <div className="container-page grid gap-6 md:grid-cols-3">
          {[
            { icon: 'wifi', title: 'amenities.wifi', text: 'rooms.wifi.text' },
            { icon: 'event_available', title: 'common.freeCancellation', text: 'summary.freeCancel' },
            { icon: 'support_agent', title: 'rooms.support.title', text: 'rooms.support.text' },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="icon-tile">
                <span className="material-symbols-outlined" aria-hidden="true">
                  {item.icon}
                </span>
              </span>
              <div>
                <h2 className="text-sm font-bold text-forest">{t(item.title)}</h2>
                <p className="mt-1 text-[12px] text-muted">{t(item.text)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section data-content-defer="" className="section bg-cream">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">{t('rooms.help.title')}</p>
            <h2 className="heading mt-4">{t('rooms.help.heading')}</h2>
            <p className="lede mt-4">{t('rooms.help.text')}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link to="/contact" className="btn-primary">
                {t('rooms.help.cta')}
              </Link>
              <Link to="/booking" className="btn-outline">
                {t('common.bookDirect')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
