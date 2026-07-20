export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { lat, lng, mood, hour } = req.query;
  const key = process.env.GOOGLE_PLACES_KEY;

  if (!lat || !lng) return res.status(400).json({ error: 'Missing coordinates' });

  const priceMap = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4
  };

  const moodTypes = {
    'Quick breakfast': ['breakfast_restaurant', 'cafe', 'bakery'],
    'Sit down and eat': ['breakfast_restaurant', 'american_restaurant', 'restaurant'],
    'Coffee and something': ['cafe', 'coffee_shop', 'bakery'],
    'Fast and close': ['fast_food_restaurant', 'sandwich_shop', 'pizza_restaurant'],
    'Treat myself': ['restaurant', 'american_restaurant', 'seafood_restaurant'],
    'Out with someone': ['restaurant', 'american_restaurant', 'italian_restaurant'],
    'Something open now': ['restaurant', 'fast_food_restaurant', 'bar'],
    'Late night spot': ['bar', 'restaurant', 'fast_food_restaurant'],
    'Just feed me': ['restaurant']
  };

  const moodPrice = {
    'Quick breakfast': { min: 0, max: 2 },
    'Sit down and eat': { min: 1, max: 3 },
    'Coffee and something': { min: 0, max: 2 },
    'Fast and close': { min: 0, max: 2 },
    'Treat myself': { min: 2, max: 4 },
    'Out with someone': { min: 1, max: 3 },
    'Something open now': { min: 0, max: 4 },
    'Late night spot': { min: 0, max: 3 },
    'Just feed me': { min: 0, max: 4 }
  };

  const fastFoodList = [
    'mcdonald',
    'burger king',
    'wendy',
    'in-n-out',
    'taco bell',
    'subway',
    'kfc',
    'popeyes',
    'chipotle',
    'panda express',
    'jack in the box',
    'del taco',
    'carl'
  ];

  const types = moodTypes[mood] || ['restaurant'];
  const priceRange = moodPrice[mood] || { min: 0, max: 4 };

  const searchPlaces = async (includedTypes) => {
    try {
      const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.priceLevel,places.regularOpeningHours,places.shortFormattedAddress,places.internationalPhoneNumber,places.editorialSummary'
        },
        body: JSON.stringify({
          includedTypes: includedTypes,
          excludedTypes: ['food_court'],
          maxResultCount: 20,
          locationRestriction: {
            circle: {
              center: {
                latitude: parseFloat(lat),
                longitude: parseFloat(lng)
              },
              radius: 3200
            }
          }
        })
      });
      const data = await response.json();
      return data.places || [];
    } catch (e) {
      return [];
    }
  };

  const isOpenLongEnough = (place) => {
    if (!place.regularOpeningHours) return true;
    if (!place.regularOpeningHours.openNow) return false;
    const periods = place.regularOpeningHours.periods || [];
    if (!periods.length) return true;

    const now = new Date();
    const nowMins = now.getUTCHours() * 60 + now.getUTCMinutes();
    const todayDay = now.getUTCDay();

    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      const openDay = period.open && period.open.day;
      const closeDay = period.close && period.close.day;
      const closeHour = period.close ? period.close.hour : 23;
      const closeMin = period.close ? period.close.minute : 59;

      if (openDay === todayDay || closeDay === todayDay) {
        let closeMins = closeHour * 60 + closeMin;
        if (closeDay !== todayDay) {
          closeMins = closeMins + 1440;
        }
        if (closeMins - nowMins >= 30) {
          return true;
        }
      }
    }
    return false;
  };

  try {
    let places = await searchPlaces(types);
    let filtered = places.filter(function(p) { return isOpenLongEnough(p); });

    let priceFiltered = filtered.filter(function(p) {
      const price = priceMap[p.priceLevel] !== undefined ? priceMap[p.priceLevel] : 2;
      return price >= priceRange.min && price <= priceRange.max;
    });

    if (priceFiltered.length < 2) {
      priceFiltered = filtered;
    }

    if (priceFiltered.length < 2) {
      const fallback = await searchPlaces(['restaurant']);
      priceFiltered = fallback.filter(function(p) { return isOpenLongEnough(p); });
    }

    if (mood === 'Treat myself') {
      const noFastFood = priceFiltered.filter(function(p) {
        const name = (p.displayName && p.displayName.text ? p.displayName.text : '').toLowerCase();
        for (let i = 0; i < fastFoodList.length; i++) {
          if (name.indexOf(fastFoodList[i]) !== -1) return false;
        }
        return true;
      });
      if (noFastFood.length >= 2) {
        priceFiltered = noFastFood;
      }
    }

    priceFiltered.sort(function(a, b) {
      return (b.rating || 0) - (a.rating || 0);
    });

    return res.status(200).json({ places: priceFiltered.slice(0, 2) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
