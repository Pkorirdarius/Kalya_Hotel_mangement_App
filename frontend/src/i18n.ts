import type { Language, LanguageChangeDetail } from './types';

const STORAGE_KEY = 'westside.language';

export const LANGUAGE_CHANGE_EVENT = 'westside:languagechange';

interface Entry {
  en: string;
  sw: string;
}

const entries: Record<string, Entry> = {
  'common.bookDirect': { en: 'Book Direct', sw: 'Weka Nafasi' },
  'common.checkAvailability': { en: 'Check availability', sw: 'Angalia nafasi' },
  'common.viewRooms': { en: 'View rooms', sw: 'Tazama vyumba' },
  'common.learnMore': { en: 'Learn more', sw: 'Jifunze zaidi' },
  'common.from': { en: 'From', sw: 'Kuanzia' },
  'common.perNight': { en: 'per night', sw: 'kwa usiku' },
  'common.freeCancellation': { en: 'Free cancellation', sw: 'Kughairi bila malipo' },
  'common.taxesIncluded': { en: 'VAT & service charge included', sw: 'VAT na ada ya huduma imejumuishwa' },
  'common.guests': { en: 'Guests', sw: 'Wageni' },
  'common.night': { en: 'night', sw: 'usiku' },
  'common.nights': { en: 'nights', sw: 'usiku' },
  'common.continue': { en: 'Continue', sw: 'Endelea' },
  'common.back': { en: 'Back', sw: 'Rudi' },
  'common.close': { en: 'Close', sw: 'Funga' },
  'common.call': { en: 'Call', sw: 'Piga simu' },
  'common.email': { en: 'Email', sw: 'Barua pepe' },
  'common.whatsapp': { en: 'WhatsApp us', sw: 'Wasiliana nasi WhatsApp' },
  'common.bookTable': { en: 'Book a table', sw: 'Weka meza' },
  'common.viewAll': { en: 'View all', sw: 'Tazama zote' },
  'common.readMore': { en: 'Read more', sw: 'Soma zaidi' },
  'common.submit': { en: 'Submit', sw: 'Tuma' },
  'common.sending': { en: 'Sending…', sw: 'Inatuma…' },
  'common.required': { en: 'Please complete this field.', sw: 'Tafadhali jaza sehemu hii.' },
  'common.optional': { en: 'Optional', sw: 'Si lazima' },
  'common.home': { en: 'Home', sw: 'Nyumbani' },
  'common.staff': { en: 'Staff', sw: 'Wafanyakazi' },
  'common.explore': { en: 'Explore', sw: 'Chunguza' },
  'common.bookNow': { en: 'Book now', sw: 'Weka nafasi sasa' },
  'common.perPerson': { en: 'per person', sw: 'kwa mtu' },
  'common.openNow': { en: 'Open now', sw: 'Iko wazi sasa' },
  'common.homeLabel': { en: 'Westside Hotel home', sw: 'Nyumbani Westside Hotel' },

  'nav.home': { en: 'Home', sw: 'Nyumbani' },
  'nav.rooms': { en: 'Rooms', sw: 'Vyumba' },
  'nav.facilities': { en: 'Facilities', sw: 'Huduma' },
  'nav.offers': { en: 'Offers & Journal', sw: 'Ofa na Jarida' },
  'nav.contact': { en: 'Contact', sw: 'Mawasiliano' },
  'nav.dining': { en: 'Restaurant & café', sw: 'Mgahawa na mkahawa' },
  'nav.conference': { en: 'Conference hall', sw: 'Ukumbi wa mikutano' },
  'nav.gym': { en: 'Gym', sw: 'Mazoezi' },
  'nav.dashboard': { en: 'Front desk dashboard', sw: 'Dashibodi ya mapokezi' },
  'nav.menu': { en: 'Menu', sw: 'Menyu' },

  'header.location': { en: 'Kapenguria, West Pokot', sw: 'Kapenguria, West Pokot' },
  'header.phoneLabel': { en: 'Call +254 20 765 4321', sw: 'Piga +254 20 765 4321' },
  'header.language': { en: 'Language', sw: 'Lugha' },
  'header.openMenu': { en: 'Open navigation menu', sw: 'Fungua menyu' },
  'header.closeMenu': { en: 'Close navigation menu', sw: 'Funga menyu' },
  'header.book': { en: 'Book Direct', sw: 'Weka Nafasi' },

  'footer.about': {
    en: 'A warm, independent hotel in Kapenguria, West Pokot — built for people who travel with purpose.',
    sw: 'Hoteli huru yenye ukarimu huko Kapenguria, West Pokot — iliyoundwa kwa ajili ya wanaosafiri kwa madhumuni.',
  },
  'footer.explore': { en: 'Explore', sw: 'Gundua' },
  'footer.facilities': { en: 'Facilities', sw: 'Huduma' },
  'footer.contact': { en: 'Contact', sw: 'Mawasiliano' },
  'footer.hours': { en: 'Opening hours', sw: 'Saa za kufungua' },
  'footer.hoursValue': { en: 'Front desk open 24 hours', sw: 'Dawati la mapokezi liko wazi saa 24' },
  'footer.rights': { en: 'All rights reserved.', sw: 'Haki zote zimehifadhiwa.' },
  'footer.privacy': { en: 'Privacy', sw: 'Faragha' },
  'footer.terms': { en: 'Terms', sw: 'Masharti' },
  'footer.staff': { en: 'Staff login', sw: 'Kuingia kwa wafanyakazi' },
  'footer.newsletter': { en: 'Join our monthly note', sw: 'Jiunge na barua yetu ya mwezi' },
  'footer.address': { en: '12 Jacaranda Lane, Kapenguria, West Pokot', sw: '12 Jacaranda Lane, Kapenguria, West Pokot' },
  'footer.phone': { en: '+254 20 765 4321', sw: '+254 20 765 4321' },
  'footer.email': { en: 'stay@westsidehotel.co.ke', sw: 'stay@westsidehotel.co.ke' },
  'footer.whatsapp': { en: 'WhatsApp: +254 712 345 678', sw: 'WhatsApp: +254 712 345 678' },
  'footer.map': { en: 'View on map', sw: 'Tazama kwenye ramani' },
  'footer.social': { en: 'Follow Westside', sw: 'Mfuate Westside' },

  'whatsapp.label': { en: 'Chat with Westside on WhatsApp', sw: 'Zungumza na Westside kwenye WhatsApp' },
  'whatsapp.message': {
    en: 'Hello Westside Hotel, I would like to ask about a stay.',
    sw: 'Habari Westside Hotel, ningependa kuuliza kuhusu kukaa.',
  },

  'booking.checkin': { en: 'Check-in', sw: 'Kuingia' },
  'booking.checkout': { en: 'Check-out', sw: 'Kutoka' },
  'booking.guests': { en: 'Guests', sw: 'Wageni' },
  'booking.search': { en: 'Check availability', sw: 'Angalia nafasi' },
  'booking.guest1': { en: '1 guest', sw: 'Mgeni 1' },
  'booking.guest2': { en: '2 guests', sw: 'Wageni 2' },
  'booking.guest3': { en: '3 guests', sw: 'Wageni 3' },
  'booking.guest4': { en: '4 guests', sw: 'Wageni 4' },
  'booking.rooms': { en: 'Rooms', sw: 'Vyumba' },
  'booking.room1': { en: '1 room', sw: 'Chumba 1' },
  'booking.bestRate': { en: 'Best rate guaranteed', sw: 'Bei bora imehakikishiwa' },
  'booking.freeCancelShort': { en: 'Free cancellation up to 48 hours', sw: 'Kughairi bila malipo hadi saa 48' },

  'home.hero.eyebrow': { en: 'Kapenguria, West Pokot · Since 2014', sw: 'Kapenguria, West Pokot · Tangu 2014' },
  'home.hero.title': { en: 'A warm welcome in the heart of Kapenguria.', sw: 'Karibu sana katikati ya Kapenguria.' },
  'home.hero.text': {
    en: 'Quiet rooms, honest food and a team that knows your name. Westside is a calm base for NGO teams, business travellers and neighbours from across West Pokot.',
    sw: 'Vyumba vya utulivu, chakula cha kweli na timu inayojua jina lako. Westside ni kituo tulivu kwa timu za NGO, wasafiri wa biashara na majirani kote West Pokot.',
  },
  'home.hero.rating': { en: '4.8 out of 5', sw: '4.8 kati ya 5' },
  'home.hero.ratingLabel': { en: '386 Google reviews', sw: 'Maoni 386 ya Google' },
  'home.hero.frontDesk': { en: '24/7 front desk', sw: 'Mapokezi saa 24' },
  'home.hero.parking': { en: 'Secure parking', sw: 'Maegesho salama' },
  'home.hero.imageAlt': {
    en: 'Warm evening light over the pool terrace at Westside Hotel in Kapenguria',
    sw: 'Mwangaza wa jioni kwenye eneo la bwawa la Westside Hotel Kapenguria',
  },

  'home.why.eyebrow': { en: 'Why book direct', sw: 'Kwa nini weka nafasi moja kwa moja' },
  'home.why.title': { en: 'The best rate, and a real person on the line.', sw: 'Bei bora, na mtu halisi simuoni.' },
  'home.why.text': {
    en: 'Book on our own website and keep the whole stay simple — from the first enquiry to the final receipt.',
    sw: 'Weka nafasi kwenye tovuti yetu na ufanye kukaa kwote kuwa rahisi — kutoka swali la kwanza hadi risiti ya mwisho.',
  },
  'home.why.best.title': { en: 'Best rate, guaranteed', sw: 'Bei bora, imehakikishiwa' },
  'home.why.best.text': {
    en: 'Find your room cheaper elsewhere and we will match it — plus a complimentary welcome drink.',
    sw: 'Ukipata chumba chako kwa bei ndogo mahali pengine, tutalinganisha — pamoja na kinywaji cha kukaribisha bure.',
  },
  'home.why.cancel.title': { en: 'Free cancellation', sw: 'Kughairi bila malipo' },
  'home.why.cancel.text': {
    en: 'Plans change. Cancel up to 48 hours before arrival with no hidden fees.',
    sw: 'Mipango hubadilika. Ghairi hadi saa 48 kabla ya kuwasili bila ada za siri.',
  },
  'home.why.pay.title': { en: 'Pay with M-Pesa or card', sw: 'Lipa kwa M-Pesa au kadi' },
  'home.why.pay.text': {
    en: 'Pay online or settle at the desk. We also accept bank transfers and LPOs.',
    sw: 'Lipa mtandaoni au dawati la mapokezi. Tunapokea pia uhamisho wa benki na LPO.',
  },
  'home.why.note': {
    en: 'Direct guests enjoy a complimentary welcome drink and 10% off dining during their stay.',
    sw: 'Wageni wa moja kwa moja hupata kinywaji cha kukaribisha bure na punguzo la 10% kwenye chakula.',
  },

  'home.rooms.eyebrow': { en: 'Rooms & suites', sw: 'Vyumba na suites' },
  'home.rooms.title': { en: 'A room that works as hard as you do.', sw: 'Chumba kinachofanya kazi kwa bidii kama wewe.' },
  'home.rooms.text': {
    en: 'Fast fibre Wi-Fi, a proper desk and blackout curtains in every room. Choose the space that fits your stay.',
    sw: 'Wi-Fi ya fibre ya haraka, dawati la kufaa na mapazia ya giza kwenye kila chumba. Chagua nafasi inayofaa kukaa kwako.',
  },
  'home.rooms.link': { en: 'View all rooms', sw: 'Tazama vyumba vyote' },
  'room.standard.name': { en: 'Standard Executive', sw: 'Standard Executive' },
  'room.standard.tagline': { en: 'For focused solo stays', sw: 'Kwa kukaa peke yako kwa umakini' },
  'room.standard.description': {
    en: 'A compact, quiet room with a generous work desk, rain shower and reliable 100 Mbps fibre.',
    sw: 'Chumba kidogo chenye utulivu, dawati kubwa la kazi, oga ya mvua na fibre ya 100 Mbps inayotegemewa.',
  },
  'room.standard.bed': { en: 'Queen bed', sw: 'Kitanda cha Queen' },
  'room.deluxe.name': { en: 'Deluxe Garden Suite', sw: 'Deluxe Garden Suite' },
  'room.deluxe.tagline': { en: 'For slower mornings', sw: 'Kwa asubuhi za polepole' },
  'room.deluxe.description': {
    en: 'A calm suite opening onto our courtyard garden, with a king bed and a corner for reading.',
    sw: 'Suite tulivu inayoelekea bustani yetu ya ua, na kitanda cha king na kona ya kusoma.',
  },
  'room.deluxe.bed': { en: 'King bed', sw: 'Kitanda cha King' },
  'room.mara.name': { en: 'Mara Residence', sw: 'Mara Residence' },
  'room.mara.tagline': { en: 'For longer missions', sw: 'Kwa misheni ndefu' },
  'room.mara.description': {
    en: 'A one-bedroom residence with a living area, kitchenette and a four-seat meeting table.',
    sw: 'Makao ya chumba kimoja na sebule, jikoni ndogo na meza ya mkutano ya watu wanne.',
  },
  'room.mara.bed': { en: 'King bed + sofa bed', sw: 'Kitanda cha King + kitanda cha sofa' },
  'room.popular': { en: 'Most popular', sw: 'Maarufu zaidi' },
  'room.garden': { en: 'Garden access', sw: 'Njia ya bustani' },
  'room.longStay': { en: 'Long-stay favourite', sw: 'Chaguo la kukaa kwa muda mrefu' },
  'room.sleeps2': { en: 'Sleeps 2', sw: 'Hulala 2' },
  'room.sleeps3': { en: 'Sleeps 3', sw: 'Hulala 3' },
  'room.sqm': { en: '{count} m²', sw: '{count} m²' },

  'home.facilities.eyebrow': { en: 'Under one roof', sw: 'Chini ya paa moja' },
  'home.facilities.title': { en: 'More than a bed for the night.', sw: 'Zaidi ya kitanda cha usiku mmoja.' },
  'home.facilities.text': {
    en: 'A restaurant, coffee shop, conference hall and gym — all a short walk from your room in Kapenguria.',
    sw: 'Mgahawa, mkahawa, ukumbi wa mikutano na chumba cha mazoezi — vyote umbali mfupi kutoka chumba chako huko Kapenguria.',
  },
  'facility.restaurant.name': { en: 'Tulia Restaurant', sw: 'Mgahawa wa Tulia' },
  'facility.restaurant.description': { en: 'Kenyan classics and wood-fired favourites, open all day.', sw: 'Vyakula vya jadi vya Kenya na vipendwa vya moto, wazi siku nzima.' },
  'facility.restaurant.hours': { en: '6:30am – 10:00pm daily', sw: '6:30am – 10:00pm kila siku' },
  'facility.restaurant.capacity': { en: 'Seats 80 · Open to non-guests', sw: 'Nafasi 80 · Wazi kwa wasio wageni' },
  'facility.coffee.name': { en: 'Jacaranda Café', sw: 'Jacaranda Café' },
  'facility.coffee.description': { en: 'Single-origin Kenyan coffee and a quiet corner to work.', sw: 'Kahawa ya Kenya ya asili moja na kona tulivu ya kufanyia kazi.' },
  'facility.coffee.hours': { en: '6:00am – 9:00pm daily', sw: '6:00am – 9:00pm kila siku' },
  'facility.coffee.capacity': { en: 'Seats 100 · Open to non-guests', sw: 'Nafasi 100 · Wazi kwa wasio wageni' },
  'facility.conference.name': { en: 'Kilele Hall', sw: 'Ukumbi wa Kilele' },
  'facility.conference.description': { en: 'A flexible hall for workshops, board meetings and small conferences.', sw: 'Ukumbi unaobadilika kwa warsha, mikutano ya bodi na makongamano madogo.' },
  'facility.conference.hours': { en: '6:00am – 9:00pm daily', sw: '6:00am – 9:00pm kila siku' },
  'facility.conference.capacity': { en: 'Up to 100 guests · Open to non-guests by booking', sw: 'Hadi wageni 100 · Wazi kwa wasio wageni kwa kuweka nafasi' },
  'facility.gym.name': { en: 'Westside Fitness', sw: 'Westside Fitness' },
  'facility.gym.description': { en: 'Cardio, weights and a trainer who knows your name.', sw: 'Mazoezi ya moyo, uzito na mkufunzi anayejua jina lako.' },
  'facility.gym.hours': { en: '5:00am – 9:00pm daily', sw: '5:00am – 9:00pm kila siku' },
  'facility.gym.capacity': { en: '20 at a time · Open to non-guests with a day pass', sw: 'Watu 20 kwa wakati mmoja · Wazi kwa wasio wageni kwa pasi ya siku' },
  'facility.explore': { en: 'Explore', sw: 'Chunguza' },

  'home.offers.eyebrow': { en: 'Current offers', sw: 'Ofa za sasa' },
  'home.offers.title': { en: 'A little more reason to stay.', sw: 'Sababu zaidi kidogo ya kukaa.' },
  'home.offers.text': {
    en: 'Direct-only rates and seasonal packages for teams, families and neighbours.',
    sw: 'Bei za moja kwa moja na vifurushi vya msimu kwa timu, familia na majirani.',
  },
  'offer.longStay.tag': { en: 'Long stay', sw: 'Kukaa kwa muda mrefu' },
  'offer.longStay.title': { en: 'Stay 4 nights, pay for 3', sw: 'Kaa usiku 4, lipa 3' },
  'offer.longStay.description': { en: 'Settle in for a working week. The fourth night is on us when you book direct.', sw: 'Jipange kwa wiki ya kazi. Usiku wa nne ni zawadi yetu ukiweka nafasi moja kwa moja.' },
  'offer.longStay.price': { en: 'From KES 25,500 for 4 nights', sw: 'Kuanzia KES 25,500 kwa usiku 4' },
  'offer.longStay.cta': { en: 'Book this offer', sw: 'Weka ofa hii' },
  'offer.ngo.tag': { en: 'NGO rate', sw: 'Bei ya NGO' },
  'offer.ngo.title': { en: '15% off for NGO field teams', sw: 'Punguzo la 15% kwa timu za NGO' },
  'offer.ngo.description': { en: 'Show your NGO ID at check-in and save on our Standard Executive rooms.', sw: 'Onyesha kitambulisho cha NGO wakati wa kuingia na uokoe kwenye vyumba vya Standard Executive.' },
  'offer.ngo.price': { en: 'From KES 7,225 per night', sw: 'Kuanzia KES 7,225 kwa usiku' },
  'offer.ngo.cta': { en: 'Book this offer', sw: 'Weka ofa hii' },
  'offer.brunch.tag': { en: 'Dining', sw: 'Chakula' },
  'offer.brunch.title': { en: 'Sunday brunch at Tulia', sw: 'Brunch ya Jumapili huko Tulia' },
  'offer.brunch.description': { en: 'A generous buffet, live omelette station and bottomless Kenyan coffee.', sw: 'Buffet ya kutosha, kituo cha omelette papo hapo na kahawa ya Kenya bila kikomo.' },
  'offer.brunch.price': { en: 'KES 2,500 per person', sw: 'KES 2,500 kwa mtu' },
  'offer.brunch.cta': { en: 'Reserve a table', sw: 'Weka meza' },
  'offer.meetings.tag': { en: 'Meetings', sw: 'Mikutano' },
  'offer.meetings.title': { en: 'Meet, sleep, repeat', sw: 'Kutana, lala, rudia' },
  'offer.meetings.description': { en: 'Book five rooms and receive 10% off Kilele Hall hire for your workshop.', sw: 'Weka vyumba vitano na upate punguzo la 10% kwenye ukumbi wa Kilele kwa warsha yako.' },
  'offer.meetings.price': { en: 'Custom quote', sw: 'Bei maalum' },
  'offer.meetings.cta': { en: 'Request a quote', sw: 'Omba bei' },
  'offers.prev': { en: 'Previous offer', sw: 'Ofa iliyotangulia' },
  'offers.next': { en: 'Next offer', sw: 'Ofa inayofuata' },
  'offers.current': { en: 'Current offers', sw: 'Ofa za sasa' },
  'offers.filterLabel': { en: 'Filter stories', sw: 'Chuja habari' },

  'home.reviews.eyebrow': { en: 'Guest reviews', sw: 'Maoni ya wageni' },
  'home.reviews.title': { en: 'Loved by people who travel for work — and for life.', sw: 'Inapendwa na wanaosafiri kwa kazi — na kwa maisha.' },
  'home.reviews.rating': { en: '4.8', sw: '4.8' },
  'home.reviews.count': { en: '386 Google reviews', sw: 'Maoni 386 ya Google' },
  'home.reviews.link': { en: 'Read on Google', sw: 'Soma kwenye Google' },
  'home.reviews.verified': { en: 'Verified Google review', sw: 'Maoni yaliyothibitishwa ya Google' },
  'review.wanjiku.quote': { en: 'I stayed three nights for a field visit. The Wi-Fi never dropped, the desk was proper, and the team remembered how I take my tea.', sw: 'Nilikaa usiku tatu kwa ziara ya shambani. Wi-Fi haikukatika, dawati lilikuwa la kufaa, na timu ilikumbuka ninywavyo chai.' },
  'review.wanjiku.name': { en: 'Wanjiku M.', sw: 'Wanjiku M.' },
  'review.wanjiku.role': { en: 'NGO programme officer, Kisumu', sw: 'Afisa wa programu ya NGO, Kisumu' },
  'review.daniel.quote': { en: 'Quiet, central and secure. I walked to my meetings in Kapenguria and came back to a genuinely good dinner.', sw: 'Tulivu, katikati na salama. Nilitembea hadi mikutano yangu Kapenguria na nikarudi kwa chakula cha jioni kizuri kweli.' },
  'review.daniel.name': { en: 'Daniel K.', sw: 'Daniel K.' },
  'review.daniel.role': { en: 'Business traveller, Kapenguria', sw: 'Msafiri wa biashara, Kapenguria' },
  'review.amina.quote': { en: 'We booked Kilele Hall for a community workshop. The catering was generous and the staff handled every small request.', sw: 'Tulibook ukumbi wa Kilele kwa warsha ya jamii. Chakula kilikuwa kingi na wafanyakazi walishughulikia kila ombi dogo.' },
  'review.amina.name': { en: 'Amina H.', sw: 'Amina H.' },
  'review.amina.role': { en: 'Local resident & community organiser', sw: 'Mkazi wa eneo na mratibu wa jamii' },

  'newsletter.eyebrow': { en: 'Stay in touch', sw: 'Endelea kuwasiliana' },
  'newsletter.title': { en: 'A quiet note from Kapenguria.', sw: 'Barua fupi kutoka Kapenguria.' },
  'newsletter.text': { en: 'Seasonal offers, new menus and the occasional story from Kapenguria. One email a month, never more.', sw: 'Ofa za msimu, menyu mpya na hadithi za mara kwa mara kutoka Kapenguria. Barua pepe moja kwa mwezi, si zaidi.' },
  'newsletter.placeholder': { en: 'Your email address', sw: 'Barua pepe yako' },
  'newsletter.button': { en: 'Subscribe', sw: 'Jisajili' },
  'newsletter.success': { en: 'Asante! Check your inbox for a welcome note.', sw: 'Asante! Angalia barua pepe yako kwa ujumbe wa kukaribisha.' },
  'newsletter.privacy': { en: 'We keep your details private. Unsubscribe anytime.', sw: 'Tunahifadhi taarifa zako kwa faragha. Unaweza kujiondoa wakati wowote.' },
  'newsletter.emailLabel': { en: 'Email address', sw: 'Barua pepe' },

  'rooms.eyebrow': { en: 'Rooms & suites', sw: 'Vyumba na suites' },
  'rooms.title': { en: 'Choose your kind of calm.', sw: 'Chagua aina yako ya utulivu.' },
  'rooms.list.eyebrow': { en: 'Three ways to stay', sw: 'Njia tatu za kukaa' },
  'rooms.list.title': { en: 'Rest, work, repeat.', sw: 'Pumzika, fanya kazi, rudia.' },
  'rooms.text': {
    en: 'Three room types, one standard: fast Wi-Fi, blackout curtains and a team that answers the phone.',
    sw: 'Aina tatu za vyumba, kiwango kimoja: Wi-Fi ya haraka, mapazia ya giza na timu inayopokea simu.',
  },
  'rooms.note': {
    en: 'All rates include VAT and service charge. Breakfast is available from KES 1,200 per person.',
    sw: 'Bei zote zinajumuisha VAT na ada ya huduma. Kifungua kinywa kinapatikana kuanzia KES 1,200 kwa mtu.',
  },
  'rooms.amenities': { en: 'In the room', sw: 'Ndani ya chumba' },
  'rooms.gallery': { en: 'View gallery', sw: 'Tazama picha' },
  'rooms.galleryLabel': { en: 'Room photo gallery', sw: 'Picha za chumba' },
  'rooms.photoLabel': { en: 'Show photo {index}', sw: 'Onyesha picha {index}' },
  'rooms.freeCancel': { en: 'Free cancellation up to 48 hours before arrival', sw: 'Kughairi bila malipo hadi saa 48 kabla ya kuwasili' },
  'rooms.help.title': { en: 'Not sure which room fits?', sw: 'Hujui chumba kinachofaa?' },
  'rooms.help.text': {
    en: 'Tell us how long you are staying and what you need to get done. We will recommend the right room.',
    sw: 'Tuambie unakaa muda gani na unahitaji kufanya nini. Tutakupendekeza chumba kinachofaa.',
  },
  'rooms.help.cta': { en: 'Talk to reservations', sw: 'Zungumza na mapokezi' },
  'rooms.help.heading': { en: 'Tell us how you travel.', sw: 'Tuambie unasafiri vipi.' },
  'rooms.ask.cta': { en: 'Ask a question', sw: 'Uliza swali' },
  'rooms.wifi.text': { en: '100 Mbps in every room and public space.', sw: '100 Mbps katika kila chumba na eneo la umma.' },
  'rooms.support.title': { en: '24/7 front desk', sw: 'Mapokezi 24/7' },
  'rooms.support.text': { en: 'A real person answers the phone, day or night.', sw: 'Mtu halisi anapokea simu, mchana au usiku.' },
  'amenities.wifi': { en: 'Fibre Wi-Fi', sw: 'Wi-Fi ya fibre' },
  'amenities.desk': { en: 'Work desk', sw: 'Dawati la kazi' },
  'amenities.shower': { en: 'Rain shower', sw: 'Oga ya mvua' },
  'amenities.tv': { en: 'Smart TV', sw: 'TV janja' },
  'amenities.safe': { en: 'In-room safe', sw: 'Sanduku la usalama' },
  'amenities.generator': { en: 'Generator backup', sw: 'Jenereta ya akiba' },
  'amenities.tea': { en: 'Tea & coffee', sw: 'Chai na kahawa' },
  'amenities.housekeeping': { en: 'Daily housekeeping', sw: 'Usafi wa kila siku' },
  'amenities.garden': { en: 'Garden patio', sw: 'Ua wa bustani' },
  'amenities.king': { en: 'King bed', sw: 'Kitanda cha King' },
  'amenities.minibar': { en: 'Minibar', sw: 'Minibar' },
  'amenities.robes': { en: 'Robes & slippers', sw: 'Gauni na viatu vya ndani' },
  'amenities.ac': { en: 'Air conditioning', sw: 'Kiyoyozi' },
  'amenities.coffee': { en: 'Coffee bar', sw: 'Kituo cha kahawa' },
  'amenities.lounge': { en: 'Lounge chair', sw: 'Kiti cha kupumzika' },
  'amenities.living': { en: 'Separate living room', sw: 'Sebule tofauti' },
  'amenities.kitchenette': { en: 'Kitchenette', sw: 'Jikoni ndogo' },
  'amenities.meeting': { en: '4-seat meeting table', sw: 'Meza ya mkutano ya watu 4' },
  'amenities.laundry': { en: 'Laundry service', sw: 'Huduma ya kufulia' },
  'amenities.loungeAccess': { en: 'Lounge access', sw: 'Ufikiaji wa lounge' },
  'amenities.sofa': { en: 'Sofa bed', sw: 'Kitanda cha sofa' },
  'amenities.entrance': { en: 'Private entrance', sw: 'Kiingilio cha faragha' },

  'booking.eyebrow': { en: 'Book direct', sw: 'Weka nafasi moja kwa moja' },
  'booking.title': { en: 'Your stay, step by step.', sw: 'Kukaa kwako, hatua kwa hatua.' },
  'booking.text': {
    en: 'Best rate guaranteed. Free cancellation up to 48 hours before arrival. Pay by M-Pesa, card or bank transfer.',
    sw: 'Bei bora imehakikishiwa. Kughairi bila malipo hadi saa 48 kabla ya kuwasili. Lipa kwa M-Pesa, kadi au uhamisho wa benki.',
  },
  'step.dates': { en: 'Dates', sw: 'Tarehe' },
  'step.room': { en: 'Room', sw: 'Chumba' },
  'step.details': { en: 'Details', sw: 'Taarifa' },
  'step.payment': { en: 'Payment', sw: 'Malipo' },
  'step.confirm': { en: 'Confirmation', sw: 'Uthibitisho' },
  'booking.step1.title': { en: 'When are you travelling?', sw: 'Unasafiri lini?' },
  'booking.step1.text': { en: 'Choose your dates and how many people are coming. You can change them later, subject to availability.', sw: 'Chagua tarehe zako na idadi ya watu wanaokuja. Unaweza kubadilisha baadaye, kulingana na nafasi.' },
  'booking.step1.continue': { en: 'Choose a room', sw: 'Chagua chumba' },
  'booking.step2.title': { en: 'Pick your room and meal plan.', sw: 'Chagua chumba chako na mpango wa chakula.' },
  'booking.step2.text': { en: 'All rooms include fibre Wi-Fi, a work desk and daily housekeeping. Meal supplements are per guest, per night.', sw: 'Vyumba vyote vinajumuisha Wi-Fi ya fibre, dawati la kazi na usafi wa kila siku. Ada za chakula ni kwa mgeni, kwa usiku.' },
  'booking.step2.continue': { en: 'Add guest details', sw: 'Ongeza taarifa za mgeni' },
  'meal.title': { en: 'Meal plan', sw: 'Mpango wa chakula' },
  'meal.roomOnly': { en: 'Room only', sw: 'Chumba tu' },
  'meal.roomOnlyNote': { en: 'No meals included', sw: 'Hakuna chakula kilichojumuishwa' },
  'meal.breakfast': { en: 'Breakfast included', sw: 'Kifungua kinywa kimejumuishwa' },
  'meal.breakfastNote': { en: 'Breakfast for each guest', sw: 'Kifungua kinywa kwa kila mgeni' },
  'meal.halfBoard': { en: 'Half board', sw: 'Nusu bweni' },
  'meal.halfBoardNote': { en: 'Breakfast and dinner', sw: 'Kifungua kinywa na chakula cha jioni' },
  'meal.fullBoard': { en: 'Full board', sw: 'Bweni kamili' },
  'meal.fullBoardNote': { en: 'Breakfast, lunch and dinner', sw: 'Kifungua kinywa, chakula cha mchana na jioni' },
  'meal.perGuestNight': { en: 'per guest / night', sw: 'kwa mgeni / usiku' },
  'meal.included': { en: 'Included', sw: 'Imejumuishwa' },
  'booking.step3.title': { en: 'Who is staying with us?', sw: 'Nani anakaa nasi?' },
  'booking.step3.text': { en: 'We will use these details for your confirmation and to prepare your room.', sw: 'Tutatumia taarifa hizi kwa uthibitisho wako na kuandaa chumba chako.' },
  'booking.step3.continue': { en: 'Continue to payment', sw: 'Endelea kwa malipo' },
  'field.firstName': { en: 'First name', sw: 'Jina la kwanza' },
  'field.lastName': { en: 'Last name', sw: 'Jina la mwisho' },
  'field.email': { en: 'Email address', sw: 'Barua pepe' },
  'field.phone': { en: 'Phone number', sw: 'Namba ya simu' },
  'field.country': { en: 'Country', sw: 'Nchi' },
  'field.arrivalTime': { en: 'Estimated arrival time', sw: 'Muda unaotarajia kuwasili' },
  'field.requests': { en: 'Special requests', sw: 'Maombi maalum' },
  'field.requestsPlaceholder': { en: 'Quiet room, extra pillow, late check-in…', sw: 'Chumba tulivu, mto wa ziada, kuingia kwa kuchelewa…' },
  'field.terms': { en: 'I agree to the booking terms and cancellation policy.', sw: 'Nakubali masharti ya kuweka nafasi na sera ya kughairi.' },
  'field.marketing': { en: 'Send me occasional offers from Westside (optional).', sw: 'Nitumie ofa za mara kwa mara kutoka Westside (si lazima).' },
  'arrival.afternoon': { en: 'Afternoon (12pm – 4pm)', sw: 'Mchana (12pm – 4pm)' },
  'arrival.evening': { en: 'Evening (4pm – 8pm)', sw: 'Jioni (4pm – 8pm)' },
  'arrival.late': { en: 'Late (after 8pm)', sw: 'Usiku (baada ya 8pm)' },
  'arrival.early': { en: 'Morning (before 12pm)', sw: 'Asubuhi (kabla ya 12pm)' },
  'booking.step4.title': { en: 'How would you like to pay?', sw: 'Ungependa kulipa vipi?' },
  'booking.step4.text': { en: 'Choose M-Pesa, card or bank transfer. Your payment details are encrypted and never stored on our servers.', sw: 'Chagua M-Pesa, kadi au uhamisho wa benki. Taarifa zako za malipo zimesimbwa na hazihifadhiwi kwenye seva zetu.' },
  'booking.step4.continue': { en: 'Pay & confirm', sw: 'Lipa na uthibitishe' },
  'booking.purpose.label': { en: 'Purpose of stay', sw: 'Sababu ya kukaa' },
  'booking.purpose.business': { en: 'Business travel', sw: 'Safari ya kazi' },
  'booking.purpose.ngo': { en: 'NGO / mission', sw: 'NGO / misheni' },
  'booking.purpose.leisure': { en: 'Leisure', sw: 'Mapumziko' },
  'booking.purpose.local': { en: 'Local resident', sw: 'Mkazi wa hapa' },
  'payment.method': { en: 'Payment method', sw: 'Njia ya malipo' },
  'payment.mpesa': { en: 'M-Pesa', sw: 'M-Pesa' },
  'payment.mpesaText': { en: 'Enter the phone number registered to M-Pesa. We will send a payment prompt.', sw: 'Weka namba ya simu iliyosajiliwa kwa M-Pesa. Tutatuma ombi la malipo.' },
  'payment.mpesaPhone': { en: 'M-Pesa phone number', sw: 'Namba ya simu ya M-Pesa' },
  'payment.mpesaHint': { en: 'You will receive an STK push from Westside Hotel. Approve it with your PIN.', sw: 'Utapokea ombi la malipo kutoka Westside Hotel. Lidhibitishe kwa PIN yako.' },
  'payment.card': { en: 'Card', sw: 'Kadi' },
  'payment.cardText': { en: 'Visa, Mastercard and American Express are accepted.', sw: 'Visa, Mastercard na American Express zinakubaliwa.' },
  'payment.cardNumber': { en: 'Card number', sw: 'Namba ya kadi' },
  'payment.cardName': { en: 'Name on card', sw: 'Jina kwenye kadi' },
  'payment.cardExpiry': { en: 'Expiry date', sw: 'Tarehe ya mwisho' },
  'payment.cardCvv': { en: 'CVV', sw: 'CVV' },
  'payment.bank': { en: 'Bank transfer', sw: 'Uhamisho wa benki' },
  'payment.bankLabel': { en: 'Bank', sw: 'Benki' },
  'payment.accountName': { en: 'Account name', sw: 'Jina la akaunti' },
  'payment.accountNumber': { en: 'Account number', sw: 'Namba ya akaunti' },
  'payment.bankText': { en: 'We will email our bank details and hold your room for 24 hours.', sw: 'Tutatuma taarifa za benki kwa barua pepe na kuhifadhi chumba chako kwa saa 24.' },
  'payment.bankNote': { en: 'Use your booking reference as the transfer reference. Your reservation is confirmed once funds arrive.', sw: 'Tumia kumbukumbu ya kuweka nafasi kama rejeleo la uhamisho. Nafasi yako inathibitishwa pesa zikifika.' },
  'payment.lpo': { en: 'LPO accepted', sw: 'LPO inakubaliwa' },
  'payment.payNow': { en: 'Pay & confirm booking', sw: 'Lipa na uthibitishe nafasi' },
  'payment.secure': { en: 'Secure booking · No hidden fees', sw: 'Nafasi salama · Hakuna ada za siri' },
  'summary.title': { en: 'Your stay', sw: 'Kukaa kwako' },
  'summary.room': { en: 'Room', sw: 'Chumba' },
  'summary.meal': { en: 'Meal plan', sw: 'Mpango wa chakula' },
  'summary.nights': { en: 'Nights', sw: 'Usiku' },
  'summary.roomTotal': { en: 'Room total', sw: 'Jumla ya chumba' },
  'summary.mealTotal': { en: 'Meals', sw: 'Chakula' },
  'summary.taxes': { en: 'VAT & service charge', sw: 'VAT na ada ya huduma' },
  'summary.included': { en: 'Included', sw: 'Imejumuishwa' },
  'summary.total': { en: 'Total', sw: 'Jumla' },
  'summary.deposit': { en: 'Payable today', sw: 'Inayolipwa leo' },
  'summary.freeCancel': { en: 'Free cancellation until 48 hours before check-in', sw: 'Kughairi bila malipo hadi saa 48 kabla ya kuingia' },
  'summary.help': { en: 'Need help? Call the front desk on +254 20 765 4321.', sw: 'Unahitaji msaada? Piga mapokezi kwa +254 20 765 4321.' },
  'summary.details': { en: 'Price details', sw: 'Maelezo ya bei' },
  'summary.hide': { en: 'Hide details', sw: 'Ficha maelezo' },
  'booking.step5.title': { en: 'You are booked.', sw: 'Umeweka nafasi.' },
  'booking.step5.text': { en: 'A confirmation email is on its way. We will see you in Kapenguria.', sw: 'Barua pepe ya uthibitisho inakuja. Tutakuona Kapenguria.' },
  'confirmation.reference': { en: 'Booking reference', sw: 'Kumbukumbu ya nafasi' },
  'confirmation.emailSent': { en: 'Confirmation sent to', sw: 'Uthibitisho umetumwa kwa' },
  'confirmation.arrival': { en: 'Arrival', sw: 'Kuwasili' },
  'confirmation.departure': { en: 'Departure', sw: 'Kuondoka' },
  'confirmation.addCalendar': { en: 'Add to calendar', sw: 'Ongeza kwenye kalenda' },
  'confirmation.backHome': { en: 'Back to home', sw: 'Rudi nyumbani' },
  'confirmation.whatsapp': { en: 'Message the front desk', sw: 'Tuma ujumbe kwa mapokezi' },
  'confirmation.change': { en: 'Need to change something? Call us on +254 20 765 4321.', sw: 'Unahitaji kubadilisha kitu? Tupigie +254 20 765 4321.' },
  'confirmation.paid': { en: 'Payment received', sw: 'Malipo yamepokelewa' },
  'confirmation.pending': { en: 'Payment instructions sent by email', sw: 'Maelekezo ya malipo yametumwa kwa barua pepe' },
  'validation.dates': { en: 'Check-out must be after check-in.', sw: 'Kutoka lazima iwe baada ya kuingia.' },
  'validation.email': { en: 'Enter a valid email address.', sw: 'Weka barua pepe sahihi.' },
  'validation.phone': { en: 'Enter a valid phone number.', sw: 'Weka namba sahihi ya simu.' },
  'validation.terms': { en: 'Please accept the booking terms.', sw: 'Tafadhali kubali masharti ya kuweka nafasi.' },
  'validation.payment': { en: 'Choose a payment method.', sw: 'Chagua njia ya malipo.' },
  'validation.card': { en: 'Enter your card details.', sw: 'Weka taarifa za kadi yako.' },
  'validation.mpesa': { en: 'Enter the M-Pesa phone number.', sw: 'Weka namba ya simu ya M-Pesa.' },
  'validation.guestName': { en: 'Enter the guest name.', sw: 'Weka jina la mgeni.' },
  'toast.booking': { en: 'Payment received. Your room is confirmed.', sw: 'Malipo yamepokelewa. Chumba chako kimethibitishwa.' },
  'toast.newsletter': { en: 'You are on the list. Asante!', sw: 'Uko kwenye orodha. Asante!' },
  'toast.formSent': { en: 'Message sent. We will reply within one working day.', sw: 'Ujumbe umetumwa. Tutajibu ndani ya siku moja ya kazi.' },
  'toast.tableBooked': { en: 'Table request received. We will confirm by SMS shortly.', sw: 'Ombi la meza limepokelewa. Tutathibitisha kwa SMS hivi karibuni.' },

  'facilities.title': { en: 'Four good reasons to stay in.', sw: 'Sababu nne nzuri za kukaa ndani.' },
  'facilities.text': {
    en: 'Eat well, meet well and move well — without leaving Kapenguria. Our restaurant, café, conference hall and gym are open to hotel guests and Kapenguria residents alike.',
    sw: 'Kula vizuri, kutana vizuri na kufanya mazoezi — bila kuondoka Kapenguria. Mgahawa wetu, mkahawa, ukumbi wa mikutano na mazoezi ni wazi kwa wageni wa hoteli na wakazi wa Kapenguria.',
  },
  'facilities.openAll': { en: 'Open to everyone', sw: 'Wazi kwa kila mtu' },
  'facilities.viewMenu': { en: 'View menu', sw: 'Tazama menyu' },
  'facilities.checkHall': { en: 'Check hall availability', sw: 'Angalia nafasi ya ukumbi' },
  'facilities.buyPass': { en: 'Buy a day pass', sw: 'Nunua pasi ya siku' },
  'facilities.membership': { en: 'Membership', sw: 'Uanachama' },
  'facilities.upTo100': { en: 'Up to 100 guests', sw: 'Hadi wageni 100' },
  'facilities.dayPassFrom': { en: 'Day pass from KES 1,000', sw: 'Pasi ya siku kuanzia KES 1,000' },
  'facilities.dining.eyebrow': { en: 'All-day dining', sw: 'Chakula cha mchana na jioni' },
  'facilities.coffee.eyebrow': { en: 'Coffee & light bites', sw: 'Kahawa na vitafunio' },
  'facilities.conference.eyebrow': { en: 'Meetings & events', sw: 'Mikutano na hafla' },
  'facilities.gym.eyebrow': { en: 'Fitness', sw: 'Mazoezi' },
  'facilities.extra.eyebrow': { en: 'The useful things', sw: 'Mambo ya muhimu' },
  'facilities.extra.title': { en: 'Small details, taken care of.', sw: 'Maelezo madogo, yametunzwa.' },
  'facilities.extra.text': {
    en: 'The things that make a working trip easier — and a weekend feel effortless.',
    sw: 'Mambo yanayorahisisha safari ya kazi — na kufanya wikendi iwe rahisi.',
  },
  'facilities.generator': { en: '24/7 generator backup', sw: 'Jenereta ya akiba saa 24' },
  'facilities.generator.text': { en: 'Work through a power cut without missing a beat.', sw: 'Fanya kazi hata umeme ukikatika bila kuacha.' },
  'facilities.parking': { en: 'Secure parking', sw: 'Maegesho salama' },
  'facilities.parking.text': { en: 'Gated parking with 24-hour security.', sw: 'Maegesho yenye lango na ulinzi wa saa 24.' },
  'facilities.accessible': { en: 'Accessible spaces', sw: 'Nafasi zinazofikika' },
  'facilities.accessible.text': { en: 'Step-free access, lifts and accessible rooms.', sw: 'Ufikiaji bila ngazi, lifti na vyumba vinavyofikika.' },
  'facilities.welcome.eyebrow': { en: 'Kapenguria, you are welcome', sw: 'Kapenguria, ukaribishwa' },
  'facilities.welcome.title': { en: 'Not staying with us? Come by anyway.', sw: 'Hukai nasi? Karibu hata hivyo.' },
  'facilities.welcome.text': {
    en: 'Local residents can book a table, hire the hall or buy a gym day pass without booking a room.',
    sw: 'Wakazi wa eneo wanaweza kuweka meza, kukodi ukumbi au kununua pasi ya mazoezi bila kuweka chumba.',
  },

  'dining.eyebrow': { en: 'Dining at Westside', sw: 'Chakula Westside' },
  'dining.chooseRoom': { en: 'Choose a dining room', sw: 'Chagua chumba cha kulia' },
  'dining.title': { en: 'A table for every kind of day.', sw: 'Meza kwa kila aina ya siku.' },
  'dining.text': {
    en: 'Breakfast meetings, long lunches and slow Sunday brunches — in the heart of Kapenguria. Both rooms are open to hotel guests and Kapenguria residents.',
    sw: 'Mikutano ya kifungua kinywa, chakula cha mchana cha muda mrefu na brunch za Jumapili — katikati ya Kapenguria. Vyumba vyote viwili ni wazi kwa wageni wa hoteli na wakazi wa Kapenguria.',
  },
  'dining.breakfast': { en: 'Breakfast from 6:30am', sw: 'Kifungua kinywa kuanzia 6:30am' },
  'dining.walkins': { en: 'Walk-ins welcome', sw: 'Karibu bila miadi' },
  'dining.menu': { en: 'Menu preview', sw: 'Muhtasari wa menyu' },
  'dining.menuNote': { en: 'A taste of the full menu', sw: 'Ladha ya menyu kamili' },
  'dining.vegetarian': { en: 'Vegetarian and vegan options available.', sw: 'Chaguo za mboga na vegan zinapatikana.' },
  'dining.workFriendly': { en: 'Laptop-friendly, with fast Wi-Fi and plug points.', sw: 'Rafiki wa kompyuta, na Wi-Fi ya haraka na soketi.' },
  'dining.bookEyebrow': { en: 'Reservations', sw: 'Nafasi za meza' },
  'dining.bookTitle': { en: 'Reserve your table', sw: 'Weka meza yako' },
  'dining.bookText': { en: 'Tell us when you are coming and we will hold the table for 15 minutes.', sw: 'Tuambie utakapokuja na tutahifadhi meza kwa dakika 15.' },
  'dining.date': { en: 'Date', sw: 'Tarehe' },
  'dining.party': { en: 'Party size', sw: 'Idadi ya watu' },
  'dining.time': { en: 'Time', sw: 'Muda' },
  'dining.name': { en: 'Full name', sw: 'Jina kamili' },
  'dining.phone': { en: 'Phone number', sw: 'Namba ya simu' },
  'dining.email': { en: 'Email (optional)', sw: 'Barua pepe (si lazima)' },
  'dining.occasion': { en: 'Occasion', sw: 'Tukio' },
  'dining.notes': { en: 'Anything we should know?', sw: 'Kuna jambo lolote tunapaswa kujua?' },
  'dining.notesPlaceholder': { en: 'High chair, quiet corner, dietary needs…', sw: 'Kiti cha mtoto, kona tulivu, mahitaji ya chakula…' },
  'dining.submit': { en: 'Request table', sw: 'Omba meza' },
  'dining.sms': { en: 'We confirm by SMS within 10 minutes during opening hours.', sw: 'Tunathibitisha kwa SMS ndani ya dakika 10 wakati wa kufungua.' },
  'dining.successTitle': { en: 'Your table request is in.', sw: 'Ombi lako la meza limepokelewa.' },
  'dining.successText': {
    en: 'We will send an SMS confirmation shortly. If you are running late, call us on +254 20 765 4321.',
    sw: 'Tutatuma uthibitisho wa SMS hivi karibuni. Ukichelewa, tupigie +254 20 765 4321.',
  },
  'dining.reference': { en: 'Reference', sw: 'Kumbukumbu' },
  'dining.another': { en: 'Book another table', sw: 'Weka meza nyingine' },
  'occasion.meal': { en: 'Just a meal', sw: 'Chakula tu' },
  'occasion.birthday': { en: 'Birthday', sw: 'Siku ya kuzaliwa' },
  'occasion.anniversary': { en: 'Anniversary', sw: 'Kumbukumbu ya ndoa' },
  'occasion.business': { en: 'Business', sw: 'Biashara' },
  'occasion.family': { en: 'Family gathering', sw: 'Mkutano wa familia' },

  'menu.nyama.name': { en: 'Nyama choma platter', sw: 'Sahani ya nyama choma' },
  'menu.nyama.desc': { en: 'Charcoal-grilled beef and goat with kachumbari.', sw: 'Nyama ya ng ombe na mbuzi iliyochomwa kwa mkaa pamoja na kachumbari.' },
  'menu.tilapia.name': { en: 'Whole tilapia', sw: 'Tilapia mzima' },
  'menu.tilapia.desc': { en: 'From Lake Victoria, grilled with lemon and herbs.', sw: 'Kutoka Ziwa Victoria, imechomwa na limau na mitishamba.' },
  'menu.biryani.name': { en: 'Chicken biryani', sw: 'Biryani ya kuku' },
  'menu.biryani.desc': { en: 'Slow-cooked with cardamom and fried onions.', sw: 'Iliyopikwa polepole na iliki na vitunguu vya kukaanga.' },
  'menu.sukuma.name': { en: 'Sukuma wiki & ugali', sw: 'Sukuma wiki na ugali' },
  'menu.sukuma.desc': { en: 'Greens, maize meal and a little chilli.', sw: 'Mboga za sukuma, ugali na pilipili kidogo.' },
  'menu.chapati.name': { en: 'Chapati beef stew', sw: 'Mchuzi wa ng ombe na chapati' },
  'menu.chapati.desc': { en: 'Slow-braised beef with soft chapati.', sw: 'Nyama ya ng ombe iliyopikwa polepole na chapati laini.' },
  'menu.pourover.name': { en: 'Kenyan AA pour-over', sw: 'Kahawa ya Kenya AA' },
  'menu.pourover.desc': { en: 'Single-origin, brewed to order.', sw: 'Kahawa ya asili moja, inapikwa papo hapo.' },
  'menu.chai.name': { en: 'Masala chai', sw: 'Chai ya masala' },
  'menu.chai.desc': { en: 'Spiced tea with milk.', sw: 'Chai ya viungo na maziwa.' },
  'menu.avocado.name': { en: 'Avocado toast with ndengu', sw: 'Tosti ya parachichi na ndengu' },
  'menu.avocado.desc': { en: 'Sourdough, smashed avocado and green grams.', sw: 'Mkate wa sourdough, parachichi na ndengu.' },
  'menu.mandazi.name': { en: 'Mandazi & honey', sw: 'Mandazi na asali' },
  'menu.mandazi.desc': { en: 'Warm coconut mandazi with wild honey.', sw: 'Mandazi ya nazi ya moto na asali.' },
  'menu.samosa.name': { en: 'Beef samosa', sw: 'Samosa ya nyama' },
  'menu.samosa.desc': { en: 'Crisp pastry, spiced beef and tamarind.', sw: 'Keki ya samosa, nyama ya viungo na tamarind.' },

  'conference.eyebrow': { en: 'Meetings & events', sw: 'Mikutano na hafla' },
  'conference.bookingType': { en: 'Booking type', sw: 'Aina ya kuweka nafasi' },
  'conference.title': { en: 'A room that adapts to your agenda.', sw: 'Chumba kinachobadilika kulingana na ajenda yako.' },
  'conference.text': {
    en: 'Kilele Hall is a flexible, light-filled space for 8 to 100 guests — five minutes from Kapenguria town centre, with everything you need under one roof.',
    sw: 'Ukumbi wa Kilele ni nafasi inayobadilika, iliyojaa mwanga kwa wageni 8 hadi 100 — dakika tano kutoka katikati ya mji wa Kapenguria, na kila kitu unachohitaji chini ya paa moja.',
  },
  'conference.cta': { en: 'Check availability', sw: 'Angalia nafasi' },
  'conference.statGuests': { en: 'Theatre guests', sw: 'Wageni wa theatre' },
  'conference.statSize': { en: 'Floor space', sw: 'Eneo la sakafu' },
  'conference.statWifi': { en: 'Mbps Wi-Fi', sw: 'Mbps Wi-Fi' },
  'conference.statPower': { en: 'Power backup', sw: 'Umeme wa akiba' },
  'conference.layouts.eyebrow': { en: 'Room layouts', sw: 'Mipangilio ya chumba' },
  'conference.layouts.title': { en: 'Set up for the way you meet.', sw: 'Imepangwa kwa jinsi unavyokutana.' },
  'conference.layouts.text': {
    en: 'We will arrange the room before you arrive. Tell us the format and we will set the chairs, tables and screen to match.',
    sw: 'Tutapanga chumba kabla ya kuwasili. Tuambie muundo na tutaweka viti, meza na skrini kulingana na hilo.',
  },
  'layout.theatre': { en: 'Theatre', sw: 'Theatre' },
  'layout.theatre.cap': { en: 'Up to 100 guests', sw: 'Hadi wageni 100' },
  'layout.theatre.desc': { en: 'Rows of chairs facing the screen — best for presentations.', sw: 'Mistari ya viti inayoelekea skrini — bora kwa mawasilisho.' },
  'layout.boardroom': { en: 'Boardroom', sw: 'Chumba cha bodi' },
  'layout.boardroom.cap': { en: 'Up to 24 guests', sw: 'Hadi wageni 24' },
  'layout.boardroom.desc': { en: 'One table, every voice heard — best for decisions.', sw: 'Meza moja, kila sauti inasikika — bora kwa maamuzi.' },
  'layout.ushape': { en: 'U-shape', sw: 'Umbo la U' },
  'layout.ushape.cap': { en: 'Up to 30 guests', sw: 'Hadi wageni 30' },
  'layout.ushape.desc': { en: 'Open centre for discussion — best for workshops.', sw: 'Katikati wazi kwa majadiliano — bora kwa warsha.' },
  'layout.classroom': { en: 'Classroom', sw: 'Darasa' },
  'layout.classroom.cap': { en: 'Up to 60 guests', sw: 'Hadi wageni 60' },
  'layout.classroom.desc': { en: 'Tables in rows — best for training with notes.', sw: 'Meza kwa mistari — bora kwa mafunzo na maelezo.' },
  'conference.included.eyebrow': { en: 'Included as standard', sw: 'Imejumuishwa kwa kawaida' },
  'conference.included.title': { en: 'The practical things, already in the room.', sw: 'Mambo ya vitendo, tayari ndani ya chumba.' },
  'conference.equipment.projector': { en: 'Projector & 2m screen', sw: 'Projekta na skrini ya 2m' },
  'conference.equipment.projectorNote': { en: 'HDMI and USB-C ready.', sw: 'Tayari kwa HDMI na USB-C.' },
  'conference.equipment.sound': { en: 'Sound & microphones', sw: 'Sauti na maikrofoni' },
  'conference.equipment.soundNote': { en: 'Two handheld mics and a lapel mic.', sw: 'Maikrofoni mbili za mkono na moja ya lapel.' },
  'conference.equipment.wifi': { en: 'Fibre Wi-Fi', sw: 'Wi-Fi ya fibre' },
  'conference.equipment.wifiNote': { en: '100 Mbps, no guest limit.', sw: '100 Mbps, bila kikomo cha wageni.' },
  'conference.equipment.flipchart': { en: 'Flipchart & markers', sw: 'Flipchart na kalamu' },
  'conference.equipment.flipchartNote': { en: 'Two easels, paper and pens.', sw: 'Easel mbili, karatasi na kalamu.' },
  'conference.equipment.water': { en: 'Water & mints', sw: 'Maji na peremende' },
  'conference.equipment.waterNote': { en: 'Refilled through the day.', sw: 'Hujazwa tena mchana wote.' },
  'conference.equipment.host': { en: 'On-site host', sw: 'Mkaribishaji wa eneo' },
  'conference.equipment.hostNote': { en: 'A staff member on call all day.', sw: 'Mfanyakazi anayepatikana siku nzima.' },
  'conference.catering.eyebrow': { en: 'Catering', sw: 'Chakula' },
  'conference.catering.title': { en: 'Fuel the room.', sw: 'Weka nishati chumbani.' },
  'conference.catering.text': { en: 'Simple, generous food from Tulia Restaurant — served on time and cleared quietly.', sw: 'Chakula rahisi na kingi kutoka Mgahawa wa Tulia — kinatumwa kwa wakati na kusafishwa kwa utulivu.' },
  'catering.tea': { en: 'Tea & coffee break', sw: 'Pumziko la chai na kahawa' },
  'catering.teaDesc': { en: 'Two teas, coffee, mandazi and fruit.', sw: 'Chai mbili, kahawa, mandazi na matunda.' },
  'catering.lunch': { en: 'Working lunch', sw: 'Chakula cha mchana cha kazi' },
  'catering.lunchDesc': { en: 'Buffet with two mains, salads and dessert.', sw: 'Buffet na vyakula viwili vikuu, saladi na dessert.' },
  'catering.full': { en: 'Full-day package', sw: 'Kifurushi cha siku nzima' },
  'catering.fullDesc': { en: 'Morning tea, lunch and afternoon tea.', sw: 'Chai ya asubuhi, chakula cha mchana na chai ya jioni.' },
  'catering.note': { en: 'Prices per person. Vegetarian, vegan and halal options available — tell us about allergies.', sw: 'Bei kwa mtu. Chaguo za mboga, vegan na halal zinapatikana — tuambie kuhusu mzio.' },
  'conference.book.eyebrow': { en: 'Book the hall', sw: 'Weka ukumbi' },
  'conference.book.title': { en: 'Check your date.', sw: 'Angalia tarehe yako.' },
  'conference.book.text': { en: 'Pick a date to see availability. Book instantly for simple meetings, or ask for a written quote for larger events.', sw: 'Chagua tarehe kuona nafasi. Weka nafasi papo hapo kwa mikutano rahisi, au omba bei kwa maandishi kwa hafla kubwa.' },
  'conference.calendar': { en: 'Next 10 days', sw: 'Siku 10 zijazo' },
  'conference.calendarNote': { en: 'Availability is indicative. We confirm every request within two working hours.', sw: 'Nafasi ni dalili. Tunathibitisha kila ombi ndani ya saa mbili za kazi.' },
  'availability.available': { en: 'Available', sw: 'Inapatikana' },
  'availability.limited': { en: 'Few slots', sw: 'Nafasi chache' },
  'availability.full': { en: 'Full', sw: 'Imejaa' },
  'conference.help': { en: 'Prefer to talk it through? Call +254 20 765 4321.', sw: 'Unapendelea kuzungumza? Piga +254 20 765 4321.' },
  'conference.tabInstant': { en: 'Instant booking', sw: 'Weka nafasi papo hapo' },
  'conference.tabQuote': { en: 'Request a quote', sw: 'Omba bei' },
  'conference.date': { en: 'Event date', sw: 'Tarehe ya hafla' },
  'conference.session': { en: 'Session', sw: 'Kipindi' },
  'conference.layout': { en: 'Room layout', sw: 'Mpangilio wa chumba' },
  'conference.guests': { en: 'Guests', sw: 'Wageni' },
  'conference.name': { en: 'Contact name', sw: 'Jina la mhusika' },
  'conference.company': { en: 'Organisation (optional)', sw: 'Taasisi (si lazima)' },
  'conference.email': { en: 'Email', sw: 'Barua pepe' },
  'conference.phone': { en: 'Phone', sw: 'Simu' },
  'conference.quoteLabel': { en: 'Tell us about your event', sw: 'Tuambie kuhusu hafla yako' },
  'conference.quotePlaceholder': { en: 'Purpose, agenda, catering, accessibility needs…', sw: 'Madhumuni, ajenda, chakula, mahitaji ya ufikiaji…' },
  'conference.instantSubmit': { en: 'Book the hall', sw: 'Weka ukumbi' },
  'conference.quoteSubmit': { en: 'Request a quote', sw: 'Omba bei' },
  'conference.instantNote': { en: 'No payment now. We confirm within two working hours.', sw: 'Hakuna malipo sasa. Tunathibitisha ndani ya saa mbili za kazi.' },
  'conference.quoteNote': { en: 'We reply with a written quote within one working day.', sw: 'Tunajibu na bei ya maandishi ndani ya siku moja ya kazi.' },
  'conference.successTitle': { en: 'Your request is in.', sw: 'Ombi lako limepokelewa.' },
  'conference.successText': { en: 'A member of the events team will confirm by email and phone within two working hours.', sw: 'Mwanachama wa timu ya hafla atathibitisha kwa barua pepe na simu ndani ya saa mbili za kazi.' },
  'conference.another': { en: 'Make another request', sw: 'Fanya ombi lingine' },
  'session.morning': { en: 'Morning (8am – 12pm)', sw: 'Asubuhi (8am – 12pm)' },
  'session.afternoon': { en: 'Afternoon (1pm – 5pm)', sw: 'Mchana (1pm – 5pm)' },
  'session.full': { en: 'Full day (8am – 5pm)', sw: 'Siku nzima (8am – 5pm)' },

  'gym.eyebrow': { en: 'Westside Fitness', sw: 'Westside Fitness' },
  'gym.title': { en: 'Small gym. Serious habits.', sw: 'Mazoezi madogo. Tabia kubwa.' },
  'gym.text': {
    en: 'A calm, well-equipped space for hotel guests and Kapenguria residents — open early, open late, with a trainer who knows your name.',
    sw: 'Nafasi tulivu na yenye vifaa kwa wageni wa hoteli na wakazi wa Kapenguria — hufungua mapema, hufunga jioni, na mkufunzi anayejua jina lako.',
  },
  'gym.bookDayPass': { en: 'Book a day pass', sw: 'Weka pasi ya siku' },
  'gym.viewMembership': { en: 'View membership', sw: 'Tazama uanachama' },
  'gym.openEarly': { en: 'Open from 5:00am', sw: 'Hufungua kuanzia 5:00am' },
  'gym.showers': { en: 'Showers & towels', sw: 'Maji ya kuoga na taulo' },
  'gym.dayFrom': { en: 'Day pass from KES 1,000', sw: 'Pasi ya siku kuanzia KES 1,000' },
  'gym.equipment.cardio': { en: 'Cardio', sw: 'Mazoezi ya moyo' },
  'gym.equipment.cardioText': { en: 'Treadmills, rower and bikes.', sw: 'Treadmill, rower na baiskeli.' },
  'gym.equipment.strength': { en: 'Strength', sw: 'Nguvu' },
  'gym.equipment.strengthText': { en: 'Rack, benches and dumbbells to 40kg.', sw: 'Rack, benches na dumbbells hadi 40kg.' },
  'gym.equipment.functional': { en: 'Functional', sw: 'Mazoezi ya utendaji' },
  'gym.equipment.functionalText': { en: 'Kettlebells, ropes and mats.', sw: 'Kettlebells, kamba na mikeka.' },
  'gym.equipment.changing': { en: 'Changing rooms', sw: 'Vyumba vya kubadilisha' },
  'gym.equipment.changingText': { en: 'Showers, lockers and fresh towels.', sw: 'Maji ya kuoga, makabati na taulo safi.' },
  'gym.pricing.eyebrow': { en: 'Membership', sw: 'Uanachama' },
  'gym.pricing.title': { en: 'Pay as you go, or settle in.', sw: 'Lipa kila unapokuja, au kaa kwa muda.' },
  'gym.pricing.text': { en: 'Every pass includes the full gym, changing rooms and a towel. No joining fee, no long contract.', sw: 'Kila pasi inajumuisha mazoezi yote, vyumba vya kubadilisha na taulo. Hakuna ada ya kujiunga, hakuna mkataba mrefu.' },
  'plan.day': { en: 'Day pass', sw: 'Pasi ya siku' },
  'plan.day.period': { en: 'per visit', sw: 'kwa ziara' },
  'plan.day.desc': { en: 'Full access for one day, including towel and locker.', sw: 'Ufikiaji kamili kwa siku moja, pamoja na taulo na kabati.' },
  'plan.monthly': { en: 'Monthly', sw: 'Kila mwezi' },
  'plan.monthly.period': { en: 'per month', sw: 'kwa mwezi' },
  'plan.monthly.desc': { en: 'Unlimited visits, group classes and one guest pass a month.', sw: 'Ziara bila kikomo, madarasa ya kikundi na pasi moja ya mgeni kwa mwezi.' },
  'plan.quarterly': { en: 'Quarterly', sw: 'Kila robo mwaka' },
  'plan.quarterly.period': { en: 'per 3 months', sw: 'kwa miezi 3' },
  'plan.quarterly.desc': { en: 'Everything in monthly, with two weeks free.', sw: 'Kila kitu cha kila mwezi, na wiki mbili bure.' },
  'plan.annual': { en: 'Annual', sw: 'Kila mwaka' },
  'plan.annual.period': { en: 'per year', sw: 'kwa mwaka' },
  'plan.annual.desc': { en: 'Two months free, plus priority class booking.', sw: 'Miezi miwili bure, pamoja na kipaumbele cha madarasa.' },
  'plan.popular': { en: 'Most popular', sw: 'Maarufu zaidi' },
  'plan.choose': { en: 'Choose plan', sw: 'Chagua mpango' },
  'plan.include.access': { en: 'Full gym access', sw: 'Ufikiaji kamili wa mazoezi' },
  'plan.include.locker': { en: 'Locker and towel', sw: 'Kabati na taulo' },
  'plan.include.orientation': { en: 'Trainer orientation', sw: 'Maelekezo ya mkufunzi' },
  'plan.include.unlimited': { en: 'Unlimited gym access', sw: 'Ufikiaji wa mazoezi bila kikomo' },
  'plan.include.classes': { en: 'All group classes', sw: 'Madarasa yote ya kikundi' },
  'plan.include.guest': { en: 'One guest pass a month', sw: 'Pasi moja ya mgeni kwa mwezi' },
  'plan.include.programme': { en: 'Personal programme review', sw: 'Tathmini ya mpango wa kibinafsi' },
  'plan.include.priority': { en: 'Priority class booking', sw: 'Kipaumbele cha kuweka madarasa' },
  'gym.joinMonthly': { en: 'Join monthly', sw: 'Jiunge kila mwezi' },
  'gym.corporate': { en: 'Corporate rates for teams of five or more — ask the front desk.', sw: 'Bei za kampuni kwa timu za watu watano au zaidi — uliza mapokezi.' },
  'gym.hours.eyebrow': { en: 'Opening hours', sw: 'Saa za kufungua' },
  'gym.hours.title': { en: 'Early starts, late finishes.', sw: 'Kuanza mapema, kumaliza jioni.' },
  'gym.hours.daily': { en: 'Daily', sw: 'Kila siku' },
  'gym.hours.note': { en: 'Last entry is 30 minutes before closing. Hotel guests under 16 must be accompanied by an adult.', sw: 'Kuingia kwa mwisho ni dakika 30 kabla ya kufunga. Wageni wa hoteli chini ya miaka 16 lazima wawe na mtu mzima.' },
  'gym.classes.eyebrow': { en: 'Group classes', sw: 'Madarasa ya kikundi' },
  'gym.classes.title': { en: 'Move together.', sw: 'Fanya mazoezi pamoja.' },
  'gym.classes.text': { en: 'Included with monthly, quarterly and annual memberships. Day passes add KES 300.', sw: 'Imejumuishwa na uanachama wa mwezi, robo mwaka na mwaka. Pasi za siku zinaongeza KES 300.' },
  'gym.classes.cta': { en: 'Ask about classes', sw: 'Uliza kuhusu madarasa' },
  'class.yoga': { en: 'Sunrise yoga', sw: 'Yoga ya mawio' },
  'class.yogaTime': { en: 'Tuesday & Thursday · 6:30am', sw: 'Jumanne na Alhamisi · 6:30am' },
  'class.spin': { en: 'Spin', sw: 'Spin' },
  'class.spinTime': { en: 'Monday, Wednesday & Friday · 6:00pm', sw: 'Jumatatu, Jumatano na Ijumaa · 6:00pm' },
  'class.strength': { en: 'Strength circuit', sw: 'Mzunguko wa nguvu' },
  'class.strengthTime': { en: 'Saturday · 9:00am', sw: 'Jumamosi · 9:00am' },
  'gym.dialog.title': { en: 'Book a day pass', sw: 'Weka pasi ya siku' },
  'gym.dialog.text': { en: 'Reserve a day pass and pay at the front desk when you arrive. We will hold it until 8pm.', sw: 'Hifadhi pasi ya siku na ulipe mapokezi utakapofika. Tutaihifadhi hadi 8pm.' },
  'gym.dialog.name': { en: 'Full name', sw: 'Jina kamili' },
  'gym.dialog.phone': { en: 'Phone number', sw: 'Namba ya simu' },
  'gym.dialog.date': { en: 'Day of visit', sw: 'Siku ya ziara' },
  'gym.dialog.submit': { en: 'Confirm day pass', sw: 'Thibitisha pasi ya siku' },
  'gym.dialog.note': { en: 'KES 1,000 per person, paid at the front desk. Towel and locker included.', sw: 'KES 1,000 kwa mtu, hulipwa mapokezi. Taulo na kabati vimejumuishwa.' },

  'dash.frontDesk': { en: 'Front desk', sw: 'Mapokezi' },
  'dash.live': { en: 'Live', sw: 'Moja kwa moja' },
  'dash.viewSite': { en: 'View website', sw: 'Tazama tovuti' },
  'dash.eyebrow': { en: 'Front desk dashboard', sw: 'Dashibodi ya mapokezi' },
  'dash.subtitle': { en: 'Here is what needs your attention today.', sw: 'Haya ni mambo yanayohitaji umakini wako leo.' },
  'dash.refresh': { en: 'Refresh', sw: 'Sasisha' },
  'dash.greeting.morning': { en: 'Good morning', sw: 'Habari za asubuhi' },
  'dash.greeting.afternoon': { en: 'Good afternoon', sw: 'Habari za mchana' },
  'dash.greeting.evening': { en: 'Good evening', sw: 'Habari za jioni' },
  'dash.stats.arrivals': { en: 'Arrivals today', sw: 'Wanaowasili leo' },
  'dash.stats.arrivalsNote': { en: '4 still to check in', sw: '4 bado kuingia' },
  'dash.stats.departures': { en: 'Departures', sw: 'Wanaondoka' },
  'dash.stats.departuresNote': { en: '3 rooms to inspect', sw: 'Vyumba 3 vya kukagua' },
  'dash.stats.inHouse': { en: 'In-house', sw: 'Waliopo ndani' },
  'dash.stats.inHouseNote': { en: '78% occupancy', sw: 'Umiashi 78%' },
  'dash.stats.requests': { en: 'Open requests', sw: 'Maombi yaliyo wazi' },
  'dash.stats.requestsNote': { en: 'Two due within 10 minutes', sw: 'Mawili yanahitajika ndani ya dakika 10' },
  'dash.requests.eyebrow': { en: 'Live requests', sw: 'Maombi ya moja kwa moja' },
  'dash.requests.title': { en: 'Guest requests', sw: 'Maombi ya wageni' },
  'dash.requests.text': { en: 'Respond quickly — guests can see when you have read the request.', sw: 'Jibu haraka — wageni wanaweza kuona uliposoma ombi.' },
  'request.open': { en: 'Open', sw: 'Wazi' },
  'request.confirmed': { en: 'Confirmed', sw: 'Imethibitishwa' },
  'request.declined': { en: 'Declined', sw: 'Imekataliwa' },
  'request.overdue': { en: 'Overdue', sw: 'Imechelewa' },
  'dash.confirm': { en: 'Confirm', sw: 'Thibitisha' },
  'dash.decline': { en: 'Decline', sw: 'Kataa' },
  'dash.call': { en: 'Call', sw: 'Piga simu' },
  'dash.resolved': { en: 'Resolved', sw: 'Imetatuliwa' },
  'dash.closed': { en: 'Closed', sw: 'Imefungwa' },
  'dash.request.pillows.room': { en: 'Room 204', sw: 'Chumba 204' },
  'dash.request.pillows.title': { en: 'Extra pillows', sw: 'Mitungi ya ziada' },
  'dash.request.pillows.desc': { en: 'Two extra pillows, please. Guest is in the room now.', sw: 'Mitungi miwili ya ziada, tafadhali. Mgeni yupo chumbani sasa.' },
  'dash.request.late.room': { en: 'Room 112', sw: 'Chumba 112' },
  'dash.request.late.title': { en: 'Late checkout', sw: 'Kutoka kwa kuchelewa' },
  'dash.request.late.desc': { en: 'Asking for 2pm instead of 11am. Room is free tonight.', sw: 'Anaomba 2pm badala ya 11am. Chumba kiko huru usiku wa leo.' },
  'dash.request.laundry.room': { en: 'Room 305', sw: 'Chumba 305' },
  'dash.request.laundry.title': { en: 'Laundry pickup', sw: 'Kuchukua nguo za kufulia' },
  'dash.request.laundry.desc': { en: 'Two shirts for pressing before 6pm. Guest is out until 4pm.', sw: 'Mashati mawili ya kupasi kabla ya 6pm. Mgeni hayupo hadi 4pm.' },
  'dash.arrivals.eyebrow': { en: 'Arrivals today', sw: 'Wanaowasili leo' },
  'dash.arrivals.title': { en: 'Expected guests', sw: 'Wageni wanaotarajiwa' },
  'dash.arrivals.all': { en: 'View all arrivals', sw: 'Tazama wote wanaowasili' },
  'status.expected': { en: 'Expected', sw: 'Anatarajiwa' },
  'status.checkedIn': { en: 'Checked in', sw: 'Ameingia' },
  'status.late': { en: 'Late', sw: 'Amechelewa' },
  'dash.rooms.eyebrow': { en: 'Housekeeping', sw: 'Usafi wa vyumba' },
  'dash.rooms.title': { en: 'Rooms right now', sw: 'Vyumba sasa hivi' },
  'dash.rooms.clean': { en: 'Clean', sw: 'Safi' },
  'dash.rooms.dirty': { en: 'Dirty', sw: 'Chafu' },
  'dash.rooms.out': { en: 'Out of order', sw: 'Havitumiki' },
  'dash.rooms.note': { en: 'Next inspection at 11:00am — rooms 112, 204 and 305.', sw: 'Ukaguzi ujao 11:00am — vyumba 112, 204 na 305.' },
  'dash.footer': { en: 'Demo dashboard — data refreshes when you reload the page.', sw: 'Dashibodi ya onyesho — data husasishwa unapopakia ukurasa tena.' },

  'offers.eyebrow': { en: 'Offers & Journal', sw: 'Ofa na Jarida' },
  'offers.title': { en: 'A little more reason to stay.', sw: 'Sababu zaidi kidogo ya kukaa.' },
  'offers.text': { en: 'Direct-only rates, seasonal menus and notes from the neighbourhood. Book something, or just read a while.', sw: 'Bei za moja kwa moja, menyu za msimu na maelezo kutoka kwa jirani. Weka nafasi, au soma kwa muda.' },
  'offers.browse': { en: 'Browse offers & stories', sw: 'Tazama ofa na hadithi' },
  'offers.featured': { en: 'Featured offer', sw: 'Ofa iliyoangaziwa' },
  'offers.minNights': { en: 'Minimum 4 nights', sw: 'Usiku 4 kwa chini' },
  'offers.stories.eyebrow': { en: 'The latest', sw: 'Mpya zaidi' },
  'offers.stories.title': { en: 'Offers, menus and notes from Kapenguria.', sw: 'Ofa, menyu na maelezo kutoka Kapenguria.' },
  'offers.filter.all': { en: 'All', sw: 'Zote' },
  'offers.filter.offers': { en: 'Offers', sw: 'Ofa' },
  'offers.filter.dining': { en: 'Dining', sw: 'Chakula' },
  'offers.filter.meetings': { en: 'Meetings', sw: 'Mikutano' },
  'offers.filter.journal': { en: 'Journal', sw: 'Jarida' },
  'offers.filterEmpty': { en: 'No stories in this category yet. Try another filter.', sw: 'Hakuna hadithi katika kundi hili bado. Jaribu kichujio kingine.' },
  'newsletter.cta': { en: 'Join the list', sw: 'Jiunge na orodha' },
  'journal.readTime': { en: '5 min read', sw: 'Dakika 5 kusoma' },
  'journal.westlands.tag': { en: 'Neighbourhood', sw: 'Jirani' },
  'journal.westlands.title': { en: '48 hours in Kapenguria', sw: 'Saa 48 Kapenguria' },
  'journal.westlands.excerpt': { en: 'Where to walk, eat and buy good coffee when you have a free afternoon.', sw: 'Mahali pa kutembea, kula na kununua kahawa nzuri ukiwa na mchana huru.' },
  'journal.coffee.tag': { en: 'People', sw: 'Watu' },
  'journal.coffee.title': { en: 'The people behind your cup', sw: 'Watu walio nyuma ya kikombe chako' },
  'journal.coffee.excerpt': { en: 'A morning with the co-operative that grows our Jacaranda Café beans.', sw: 'Asubuhi na ushirika unaolima kahawa ya Jacaranda Café.' },
  'journal.green.tag': { en: 'Sustainability', sw: 'Uendelevu' },
  'journal.green.title': { en: 'A lighter footprint, slowly', sw: 'Nyayo nyepesi, polepole' },
  'journal.green.excerpt': { en: 'The small changes we have made this year — and the ones still to come.', sw: 'Mabadiliko madogo tuliyofanya mwaka huu — na yajayo.' },
  'article.longStay.body': {
    en: 'Settle into a working rhythm. Stay four nights and the fourth is on us when you book direct — the same room, the same desk, the same team at the front desk.\n\nThe offer includes fibre Wi-Fi, daily housekeeping and free cancellation up to 48 hours before arrival. Breakfast can be added for KES 1,200 per person, per night.\n\nUse the code LONGSTAY when you book, or just choose four nights on the booking page and the rate adjusts automatically.',
    sw: 'Jipange kwa mzunguko wa kazi. Kaa usiku nne na wa nne ni zawadi yetu ukiweka nafasi moja kwa moja — chumba kilekile, dawati lilelile, timu ileile ya mapokezi.\n\nOfa inajumuisha Wi-Fi ya fibre, usafi wa kila siku na kughairi bila malipo hadi saa 48 kabla ya kuwasili. Kifungua kinywa kinaweza kuongezwa kwa KES 1,200 kwa mtu, kwa usiku.\n\nTumia msimbo LONGSTAY unapoweka nafasi, au chagua usiku nne kwenye ukurasa wa kuweka nafasi na bei itabadilika yenyewe.',
  },
  'article.ngo.body': {
    en: 'Field teams need a reliable base: secure parking, a generator that keeps the Wi-Fi on, and a front desk that answers at 5am.\n\nNGO staff receive 15% off our Standard Executive rooms all year. Show your NGO ID at check-in. We can issue a single invoice for a group and hold rooms with a purchase order.\n\nFor teams of five or more, ask about our meeting-room bundle with Kilele Hall and working lunch.',
    sw: 'Timu za shambani zinahitaji kituo cha kuaminika: maegesho salama, jenereta inayoweka Wi-Fi hewani, na mapokezi yanayojibu saa 11 alfajiri.\n\nWafanyakazi wa NGO wanapata punguzo la 15% kwenye vyumba vya Standard Executive mwaka mzima. Onyesha kitambulisho cha NGO wakati wa kuingia. Tunaweza kutoa ankara moja kwa kikundi na kuhifadhi vyumba kwa order ya ununuzi.\n\nKwa timu za watano au zaidi, uliza kuhusu kifurushi chetu cha ukumbi wa Kilele na chakula cha mchana cha kazi.',
  },
  'article.brunch.body': {
    en: 'Sunday moves slowly at Tulia. From 11:30am to 3pm, the buffet is generous: a live omelette station, nyama choma, salads, fresh chapati and a table of small sweets.\n\nBottomless Kenyan coffee is included. Children under 6 eat free, and there is a quiet corner for anyone who needs it.\n\nKES 2,500 per person. Book a table online or call the front desk — walk-ins are welcome, subject to space.',
    sw: 'Jumapili huenda polepole huko Tulia. Kuanzia 11:30am hadi 3pm, buffet ni kingi: kituo cha omelette papo hapo, nyama choma, saladi, chapati mbichi na meza ya vitafunio vitamu.\n\nKahawa ya Kenya bila kikomo imejumuishwa. Watoto chini ya miaka 6 wanakula bure, na kuna kona tulivu kwa anayehitaji.\n\nKES 2,500 kwa mtu. Weka meza mtandaoni au piga mapokezi — karibu bila miadi, kulingana na nafasi.',
  },
  'article.meetings.body': {
    en: 'Bring the team together without moving between venues. When you book five or more bedrooms, we take 10% off Kilele Hall hire for your workshop or offsite.\n\nThe room seats up to 100 theatre-style or 24 boardroom-style. Projector, sound, flipchart and fibre Wi-Fi are included, and Tulia can cater tea breaks and lunch.\n\nTell us the dates and format and we will send a written quote within one working day.',
    sw: 'Kuleta timu pamoja bila kuhama kati ya maeneo. Unapoweka vyumba vitano au zaidi, tunapunguza 10% kwenye ukumbi wa Kilele kwa warsha au offsite yako.\n\nChumba kinachukua hadi 100 kwa mtindo wa theatre au 24 kwa mtindo wa bodi. Projekta, sauti, flipchart na Wi-Fi ya fibre vimejumuishwa, na Tulia inaweza kutoa chai na chakula cha mchana.\n\nTuambie tarehe na muundo na tutatuma bei ya maandishi ndani ya siku moja ya kazi.',
  },
  'article.westlands.body': {
    en: 'Start with coffee. Jacaranda Café opens at 6am and the corner table gets the morning light. From there, walk into Kapenguria town centre and browse the small shops along the main street.\n\nFor lunch, Tulia does a proper nyama choma platter. In the afternoon, the Kapenguria Museum is a short ride away, or stay close and use the hotel gym.\n\nFinish with a slow dinner and an early night. Kapenguria is lively in the best way — but our rooms face the garden.',
    sw: 'Anza na kahawa. Jacaranda Café hufungua 6am na meza ya kona hupata mwanga wa asubuhi. Kutoka hapo, tembea katikati ya mji wa Kapenguria na uangalie maduka madogo kando ya barabara kuu.\n\nKwa chakula cha mchana, Tulia ina sahani nzuri ya nyama choma. Mchana, Jumba la Makumbusho la Kapenguria liko mbali kidogo, au baki karibu na utumie mazoezi ya hoteli.\n\nMaliza na chakula cha jioni cha polepole na kulala mapema. Kapenguria ina shughuli nzuri — lakini vyumba vyetu vinaelekea bustani.',
  },
  'article.coffee.body': {
    en: 'Our beans come from a small co-operative in Nyeri, where the same families have been growing SL28 and Ruiru 11 for three generations.\n\nWe buy through a Kenyan roaster who pays above the auction price and shares the roast profiles with us. Every Monday, the café team cups the new batch before it goes on the menu.\n\nNext time you order a pour-over, ask for the name of the farm. We keep it on the board behind the bar.',
    sw: 'Kahawa yetu inatoka kwa ushirika mdogo Nyeri, ambako familia zilezile zimekuwa wakilima SL28 na Ruiru 11 kwa vizazi vitatu.\n\nTunanunua kupitia roaster wa Kenya anayelipa zaidi ya bei ya mnada na kushiriki maelezo ya kuchoma nasi. Kila Jumatatu, timu ya mkahawa huonja mzigo mpya kabla ya kuingia menyuni.\n\nUkipenda kahawa ya pour-over wakati mwingine, uliza jina la shamba. Tunaweka kwenye ubao nyuma ya baa.',
  },
  'article.green.body': {
    en: 'Sustainability here is not a slogan. It is a list of small things we can actually finish.\n\nThis year we replaced single-use bathroom bottles with refillable dispensers, moved to LED lighting in the corridors and started separating glass, plastic and food waste with a local recycler.\n\nNext year we want to install solar water heating and plant more shade on the garden side. We will keep the list here, including the things that are taking longer than we hoped.',
    sw: 'Uendelevu hapa si kauli mbiu. Ni orodha ya mambo madogo tunayoweza kumaliza kwa kweli.\n\nMwaka huu tulibadilisha chupa za bafuni zinazotumika mara moja na dispenser zinazojazwa tena, tukahamia taa za LED kwenye korido na kuanza kutenganisha kioo, plastiki na taka za chakula na mrejelezaji wa ndani.\n\nMwaka ujao tunataka kuweka joto la maji la jua na kupanda vivuli zaidi upande wa bustani. Tutaendelea kuweka orodha hapa, pamoja na mambo yanayochukua muda mrefu kuliko tulivyotarajia.',
  },

  'contact.eyebrow': { en: 'Contact', sw: 'Mawasiliano' },
  'contact.title': { en: 'Talk to a real person.', sw: 'Zungumza na mtu halisi.' },
  'contact.text': { en: 'Questions about a stay, a table or the hall? The front desk is here 24 hours — call, message or send a note below.', sw: 'Maswali kuhusu kukaa, meza au ukumbi? Mapokezi yapo saa 24 — piga simu, tuma ujumbe au andika hapa chini.' },
  'contact.callUs': { en: 'Call us', sw: 'Tupigie' },
  'contact.whatsapp': { en: 'WhatsApp', sw: 'WhatsApp' },
  'contact.emailLabel': { en: 'Email', sw: 'Barua pepe' },
  'contact.visit': { en: 'Visit', sw: 'Tembelea' },
  'contact.form.eyebrow': { en: 'Send a message', sw: 'Tuma ujumbe' },
  'contact.form.title': { en: 'How can we help?', sw: 'Tunaweza kusaidiaje?' },
  'contact.form.text': { en: 'We reply within one working day — sooner if you call.', sw: 'Tunajibu ndani ya siku moja ya kazi — mapema ukituita.' },
  'contact.name': { en: 'Your name', sw: 'Jina lako' },
  'contact.phone': { en: 'Phone (optional)', sw: 'Simu (si lazima)' },
  'contact.topic': { en: 'What is this about?', sw: 'Hii inahusu nini?' },
  'contact.message': { en: 'Message', sw: 'Ujumbe' },
  'contact.messagePlaceholder': { en: 'Dates, numbers, dietary needs or anything else…', sw: 'Tarehe, namba, mahitaji ya chakula au jambo lingine…' },
  'contact.submit': { en: 'Send message', sw: 'Tuma ujumbe' },
  'contact.response': { en: 'We reply within one working day.', sw: 'Tunajibu ndani ya siku moja ya kazi.' },
  'contact.successTitle': { en: 'Message sent.', sw: 'Ujumbe umetumwa.' },
  'contact.successText': { en: 'Thank you — the front desk will reply within one working day. For anything urgent, call +254 20 765 4321.', sw: 'Asante — mapokezi yatajibu ndani ya siku moja ya kazi. Kwa jambo la haraka, piga +254 20 765 4321.' },
  'contact.topicLabel': { en: 'Topic', sw: 'Mada' },
  'contact.another': { en: 'Send another message', sw: 'Tuma ujumbe mwingine' },
  'contact.details.title': { en: 'Find us', sw: 'Tupate' },
  'contact.directions': { en: 'Get directions', sw: 'Pata maelekezo' },
  'contact.hours.title': { en: 'Opening hours', sw: 'Saa za kufungua' },
  'contact.hours.frontDesk': { en: 'Front desk', sw: 'Mapokezi' },
  'contact.hours.open24': { en: 'Open 24 hours', sw: 'Wazi saa 24' },
  'contact.getting.title': { en: 'Getting here', sw: 'Kufika hapa' },
  'contact.getting.text': { en: 'Five minutes from Kapenguria town centre, just off the Kitale–Lodwar road. Secure parking on site.', sw: 'Dakika tano kutoka katikati ya mji wa Kapenguria, kando ya barabara ya Kitale–Lodwar. Maegesho salama yapo.' },
  'contact.parking': { en: 'Secure parking', sw: 'Maegesho salama' },
  'contact.mapTitle': { en: 'Map of Westside Hotel in Kapenguria, West Pokot', sw: 'Ramani ya Westside Hotel Kapenguria, West Pokot' },
  'topic.general': { en: 'General enquiry', sw: 'Swali la jumla' },
  'topic.booking': { en: 'A booking', sw: 'Nafasi ya kukaa' },
  'topic.dining': { en: 'Restaurant or café', sw: 'Mgahawa au mkahawa' },
  'topic.conference': { en: 'Conference hall', sw: 'Ukumbi wa mikutano' },
  'topic.gym': { en: 'Gym & membership', sw: 'Mazoezi na uanachama' },
  'topic.group': { en: 'Group stay', sw: 'Kukaa kwa kikundi' },

  'validation.name': { en: 'Enter your name.', sw: 'Weka jina lako.' },
  'validation.date': { en: 'Choose a valid date.', sw: 'Chagua tarehe sahihi.' },
  'validation.time': { en: 'Please choose a time.', sw: 'Tafadhali chagua muda.' },
  'validation.guests': { en: 'Enter a number between 4 and 100.', sw: 'Weka namba kati ya 4 na 100.' },
  'validation.message': { en: 'Please write a short message.', sw: 'Tafadhali andika ujumbe mfupi.' },
  'toast.hallBooked': { en: 'Hall request received. The events team will confirm shortly.', sw: 'Ombi la ukumbi limepokelewa. Timu ya hafla itathibitisha hivi karibuni.' },
  'toast.quoteSent': { en: 'Quote request sent. We will reply within one working day.', sw: 'Ombi la bei limetumwa. Tutajibu ndani ya siku moja ya kazi.' },
  'toast.dayPass': { en: 'Day pass reserved. Pay at the front desk when you arrive.', sw: 'Pasi ya siku imehifadhiwa. Lipa mapokezi utakapofika.' },
  'toast.requestConfirmed': { en: 'Request confirmed. The guest has been notified.', sw: 'Ombi limethibitishwa. Mgeni amejulishwa.' },
  'toast.requestDeclined': { en: 'Request declined. The guest has been notified.', sw: 'Ombi limekataliwa. Mgeni amejulishwa.' },
};

