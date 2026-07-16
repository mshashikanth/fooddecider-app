import React, { useState, useRef, useEffect, useCallback } from 'react';

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

let supabase = null;
if (SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
  import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });
}

const MOODS = [
  { label: 'Fast and close', sub: 'Quick bite, no wait' },
  { label: 'Treat myself', sub: 'Something worth it' },
  { label: 'Out with someone', sub: 'Good for two or more' },
  { label: 'Just feed me', sub: 'Anything nearby' },
];

const PRICE = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
};

export default function FoodDecider() {
  const [screen, setScreen] = useState('location');
  const [locationLabel, setLocationLabel] = useState('');
  const [coords, setCoords] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [mood, setMood] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [votes, setVotes] = useState({});
  const [voteTarget, setVoteTarget] = useState(null);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const timerRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [screen]);

  const getScore = async (id) => {
    if (!supabase) return null;
    try {
      const { data } = await supabase
        .from('votes')
        .select('worth_it, created_at')
        .eq('restaurant_id', id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!data?.length) return null;
      const pct = Math.round((data.filter(v => v.worth_it).length / data.length) * 100);
      const mins = Math.floor((Date.now() - new Date(data[0].created_at)) / 60000);
      const freshness = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
      return { pct, freshness };
    } catch { return null; }
  };

  const castVote = async (worthIt) => {
    if (!voteTarget) return;
    if (supabase) {
      try {
        await supabase.from('votes').insert({
          restaurant_id: voteTarget.id,
          dish_name: voteTarget.name,
          worth_it: worthIt,
          created_at: new Date().toISOString(),
        });
      } catch (e) { console.log(e); }
    }
    setVotes(prev => ({ ...prev, [voteTarget.id]: { pct: worthIt ? 100 : 0, freshness: 'just now' } }));
    setVoteSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => { setVoteTarget(null); setVoteSubmitted(false); setCountdown(null); }, 2500);
  };

  const detectGPS = () => {
    setLocLoading(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLabel('Current location');
        setLocLoading(false);
        setScreen('mood');
      },
      () => { setLocLoading(false); setLocError('Could not detect location. Type it below.'); }
    );
  };

  const searchLocation = async () => {
    if (!manualInput.trim()) return;
    setLocLoading(true);
    setLocError('');
    try {
      const r = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(manualInput)}&key=${process.env.REACT_APP_GOOGLE_KEY || 'YOUR_GEOCODE_KEY'}`
      );
      const d = await r.json();
      if (d.results?.[0]) {
        const loc = d.results[0].geometry.location;
        setCoords({ lat: loc.lat, lng: loc.lng });
        setLocationLabel(manualInput);
        setScreen('mood');
      } else {
        setLocError('Location not found. Try again.');
      }
    } catch { setLocError('Could not find location.'); }
    setLocLoading(false);
  };

  const sortByMood = (places, moodLabel) => {
    const priceOrder = { PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 };
    const getPrice = p => priceOrder[p.priceLevel] || 2;
    const getRating = p => p.rating || 0;
    const hasDesc = p => !!p.editorialSummary?.text;

    switch (moodLabel) {
      case 'Fast and close':
        // Cheap and decent rating — avoid expensive places
        return [...places]
          .filter(p => getPrice(p) <= 2)
          .sort((a, b) => getRating(b) - getRating(a))
          .concat(places.filter(p => getPrice(p) > 2))
          .slice(0, 2);

      case 'Treat myself':
        // Highest rated, prefer expensive/notable places
        return [...places]
          .sort((a, b) => {
            const priceDiff = getPrice(b) - getPrice(a);
            const ratingDiff = getRating(b) - getRating(a);
            return priceDiff !== 0 ? priceDiff : ratingDiff;
          })
          .slice(0, 2);

      case 'Out with someone':
        // Highest rated with editorial summary preferred — notable places
        return [...places]
          .sort((a, b) => {
            if (hasDesc(a) && !hasDesc(b)) return -1;
            if (!hasDesc(a) && hasDesc(b)) return 1;
            return getRating(b) - getRating(a);
          })
          .slice(0, 2);

      case 'Just feed me':
      default:
        // Pure Google popularity — whatever comes first
        return places.slice(0, 2);
    }
  };

  const pickMood = async (m) => {
    setMood(m);
    setPlaces([]);
    setError('');
    setScreen('results');
    setLoading(true);
    try {
      const res = await fetch(`/api/places?lat=${coords.lat}&lng=${coords.lng}&mood=${encodeURIComponent(m.label)}`);
      const data = await res.json();
      if (!data.places?.length) {
        setError('No open restaurants found nearby. Try a different location.');
        setLoading(false);
        return;
      }
      const sorted = sortByMood(data.places, m.label);
      const top2 = sorted.slice(0, 2);
      const scoreArr = await Promise.all(top2.map(p => getScore(p.id)));
      const newVotes = {};
      top2.forEach((p, i) => { if (scoreArr[i]) newVotes[p.id] = scoreArr[i]; });
      setVotes(prev => ({ ...prev, ...newVotes }));
      setPlaces(top2);
    } catch { setError('Something went wrong. Please try again.'); }
    setLoading(false);
  };
  const goThere = (place) => {
    const q = encodeURIComponent(`${place.displayName?.text} ${place.shortFormattedAddress}`);
    window.open(`https://maps.google.com/search?q=${q}`, '_blank');
    let s = 2700;
    setCountdown(s);
    timerRef.current = setInterval(() => {
      s -= 1;
      setCountdown(s);
      if (s <= 0) {
        clearInterval(timerRef.current);
        setVoteTarget({ id: place.id, name: place.displayName?.text });
      }
    }, 1000);
  };

  const fmtCountdown = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const reset = () => {
    setScreen('mood');
    setPlaces([]);
    setMood(null);
    setError('');
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(null);
  };

  // ─── STYLES ───────────────────────────────────────────────
  const C = {
    bg: '#0D0D0D',
    surface: '#161616',
    border: '#1F1F1F',
    text: '#F5F0EB',
    muted: '#6B6460',
    accent: '#E8850A',
    accentDim: 'rgba(232,133,10,0.12)',
    green: '#22A05B',
    greenDim: 'rgba(34,160,91,0.12)',
    red: '#E05555',
  };

  const page = {
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column',
    background: C.bg,
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif',
    color: C.text,
    overflow: 'hidden',
    position: 'relative',
  };

  const header = {
    background: C.bg,
    borderBottom: `1px solid ${C.border}`,
    padding: '0 24px 16px',
    paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
    flexShrink: 0,
    textAlign: 'center',
  };

  const scroll = {
    flex: 1, overflowY: 'scroll',
    WebkitOverflowScrolling: 'touch',
    padding: '24px 20px',
  };

  const inner = { maxWidth: '420px', margin: '0 auto' };

  return (
    <div style={page}>

      {/* ── VOTE OVERLAY ── */}
      {voteTarget && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px 24px', maxWidth: '360px', width: '100%' }}>
            {!voteSubmitted ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '13px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>You just ate</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: C.text, marginBottom: '6px' }}>{voteTarget.name}</div>
                  <div style={{ fontSize: '14px', color: C.muted }}>Was it worth it?</div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => castVote(true)} style={{ flex: 1, background: C.greenDim, border: `1px solid ${C.green}`, color: C.green, borderRadius: '14px', padding: '16px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}>
                    Worth it
                  </button>
                  <button onClick={() => castVote(false)} style={{ flex: 1, background: 'rgba(224,85,85,0.08)', border: `1px solid ${C.red}`, color: C.red, borderRadius: '14px', padding: '16px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}>
                    Not quite
                  </button>
                </div>
                <div style={{ textAlign: 'center', fontSize: '11px', color: C.muted, marginTop: '14px' }}>
                  your vote updates the score for the next person
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '44px', marginBottom: '14px' }}>✓</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: C.text, marginBottom: '6px' }}>Logged</div>
                <div style={{ fontSize: '14px', color: C.muted }}>You helped the next person decide.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={header}>
        <div style={{ fontSize: '22px', fontWeight: '800', color: C.accent, letterSpacing: '-0.5px' }}>Bitten60</div>
        <div style={{ fontSize: '11px', color: C.muted, marginTop: '3px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>2 picks · someone was just there</div>
      </div>

      {/* ── COUNTDOWN BAR ── */}
      {countdown !== null && countdown > 0 && (
        <div style={{ background: C.accentDim, borderBottom: `1px solid ${C.border}`, padding: '10px 20px', textAlign: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '12px', color: C.accent, fontWeight: '600' }}>
            Vote opens in {fmtCountdown(countdown)} — keep this tab open
          </span>
        </div>
      )}

      {/* ── SCROLL AREA ── */}
      <div ref={scrollRef} style={scroll}>
        <div style={inner}>

          {/* LOCATION SCREEN */}
          {screen === 'location' && (
            <div>
              <div style={{ marginBottom: '32px', marginTop: '8px' }}>
                <div style={{ fontSize: '28px', fontWeight: '800', color: C.text, letterSpacing: '-0.5px', marginBottom: '8px', lineHeight: 1.2 }}>
                  Where are you?
                </div>
                <div style={{ fontSize: '15px', color: C.muted, lineHeight: 1.5 }}>
                  We'll find the best spots near you
                </div>
              </div>

              {locError && (
                <div style={{ background: 'rgba(224,85,85,0.08)', border: `1px solid ${C.red}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: C.red, lineHeight: 1.5 }}>
                  {locError}
                </div>
              )}

              <button
                onClick={detectGPS}
                disabled={locLoading}
                style={{ width: '100%', background: C.accent, color: '#fff', border: 'none', borderRadius: '14px', padding: '16px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginBottom: '12px', opacity: locLoading ? 0.7 : 1, transition: 'opacity 0.2s' }}
              >
                {locLoading ? 'Detecting...' : 'Use my current location'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
                <div style={{ flex: 1, height: '1px', background: C.border }} />
                <div style={{ fontSize: '12px', color: C.muted }}>or</div>
                <div style={{ flex: 1, height: '1px', background: C.border }} />
              </div>

              <input
                ref={inputRef}
                type="text"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && searchLocation()}
                placeholder="Culver City, Downtown LA..."
                style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '15px 16px', fontSize: '16px', color: C.text, outline: 'none', marginBottom: '10px', WebkitAppearance: 'none', boxSizing: 'border-box' }}
              />

              <button
                onClick={searchLocation}
                disabled={locLoading || !manualInput.trim()}
                style={{ width: '100%', background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '15px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: !manualInput.trim() ? 0.4 : 1, transition: 'opacity 0.2s' }}
              >
                Search this area
              </button>
            </div>
          )}

          {/* MOOD SCREEN */}
          {screen === 'mood' && (
            <div>
              <div style={{ marginBottom: '28px', marginTop: '8px' }}>
                <div style={{ fontSize: '13px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  Near {locationLabel}
                </div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: C.text, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                  What's the plan?
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {MOODS.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => pickMood(m)}
                    style={{
                      width: '100%',
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: '16px',
                      padding: '20px 22px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.15s, background 0.15s',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentDim; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface; }}
                  >
                    <div style={{ fontSize: '18px', fontWeight: '700', color: C.text, marginBottom: '4px', letterSpacing: '-0.2px' }}>{m.label}</div>
                    <div style={{ fontSize: '13px', color: C.muted }}>{m.sub}</div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setScreen('location')}
                style={{ width: '100%', background: 'transparent', color: C.muted, border: 'none', padding: '16px', fontSize: '13px', cursor: 'pointer', marginTop: '8px' }}
              >
                ← Change location
              </button>
            </div>
          )}

          {/* RESULTS SCREEN */}
          {screen === 'results' && (
            <div>
              {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
                  <div style={{ width: '28px', height: '28px', border: `2px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginBottom: '16px' }} />
                  <div style={{ fontSize: '14px', color: C.muted }}>Finding your 2 best spots...</div>
                </div>
              )}

              {error && !loading && (
                <div>
                  <div style={{ background: 'rgba(224,85,85,0.08)', border: `1px solid ${C.red}`, borderRadius: '14px', padding: '14px 16px', marginBottom: '16px', fontSize: '14px', color: C.red, lineHeight: 1.5 }}>
                    {error}
                  </div>
                  <button onClick={reset} style={{ width: '100%', background: C.accent, color: '#fff', border: 'none', borderRadius: '14px', padding: '15px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
                    Try again
                  </button>
                </div>
              )}

              {!loading && !error && places.length > 0 && (
                <div>
                  <div style={{ fontSize: '13px', color: C.muted, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Your 2 picks near {locationLabel}
                  </div>

                  {places.map((place, ri) => {
                    const isFirst = ri === 0;
                    const score = votes[place.id];
                    const name = place.displayName?.text || 'Restaurant';
                    const address = place.shortFormattedAddress || '';
                    const rating = place.rating;
                    const reviews = place.userRatingCount;
                    const price = PRICE[place.priceLevel] || '';
                    const summary = place.editorialSummary?.text || '';

                    return (
                      <div
                        key={place.id}
                        style={{
                          background: C.surface,
                          border: `1px solid ${isFirst ? C.accent : C.border}`,
                          borderRadius: '20px',
                          marginBottom: '12px',
                          overflow: 'hidden',
                          boxShadow: isFirst ? `0 0 0 1px ${C.accent}22, 0 4px 24px rgba(232,133,10,0.08)` : 'none',
                        }}
                      >
                        {isFirst && (
                          <div style={{ background: C.accent, padding: '6px 0', textAlign: 'center', fontSize: '10px', fontWeight: '800', color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            Top Pick
                          </div>
                        )}

                        <div style={{ padding: '20px' }}>

                          {/* Live vote badge */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: score ? C.green : C.border, flexShrink: 0 }} />
                            <span style={{ fontSize: '11px', fontWeight: '600', color: score ? C.green : C.muted, letterSpacing: '0.02em' }}>
                              {score ? `${score.pct}% worth it · voted ${score.freshness}` : 'Be the first to vote after visiting'}
                            </span>
                          </div>

                          {/* Name */}
                          <div style={{ fontSize: '22px', fontWeight: '800', color: C.text, letterSpacing: '-0.4px', marginBottom: '4px', lineHeight: 1.2 }}>
                            {name}
                          </div>

                          {/* Address */}
                          <div style={{ fontSize: '13px', color: C.muted, marginBottom: '16px', lineHeight: 1.4 }}>
                            {address}
                          </div>

                          {/* Summary */}
                          {summary && (
                            <div style={{ fontSize: '13px', color: '#8B8480', lineHeight: 1.6, marginBottom: '16px', fontStyle: 'italic' }}>
                              "{summary}"
                            </div>
                          )}

                          {/* Stats */}
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                            {[
                              { val: rating ? `${rating}★` : '—', sub: reviews ? `${reviews.toLocaleString()} reviews` : 'No reviews', color: C.accent },
                              { val: price || '—', sub: 'Price range', color: C.green },
                            ].map((st, si) => (
                              <div key={si} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '11px 14px', flex: 1 }}>
                                <div style={{ fontSize: '15px', fontWeight: '800', color: st.color, marginBottom: '2px' }}>{st.val}</div>
                                <div style={{ fontSize: '10px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{st.sub}</div>
                              </div>
                            ))}
                          </div>

                          {/* CTA */}
                          <button
                            onClick={() => goThere(place)}
                            style={{
                              width: '100%',
                              background: isFirst ? C.accent : 'transparent',
                              color: isFirst ? '#fff' : C.muted,
                              border: isFirst ? 'none' : `1px solid ${C.border}`,
                              borderRadius: '14px',
                              padding: '15px',
                              fontSize: '15px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              marginBottom: '12px',
                              letterSpacing: '-0.1px',
                              transition: 'opacity 0.15s',
                            }}
                          >
                            {isFirst ? 'Take me here' : 'Or go here instead'}
                          </button>

                          {place.internationalPhoneNumber && (
                            <a href={`tel:${place.internationalPhoneNumber}`} style={{ display: 'block', textAlign: 'center', fontSize: '12px', color: C.muted, textDecoration: 'none' }}>
                              {place.internationalPhoneNumber}
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <button
                    onClick={reset}
                    style={{ width: '100%', background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '14px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '4px' }}
                  >
                    Try a different vibe
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        button:active { opacity: 0.7 !important; transform: scale(0.98); }
        input::placeholder { color: #4A4440; }
        ::-webkit-scrollbar { display: none; }
        body { background: #0D0D0D; }
      `}</style>
    </div>
  );
}
