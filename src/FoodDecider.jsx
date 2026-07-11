import React, { useState, useRef, useEffect, useCallback } from 'react';

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

let supabase = null;
if (SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
  import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });
}

const MOOD_OPTIONS = [
  { label: 'Tired, just feed me', emoji: '😮‍💨', types: ['restaurant', 'meal_takeaway'], speed: true },
  { label: 'Quick, back in 30', emoji: '⚡', types: ['fast_food_restaurant', 'sandwich_shop'], speed: true },
  { label: 'Out with someone', emoji: '🥂', types: ['restaurant', 'bar'], speed: false },
  { label: 'Treat myself tonight', emoji: '👑', types: ['fine_dining_restaurant', 'restaurant'], speed: false },
];

const PRICE_MAP = { PRICE_LEVEL_INEXPENSIVE: '$', PRICE_LEVEL_MODERATE: '$$', PRICE_LEVEL_EXPENSIVE: '$$$', PRICE_LEVEL_VERY_EXPENSIVE: '$$$$' };

const FoodDecider = () => {
  const [screen, setScreen] = useState('location');
  const [locationText, setLocationText] = useState('');
  const [coords, setCoords] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [voteScreen, setVoteScreen] = useState(null);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [votes, setVotes] = useState({});
  const [countdown, setCountdown] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const fetchLiveScore = async (placeId) => {
    if (!supabase) return null;
    try {
      const { data } = await supabase
        .from('votes')
        .select('worth_it, created_at')
        .eq('restaurant_id', placeId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!data || data.length === 0) return null;
      const pct = Math.round((data.filter(v => v.worth_it).length / data.length) * 100);
      const diffMin = Math.floor((Date.now() - new Date(data[0].created_at)) / 60000);
      const freshness = diffMin < 1 ? 'just now' : diffMin < 60 ? `${diffMin} min ago` : `${Math.floor(diffMin / 60)}h ago`;
      return { pct, freshness };
    } catch { return null; }
  };

  const submitVote = async (worthIt) => {
    if (!voteScreen) return;
    if (supabase) {
      try {
        await supabase.from('votes').insert({
          restaurant_id: voteScreen.id,
          dish_name: voteScreen.name,
          worth_it: worthIt,
          created_at: new Date().toISOString()
        });
        setVotes(prev => ({ ...prev, [voteScreen.id]: { pct: worthIt ? 100 : 0, freshness: 'just now' } }));
      } catch (e) { console.log(e); }
    }
    setVoteSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => {
      setVoteScreen(null);
      setVoteSubmitted(false);
      setCountdown(null);
    }, 2500);
  };

  const detectLocation = () => {
    setLocationLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationText('Current location');
        setLocationLoading(false);
        setScreen('mood');
      },
      () => {
        setLocationLoading(false);
        setError('Could not detect location. Type your neighborhood below.');
      }
    );
  };

  const handleManualLocation = async () => {
    if (!locationText.trim()) return;
    setLocationLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationText)}&key=AIzaSyDUMMYKEYREPLACETHIS`);
      const data = await res.json();
      if (data.results && data.results[0]) {
        const loc = data.results[0].geometry.location;
        setCoords({ lat: loc.lat, lng: loc.lng });
        setScreen('mood');
      } else {
        setError('Location not found. Try again.');
      }
    } catch {
      setError('Could not find location. Try again.');
    }
    setLocationLoading(false);
  };

  const handleMood = async (mood) => {
    setSelectedMood(mood);
    setScreen('results');
    setLoading(true);
    setError(null);

    try {
      const type = mood.types[0];
      const res = await fetch(`/api/places?lat=${coords.lat}&lng=${coords.lng}&type=${type}`);
      const data = await res.json();

      if (!data.places || data.places.length === 0) {
        setError('No restaurants found nearby. Try a different location.');
        setLoading(false);
        return;
      }

      const top2 = data.places.slice(0, 2);
      const scoresArr = await Promise.all(top2.map(p => fetchLiveScore(p.id)));
      const newVotes = {};
      top2.forEach((p, i) => { if (scoresArr[i]) newVotes[p.id] = scoresArr[i]; });
      setVotes(prev => ({ ...prev, ...newVotes }));
      setResults(top2);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const handleGoThere = (place) => {
    const name = place.displayName?.text || '';
    const address = place.shortFormattedAddress || '';
    window.open(`https://maps.google.com/search?q=${encodeURIComponent(name + ' ' + address)}`, '_blank');

    let secs = 2700;
    setCountdown(secs);
    timerRef.current = setInterval(() => {
      secs -= 1;
      setCountdown(secs);
      if (secs <= 0) {
        clearInterval(timerRef.current);
        setVoteScreen({ id: place.id, name: place.displayName?.text || 'this place' });
      }
    }, 1000);
  };

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const reset = () => {
    setScreen('mood');
    setResults([]);
    setSelectedMood(null);
    setError(null);
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(null);
  };

  const W = {
    page: {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#FFF8F0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      color: '#1A0A00',
      overflow: 'hidden',
      position: 'relative'
    },
    header: {
      background: '#FFF8F0',
      borderBottom: '1px solid #F0E0D0',
      padding: '0 20px 14px',
      paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
      textAlign: 'center',
      flexShrink: 0
    },
    logo: { fontSize: '26px', fontWeight: '900', color: '#E8450A', letterSpacing: '-0.5px' },
    logoSub: { fontSize: '11px', color: '#C4A898', marginTop: '2px', letterSpacing: '0.06em', textTransform: 'uppercase' },
    scroll: { flex: 1, overflowY: 'scroll', WebkitOverflowScrolling: 'touch', padding: '20px 16px' },
    inner: { maxWidth: '440px', margin: '0 auto' },
    card: { background: '#fff', border: '1px solid #F0E0D0', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(232,69,10,0.06)' },
    label: { fontSize: '11px', fontWeight: '700', color: '#C4A898', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' },
    title: { fontSize: '22px', fontWeight: '800', color: '#1A0A00', letterSpacing: '-0.3px', marginBottom: '4px' },
    sub: { fontSize: '14px', color: '#8B6A5A', lineHeight: '1.5', marginBottom: '16px' },
    primaryBtn: { width: '100%', background: '#E8450A', color: '#fff', border: 'none', borderRadius: '12px', padding: '15px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', marginBottom: '10px' },
    ghostBtn: { width: '100%', background: 'transparent', color: '#C4A898', border: '1px solid #F0E0D0', borderRadius: '12px', padding: '13px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
    input: { width: '100%', background: '#FFF8F0', border: '1px solid #F0E0D0', borderRadius: '12px', padding: '13px 16px', fontSize: '16px', color: '#1A0A00', outline: 'none', marginBottom: '10px', WebkitAppearance: 'none' },
    moodBtn: { width: '100%', background: '#FFF8F0', border: '1px solid #F0E0D0', borderRadius: '14px', padding: '16px', marginBottom: '10px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '14px', WebkitTapHighlightColor: 'transparent' },
    moodEmoji: { fontSize: '28px', flexShrink: 0 },
    moodLabel: { fontSize: '16px', fontWeight: '700', color: '#1A0A00' },
    restCard: (isFirst) => ({ background: '#fff', border: `1px solid ${isFirst ? '#E8450A' : '#F0E0D0'}`, borderRadius: '16px', marginBottom: '12px', overflow: 'hidden', boxShadow: isFirst ? '0 2px 12px rgba(232,69,10,0.12)' : '0 1px 3px rgba(0,0,0,0.04)' }),
    topPick: { background: '#E8450A', padding: '5px 0', fontSize: '10px', fontWeight: '800', color: '#fff', letterSpacing: '0.1em', textAlign: 'center' },
    restInner: { padding: '16px' },
    restName: { fontSize: '20px', fontWeight: '900', color: '#1A0A00', letterSpacing: '-0.3px', marginBottom: '3px' },
    restMeta: { fontSize: '12px', color: '#C4A898', marginBottom: '12px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px', marginBottom: '12px' },
    statBox: (color) => ({ background: '#FFF8F0', border: '1px solid #F0E0D0', borderRadius: '10px', padding: '10px 6px', textAlign: 'center' }),
    statVal: (color) => ({ fontSize: '13px', fontWeight: '800', color }),
    statSub: { fontSize: '9px', color: '#C4A898', marginTop: '3px' },
    liveBadge: (hasScore) => ({ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }),
    liveDot: (hasScore) => ({ width: '6px', height: '6px', borderRadius: '50%', background: hasScore ? '#22A05B' : '#E0D0C8', flexShrink: 0 }),
    liveText: (hasScore) => ({ fontSize: '11px', fontWeight: '700', color: hasScore ? '#22A05B' : '#C4A898' }),
    takeBtn: (isFirst) => ({ width: '100%', background: isFirst ? '#E8450A' : 'transparent', color: isFirst ? '#fff' : '#C4A898', border: isFirst ? 'none' : '1px solid #F0E0D0', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', marginBottom: '10px' }),
    phoneLink: { display: 'block', textAlign: 'center', fontSize: '12px', color: '#C4A898', textDecoration: 'none' },
    overlay: { position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(26,10,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' },
    overlayCard: { background: '#fff', borderRadius: '24px', padding: '28px 22px', maxWidth: '340px', width: '100%', boxShadow: '0 20px 60px rgba(232,69,10,0.2)' },
    errorBox: { background: '#FFF0EB', border: '1px solid #FFD0C0', borderRadius: '12px', padding: '12px 14px', marginBottom: '12px', fontSize: '13px', color: '#E8450A', lineHeight: '1.5' },
    countdownBar: { background: '#FFF0EB', borderTop: '1px solid #FFD0C0', padding: '12px 20px', textAlign: 'center', flexShrink: 0 },
  };

  return (
    <div style={W.page}>

      {voteScreen && (
        <div style={W.overlay}>
          <div style={W.overlayCard}>
            {!voteSubmitted ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '44px', marginBottom: '10px' }}>🍽️</div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: '#1A0A00', marginBottom: '4px' }}>How was it?</div>
                  <div style={{ fontSize: '13px', color: '#8B6A5A' }}>One tap · takes 2 seconds</div>
                </div>
                <div style={{ background: '#FFF8F0', border: '1px solid #F0E0D0', borderRadius: '12px', padding: '12px 14px', marginBottom: '18px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1A0A00' }}>{voteScreen.name}</div>
                  <div style={{ fontSize: '11px', color: '#C4A898', marginTop: '2px' }}>was it worth it?</div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => submitVote(true)} style={{ flex: 1, background: '#E8F5EE', border: '1px solid #22A05B', color: '#22A05B', borderRadius: '12px', padding: '15px', fontSize: '15px', fontWeight: '800', cursor: 'pointer' }}>✓ Worth it</button>
                  <button onClick={() => submitVote(false)} style={{ flex: 1, background: '#FFF0EB', border: '1px solid #E8450A', color: '#E8450A', borderRadius: '12px', padding: '15px', fontSize: '15px', fontWeight: '800', cursor: 'pointer' }}>✗ Not quite</button>
                </div>
                <div style={{ textAlign: 'center', fontSize: '10px', color: '#C4A898', marginTop: '12px' }}>your vote updates the score in real time</div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#1A0A00', marginBottom: '6px' }}>Logged!</div>
                <div style={{ fontSize: '13px', color: '#8B6A5A', lineHeight: '1.6' }}>Score updated.<br />You helped the next person decide.</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={W.header}>
        <div style={W.logo}>Bitten60</div>
        <div style={W.logoSub}>2 picks · someone was just there</div>
      </div>

      {countdown !== null && countdown > 0 && (
        <div style={W.countdownBar}>
          <span style={{ fontSize: '13px', color: '#E8450A', fontWeight: '700' }}>
            Vote opens in {formatCountdown(countdown)} — keep this tab open 🍽️
          </span>
        </div>
      )}

      <div ref={scrollRef} style={W.scroll}>
        <div style={W.inner}>

          {screen === 'location' && (
            <div>
              <div style={{ ...W.title, marginBottom: '6px', marginTop: '8px' }}>Where are you?</div>
              <div style={{ ...W.sub, marginBottom: '20px' }}>We'll find the best spots near you</div>

              {error && <div style={W.errorBox}>{error}</div>}

              <button onClick={detectLocation} style={W.primaryBtn} disabled={locationLoading}>
                {locationLoading ? 'Detecting...' : '📍 Use my current location'}
              </button>

              <div style={{ textAlign: 'center', fontSize: '12px', color: '#C4A898', margin: '12px 0' }}>or type your neighborhood</div>

              <input
                ref={inputRef}
                type="text"
                value={locationText}
                onChange={e => setLocationText(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleManualLocation()}
                placeholder="Culver City, Downtown LA..."
                style={W.input}
              />
              <button onClick={handleManualLocation} style={W.ghostBtn} disabled={locationLoading}>
                {locationLoading ? 'Finding...' : 'Search this area'}
              </button>
            </div>
          )}

          {screen === 'mood' && (
            <div>
              <div style={{ ...W.title, marginBottom: '4px', marginTop: '8px' }}>What's the vibe?</div>
              <div style={{ ...W.sub, marginBottom: '20px' }}>Pick one — we'll handle the rest</div>
              {MOOD_OPTIONS.map((mood, i) => (
                <button key={i} onClick={() => handleMood(mood)} style={W.moodBtn}>
                  <span style={W.moodEmoji}>{mood.emoji}</span>
                  <span style={W.moodLabel}>{mood.label}</span>
                </button>
              ))}
              <button onClick={() => setScreen('location')} style={{ ...W.ghostBtn, marginTop: '4px' }}>
                ← change location
              </button>
            </div>
          )}

          {screen === 'results' && (
            <div>
              {loading && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ width: '32px', height: '32px', border: '3px solid #F0E0D0', borderTopColor: '#E8450A', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 14px' }} />
                  <div style={{ fontSize: '14px', color: '#8B6A5A' }}>Finding your 2 best spots...</div>
                </div>
              )}

              {error && !loading && (
                <div>
                  <div style={W.errorBox}>{error}</div>
                  <button onClick={reset} style={W.primaryBtn}>Try again</button>
                </div>
              )}

              {!loading && !error && results.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', color: '#C4A898', marginBottom: '14px', textAlign: 'center' }}>
                    your 2 picks near {locationText || 'you'}
                  </div>

                  {results.map((place, ri) => {
                    const score = votes[place.id];
                    const isFirst = ri === 0;
                    const name = place.displayName?.text || 'Restaurant';
                    const address = place.shortFormattedAddress || '';
                    const rating = place.rating;
                    const reviewCount = place.userRatingCount;
                    const price = PRICE_MAP[place.priceLevel] || '';
