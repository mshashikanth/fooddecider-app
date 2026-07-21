export default async function handler(req, res) {
  var key = process.env.GOOGLE_PLACES_KEY;
  var lat = req.query.lat;
  var lng = req.query.lng;
  var url = 'https://places.googleapis.com/v1/places:searchNearby';
  var mask = 'places.id,places.displayName,places.rating,places.shortFormattedAddress,places.regularOpeningHours,places.internationalPhoneNumber,places.priceLevel,places.userRatingCount';
  var body = JSON.stringify({
    includedTypes: ['restaurant'],
    excludedTypes: ['food_court'],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
        radius: 3200
      }
    }
  });
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': mask },
    body: body
  }).then(function(r) { return r.json(); }).then(function(d) {
    var places = (d.places || []).filter(function(p) { return p.regularOpeningHours && p.regularOpeningHours.openNow; });
    places.sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); });
    res.status(200).json({ places: places.slice(0, 2) });
  }).catch(function(e) { res.status(500).json({ error: e.message }); });
}