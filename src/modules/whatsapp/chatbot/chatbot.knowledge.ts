/**
 * OMEGA SPA — Comprehensive Knowledge Base & Persona
 * Location: Douala, Cameroon (Bonapriso / Akwa)
 * Currency: FCFA
 */

export const SPA_PROFILE = {
  name: 'OMEGA SPA BONAMOUSADI',
  tagline: 'Luxury Day Spa & Point of Sale — Douala, Cameroon',
  city: 'Douala',
  country: 'Cameroon',
  address: 'Round point maetur Bonamousadi, Douala, Cameroun',
  googleMapsUrl: 'https://maps.google.com/?q=Omega+Spa+Bonamousadi+Douala',
  googleReviewUrl: 'https://g.page/r/omega-spa-douala/review',
  facebookUrl: 'https://facebook.com/omegaspa.douala',
  instagramHandle: '@omegaspa_douala',
  officialPhone: '+237 6 53 14 62 69',
  operatingHours: {
    monday_tuesday_wednesday_friday: '09:00 - 21:00',
    thursday: '10:00 - 21:00',
    sunday: '11:00 - 21:00',
  },
  acceptedPaymentMethods: [
    'Cash (Espèces à la caisse)',
    'MTN Mobile Money (MoMo à la réception)',
    'Orange Money (OM à la réception)',
    'Carte Bancaire / Visa / Mastercard',
  ],
  referralReward: '500 bonus loyalty points or 10% discount on next session when referring a friend',
};

export const SPA_FAQS = [
  // 1. Facials & Skincare
  {
    topic: 'Facials & Skincare',
    question_fr: 'Quels sont les soins du visage disponibles et pour quel type de peau ?',
    question_en: 'What facials do you offer and for which skin types?',
    answer_fr: 'Nous proposons des soins hydratants, purifiants anti-acné, éclat et anti-âge. Tous nos soins commencent par une analyse de peau personnalisée par nos esthéticiennes certifiées pour adapter les sérums à votre peau (sensible, grasse, mixte ou sèche).',
    answer_en: 'We offer hydrating, anti-acne purifying, radiance, and anti-aging facials. Every facial starts with a personalized skin diagnosis by our certified aestheticians to match serums to your skin type.',
  },
  {
    topic: 'Facials Sensitivity',
    question_fr: 'Puis-je faire un soin si j’ai la peau très sensible ou de l’eczéma ?',
    question_en: 'Can I do a facial if I have sensitive skin or eczema?',
    answer_fr: 'Oui, nous utilisons des produits hypoallergéniques et apaisants sans alcool ni parabènes. Signalez votre sensibilité dès le début pour adapter les techniques de vapeur et gommage.',
    answer_en: 'Yes, we use hypoallergenic, soothing products free from alcohol and parabens. Please notify your aesthetician before starting.',
  },
  // 2. Massages & Body Treatments
  {
    topic: 'Massages & Relaxation',
    question_fr: 'Quels types de massages proposez-vous ?',
    question_en: 'What types of massage do you offer?',
    answer_fr: 'Nous proposons : Massage Relaxant Suédois, Massage Deep Tissue (tissus profonds pour tensions musculaires), Massage aux Pierres Chaudes, et Réflexologie Plantaire.',
    answer_en: 'We offer: Swedish Relaxing Massage, Deep Tissue Massage (for deep muscle tension), Hot Stone Massage, and Foot Reflexology.',
  },
  {
    topic: 'Pregnancy Safety',
    question_fr: 'Une femme enceinte peut-elle recevoir un massage ?',
    question_en: 'Can pregnant women receive a massage?',
    answer_fr: 'Oui, à partir du 2ème trimestre (après 3 mois de grossesse), nous proposons un massage prénatal doux spécialement conçu pour soulager le dos et les jambes lourdes. Nous évitons les huiles essentielles stimulantes.',
    answer_en: 'Yes, starting from the second trimester (after 3 months), we offer a gentle prenatal massage tailored to relieve back pain and swollen legs without stimulating essential oils.',
  },
  // 3. Nails & Hair
  {
    topic: 'Nail Care & Longevity',
    question_fr: 'Combien de temps dure la pose d’ongles en gel ou vernis semi-permanent ?',
    question_en: 'How long does gel or semi-permanent nail polish last?',
    answer_fr: 'Le vernis semi-permanent dure entre 2 et 3 semaines. Les ongles en gel durent 3 à 4 semaines avec une excellente tenue et brillance. Nous recommandons un remplissage toutes les 3 semaines.',
    answer_en: 'Semi-permanent gel polish lasts 2 to 3 weeks. Gel nails last 3 to 4 weeks with brilliant shine. We recommend a refill every 3 weeks.',
  },
  // 4. Booking & Cancellation Rules
  {
    topic: 'Booking & Cancellation',
    question_fr: 'Quelle est la politique d’annulation ou de retard ?',
    question_en: 'What is the cancellation or late arrival policy?',
    answer_fr: 'Nous vous prions de nous prévenir au moins 2 heures à l’avance en cas d’empêchement. En cas de retard de plus de 15 minutes, la durée du soin pourra être écourtée pour respecter les clients suivants.',
    answer_en: 'Please inform us at least 2 hours in advance if you need to reschedule. For delays over 15 minutes, service time may be adjusted to respect following appointments.',
  },
  // 5. Hygiene & Amenities
  {
    topic: 'Hygiene & Amenities',
    question_fr: 'Quelles sont vos règles d’hygiène et disposez-vous d’un parking ?',
    question_en: 'What are your hygiene standards and is parking available?',
    answer_fr: 'Tout notre matériel en métal est stérilisé en autoclave après chaque client. Les serviettes et linges sont à usage unique lavés à haute température. Un parking sécurisé avec gardien est disponible devant le spa.',
    answer_en: 'All metal instruments are autoclave-sterilized after each client. Single-use fresh towels are provided. Safe, guarded parking is available in front of the spa.',
  },
];

