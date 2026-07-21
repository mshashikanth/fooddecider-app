export default async function handler(req, res) {
  var key = process.env.GOOGLE_PLACES_KEY;
  var address = req.query.address;
  if (!address) { res.status(400).json({ error: 'Missing address' }); return; }
  var url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(address) + '&key=' + key;
  fetch(url).then(function(r) { return r.json(); }).then(function(d) {
    if (!d.results || !d.results[0]) { res.status(404).json({ error: 'Not found' }); return; }
    var loc = d.results[0].geometry.location;
    res.status(200).json({ lat: loc.lat, lng: loc.lng, label: d.results[0].formatted_address });
  }).catch(function(e) { res.status(500).json({ error: e.message }); });
}