const translations = entries as Record<string, Entry>;

let currentLanguage: Language = 'en';

export function getCurrentLanguage(): Language {
  return currentLanguage;
}

export function t(key: string): string {
  const entry = translations[key];
  if (!entry) {
    return key;
  }
  return entry[currentLanguage] ?? entry.en;
}

function translateElement(element: HTMLElement, language: Language): void {
  const key = element.dataset.i18n;
  if (key) {
    const entry = translations[key];
    if (entry) {
      element.textContent = entry[language] ?? entry.en;
    }
  }

  const placeholderKey = element.dataset.i18nPlaceholder;
  if (placeholderKey) {
    const entry = translations[placeholderKey];
    if (entry && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
      element.placeholder = entry[language] ?? entry.en;
    }
  }

  const ariaKey = element.dataset.i18nAria;
  if (ariaKey) {
    const entry = translations[ariaKey];
    if (entry) {
      element.setAttribute('aria-label', entry[language] ?? entry.en);
    }
  }

  const titleKey = element.dataset.i18nTitle;
  if (titleKey) {
    const entry = translations[titleKey];
    if (entry) {
      element.setAttribute('title', entry[language] ?? entry.en);
    }
  }
}

export function applyLanguage(language: Language): void {
  currentLanguage = language;
  document.documentElement.lang = language;

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    translateElement(element, language);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-placeholder]').forEach((element) => {
    translateElement(element, language);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((element) => {
    translateElement(element, language);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((element) => {
    translateElement(element, language);
  });

  document.querySelectorAll<HTMLElement>('[data-language-switch]').forEach((button) => {
    const en = button.querySelector<HTMLElement>('[data-lang="en"]');
    const sw = button.querySelector<HTMLElement>('[data-lang="sw"]');
    en?.classList.toggle('text-gold', language === 'en');
    en?.classList.toggle('text-white/60', language !== 'en');
    sw?.classList.toggle('text-gold', language === 'sw');
    sw?.classList.toggle('text-white/60', language !== 'sw');
  });
}

export function setLanguage(language: Language, notify = true): void {
  currentLanguage = language;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Storage may be unavailable in private browsing.
  }

  applyLanguage(language);

  if (notify) {
    const detail: LanguageChangeDetail = { language };
    document.dispatchEvent(new CustomEvent<LanguageChangeDetail>(LANGUAGE_CHANGE_EVENT, { detail }));
  }
}

export function initI18n(): void {
  let stored: Language | null = null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    stored = value === 'en' || value === 'sw' ? value : null;
  } catch {
    stored = null;
  }

  const initial: Language = stored ?? (document.documentElement.lang === 'sw' ? 'sw' : 'en');
  currentLanguage = initial;
  applyLanguage(initial);
}

export function initLanguageSwitcher(): void {
  document.querySelectorAll<HTMLElement>('[data-language-switch]').forEach((button) => {
    button.addEventListener('click', () => {
      const next: Language = currentLanguage === 'en' ? 'sw' : 'en';
      setLanguage(next);
    });
  });
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(currentLanguage === 'sw' ? 'sw-KE' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