export const SYSTEM_PERSONA_PROMPT = `
You are the luxury AI Receptionist and Concierge of "OMEGA SPA" located in Douala, Cameroon (Bonamousadi).
You communicate fluently in both French and English.

CORE PERSONALITY & GUIDELINES:
1. Warm, elegant, highly polite, welcoming, and professional (Luxury Spa Concierge tone).
2. AUTOMATIC LANGUAGE DETECTION:
   - If the client speaks in French, reply in French.
   - If the client speaks in English, reply in English.
   - For Cameroon context: understand local terms like "quartier", "FCFA", "MoMo", "OM", "onglerie", "coiffure".
3. CURRENCY: Always quote prices in "FCFA" (e.g. 15 000 FCFA).
4. LIVE SERVICES & PRICES:
   - Always use the provided tool "get_services_catalog" when clients ask about prices, services, or packages. Never invent prices or services.
5. UPSELLING & RECOMMENDATIONS:
   - When a client is interested in a service, subtly and politely suggest a complementary treatment (e.g. if they book a Facial, suggest an express hand scrub or eye contour treatment; if Gel Nails, suggest a relaxing pedicure).
6. COSMETICS & RETAIL PRODUCTS:
   - When asked about skincare products, hair oils, or aftercare, use the "get_cosmetics_catalog" tool to recommend items.
7. APPOINTMENT BOOKING:
   - When the user wants to book, check technician availability using "check_technician_availability".
   - Confirm preferred date, time, and service before executing "book_appointment".
8. LOCATION & HOURS:
   - Omega Spa is in Douala, Bonamousadi (Round point maetur).
   - Hours: Lun-Mar-Mer-Ven: 09h00-21h00, Jeu: 10h00-21h00, Dim: 11h00-21h00.
   - Direct Phone / Réservation: +237 6 53 14 62 69.
   - When asked for location, share address and Google Maps link: ${SPA_PROFILE.googleMapsUrl}.
9. REVIEWS & REFERRALS:
   - Invite happy clients to leave a Google 5-star review: ${SPA_PROFILE.googleReviewUrl}.
   - Mention the referral bonus: 500 loyalty points or 10% discount on next session when referring a friend.
10. PAYMENT INSTRUCTIONS:
    - Payments are settled at the reception desk via Cash (espèces), MTN MoMo, Orange Money, or Visa/Mastercard.
    - NEVER ask for secret PINs, bank passwords, or OTPs.
`.trim();

