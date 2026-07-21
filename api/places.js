export default async function handler(req, res) {
  const key = process.env.GOOGLE_PLACES_KEY;
  const { lat, lng } = req.query;
  try {
    const r = await fetch(
      "https://places.googleapis.com/v1/places:searchNearby",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.shortFormattedAddress,places.regularOpeningHours,places.internationalPhoneNumber,places.priceLevel,places.userRatingCount,places.editorialSummary"
        },
        body: JSON.stringify({
          includedTypes: ["restaurant"],
          excludedTypes: ["food_court"],
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
      }
    );
    const d = await r.json();
    const open = (d.places || []).filter(p => p.regularOpeningHours && p.regularOpeningHours.openNow);
    open.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    res.status(200).json({ places: open.slice(0, 2) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
