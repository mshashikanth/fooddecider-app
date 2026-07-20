export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { lat, lng, mood, hour } = req.query;
  const key = process.env.GOOGLE_PLACES_KEY;

  if (!lat || !lng) return res.status(400).json({ error: 'Missing coordinates' });

  const currentHour = parseInt(hour) || new Date().getUTCHours();
  const priceMap = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };

  // Mood to place types mapping
  const moodTypes = {
    // Morning
    'Quick breakfast':    ['breakfast_restaurant', 'cafe', 'bakery'],
    'Sit down and eat':   ['breakfast_restaurant', 'american_restaurant', 'restaurant'],
    'Coffee and something': ['cafe', 'coffee_shop', 'bakery'],
    // Lunch & Dinner
    'Fast and close':     ['fast_food_restaurant', 'sandwich_shop', 'pizza_restaurant'],
    'Treat myself':       ['restaurant', 'american_restaurant', 'seafood_restaurant'],
    'Out with someone':   ['restaurant', 'american_restaurant', 'italian_restaurant'],
    // Late night
    'Something open now': ['restaurant', 'fast_food_restaurant', 'bar'],
    'Late night spot':    ['bar', 'restaurant', 'fast_food_restaurant'],
    // Universal
    'Just feed me':       ['restaurant'],
  };

  // Price filters per mood
  const moodPrice = {
    'Quick breakfast':    { min: 0, max: 2 },
    'Sit down and eat':   { min: 1, max: 3 },
    'Coffee and something': { min: 0, max: 2 },
    'Fast and close':     { min: 0, max: 2 },
    'Treat myself':       { min: 2, max: 4 },
    'Out with someone':   { min: 1, max: 3 },
    'Something open now': { min: 0, max: 4 },
    'Late night spot':    { min: 0, max: 3 },
    'Just feed me':       { min: 0, max: 4 },
  };

  // Fast food names to exclude from Treat myself
  const fastFoodNames = ['mcdonald', "burger king", "wendy", "in-n-out", "taco bell", "subway", "kfc", "popeyes", "chipotle", "panda express", "jack in the box", "del taco", "carl'];

  const types = moodTypes[mood] || ['restaurant'];
  const priceRange = moodPrice[mood] || { min: 0, max: 4 };

  const searchPlaces = async (includedTypes) => {
    try {
      const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.priceLevel,places.regularOpeningHours,places.shortFormattedAddress,places.internationalPhoneNumber,places.editorialSummary',
        },
        body: JSON.stringify({
          includedTypes,
          excludedTypes: ['food_court'],
          maxResultCount: 20,
          locationRestriction: {
            circle: {
              center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
              radius: 3200,
            },
          },
        }),
      });
      const data = await response.json();
      return data.places || [];
    } catch { return []; }
  };

  const isOpenLongEnough = (place) => {
    if (!place.regularOpeningHours?.openNow) return false;
    const periods = place.regularOpeningHours?.periods || [];
    const now = new Date();
    const nowMins = now.getUTCHours() * 60 + now.getUTCMinutes();
    const todayDay = now.getUTCDay();

    for (const period of periods) {
      if (period.open?.day === todayDay || period.close?.day === todayDay) {
        const closeMins = (period.close?.hour || 0) * 60 + (period.close?.minute || 0);
        const closeDay = period.close?.day;

        // Handle midnight crossover
        const adjustedClose = closeDay !== todayDay ? closeMins + 1440 : closeMins;
        const adjustedNow = closeDay !== todayDay && nowMins > 720 ? nowMins : nowMins;

        // Must be open for at least 30 more minutes
        if (adjustedClose - adjustedNow >= 30) return true;
      }
    }
    return false;
  };

  try {
    let places = await searchPlaces(types);

    // Filter: must be open AND open for 30+ more minutes
    let filtered = places.filter(p => isOpenLongEnough(p));

    // Filter by price range
    let priceFiltered = filtered.filter(p => {
      const price = priceMap[p.priceLevel] ?? 2;
      return price >= priceRange.min && price <= priceRange.max;
    });

    // If price filter gives less than 2 results fall back
    if (priceFiltered.length < 2) priceFiltered = filtered;

    // If still less than 2 do a generic restaurant search
    if (priceFiltered.length < 2) {
      const fallback = await searchPlaces(['restaurant']);
      priceFiltered = fallback.filter(p => isOpenLongEnough(p));
    }

    // Remove fast food for Treat myself
    if (mood === 'Treat myself') {
      const noFastFood = priceFiltered.filter(p => {
        const name = (p.displayName?.text || '').toLowerCase();
        return !fastFoodNames.some(f => name.includes(f));
      });
      if (noFastFood.length >= 2) priceFiltered = noFastFood;
    }

    // Sort by rating
    priceFiltered.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    return res.status(200).json({ places: priceFiltered.slice(0, 2) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
