import React, { useState, useRef, useEffect } from 'react';

// ─── PASTE YOUR SUPABASE CREDENTIALS HERE ───────────────
const SUPABASE_URL = 'https://wunsqyznjgzxqsrftati.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UM0QONA5Et7ZZNikpE3S-g_9eUrYh2z';
// ────────────────────────────────────────────────────────

let supabase = null;
if (SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
  import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });
}

// ─── TIME-AWARE MOODS ───────────────────────────────────
const getMoods = () => {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 11) {
    return [
      { label: 'Quick breakfast', sub: 'Fast and nearby' },
      { label: 'Sit down and eat', sub: 'Take your time' },
      { label: 'Coffee and something', sub: 'Light and easy' },
      { label: 'Just feed me', sub: 'Anything open' },
    ];
  }
  if (hour >= 11 && hour < 15) {
    return [
      { label: 'Fast and close', sub: 'Back before you know it' },
      { label: 'Treat myself', sub: 'Worth the splurge' },
      { label: 'Out with someone', sub: 'Good for two or more' },
      { label: 'Just feed me', sub: 'Anything nearby' },
    ];
  }
  if (hour >= 15 && hour < 22) {
    return [
      { label: 'Fast and close', sub: 'Quick and done' },
      { label: 'Treat myself', sub: 'Make it special' },
      { label: 'Out with someone', sub: 'Good for two or more' },
      { label: 'Just feed me', sub: 'Anything nearby' },
    ];
  }
  // Late night 10pm - 6am
  return [
    { label: 'Fast and close', sub: 'Quick and done' },
    { label: 'Something open now', sub: 'Still serving' },
    { label: 'Late night spot', sub: 'Open late' },
    { label: 'Just feed me', sub: 'Anything open' },
  ];
};

const PRICE_LABEL = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
};

const C = {
  bg: '#0D0D0D',
  surface: '#161616',
  surfaceHover: '#1C1C1C',
  border: '#242424',
  text: '#F5F0EB',
  muted: '#5C5856',
  mutedLight: '#8A8480',
  accent: '#E8850A',
  accentDim: 'rgba(232,133,10,0.1)',
  accentBorder: 'rgba(232,133,10,0.3)',
  green: '#22A05B',
  greenDim: 'rgba(34,160,91,0.1)',
  greenBorder: 'rgba(34,160,91,0.3)',
  red: '#E05555',
  redDim: 'rgba(224,85,85,0.08)',
  redBorder: 'rgba(224,85,85,0.25)',
};

export default function FoodDecider() {
  const [screen, setScreen] = useState('location');
  const [locationLabel, setLocationLabel] = useState('');
  const [coords, setCoords] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [moods] = useState(getMoods);
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

  // ─── SUPABASE ───────────────────────────────────────────
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
    setTimeout(() => {
      setVoteTarget(null);
      setVoteSubmitted(false);
      setCountdown(null);
    }, 2500);
  };

  // ─── LOCATION ──────────────────────────────────────────
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
      () => {
        setLocLoading(false);
        setLocError('Could not detect location. Type your neighborhood below.');
      },
      { timeout: 10000 }
    );
  };

  const searchLocation = async () => {
    if (!manualInput.trim()) return;
    setLocLoading(true);
    setLocError('');
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(manualInput)}`);
      const data = await res.json();
      if (data.error) {
        setLocError('Location not found. Try again.');
      } else {
        setCoords({ lat: data.lat, lng: data.lng });
        setLocationLabel(data.label || manualInput);
        setScreen('mood');
      }
    } catch {
      setLocError('Could not find location. Try again.');
    }
    setLocLoading(false);
  };

  // ─── MOOD SELECTION ────────────────────────────────────
  const pickMood = async (mood) => {
    setPlaces([]);
    setError('');
    setScreen('results');
    setLoading(true);

    try {
      const hour = new Date().getHours();
      const res = await fetch(
        `/api/places?lat=${coords.lat}&lng=${coords.lng}&mood=${encodeURIComponent(mood.label)}&hour=${hour}`
      );
      const data = await res.json();

      if (data.error) {
        setError('Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      if (!data.places?.length) {
        setError('No open restaurants found nearby. Try a different vibe or location.');
        setLoading(false);
        return;
      }

      const top2 = data.places.slice(0, 2);
      const scoreArr = await Promise.all(top2.map(p => getScore(p.id)));
      const newVotes = {};
      top2.forEach((p, i) => { if (scoreArr[i]) newVotes[p.id] = scoreArr[i]; });
      setVotes(prev => ({ ...prev, ...newVotes }));
      setPlaces(top2);
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  // ─── GO THERE ──────────────────────────────────────────
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

  const fmtCountdown = (s) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const reset = () => {
    setScreen('mood');
    setPlaces([]);
    setError('');
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(null);
  };

  // ─── TIME GREETING ─────────────────────────────────────
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 6 && h < 11) return 'Good morning';
    if (h >= 11 && h < 15) return 'Good afternoon';
    if (h >= 15 && h < 22) return 'Good evening';
    return 'Still hungry?';
  };

  // ─── RENDER ────────────────────────────────────────────
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: C.bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif',
      color: C.text,
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* ── VOTE OVERLAY ── */}
      {voteTarget && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.9)',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '24px',
            padding: '32px 24px',
            maxWidth: '360px',
            width: '100%',
          }}>
            {!voteSubmitted ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{
                    fontSize: '11px', color: C.muted,
                    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px',
                  }}>
                    You just ate at
                  </div>
                  <div style={{
                    fontSize: '22px', fontWeight: '800',
                    color: C.text, letterSpacing: '-0.4px', marginBottom: '8px',
                  }}>
                    {voteTarget.name}
                  </div>
                  <div style={{ fontSize: '14px', color: C.mutedLight }}>
                    Was it worth it?
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <button
                    onClick={() => castVote(true)}
                    style={{
                      flex: 1, background: C.greenDim,
                      border: `1px solid ${C.greenBorder}`,
                      color: C.green, borderRadius: '14px',
                      padding: '16px', fontSize: '15px',
                      fontWeight: '700', cursor: 'pointer',
                    }}
                  >
                    Worth it
                  </button>
                  <button
                    onClick={() => castVote(false)}
                    style={{
                      flex: 1, background: C.redDim,
                      border: `1px solid ${C.redBorder}`,
                      color: C.red, borderRadius: '14px',
                      padding: '16px', fontSize: '15px',
                      fontWeight: '700', cursor: 'pointer',
                    }}
                  >
                    Not quite
                  </button>
                </div>

                <div style={{
                  textAlign: 'center', fontSize: '11px',
                  color: C.muted, lineHeight: 1.6,
                }}>
                  Your vote updates the score for the next person
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{
                  width: '48px', height: '48px',
                  background: C.greenDim,
                  border: `1px solid ${C.greenBorder}`,
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: '22px',
                }}>✓</div>
                <div style={{
                  fontSize: '20px', fontWeight: '800',
                  color: C.text, marginBottom: '6px',
                }}>
                  Logged
                </div>
                <div style={{ fontSize: '14px', color: C.mutedLight }}>
                  You helped the next person decide.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{
        background: C.bg,
        borderBottom: `1px solid ${C.border}`,
        padding: '0 24px 14px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)',
        flexShrink: 0,
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '20px', fontWeight: '900',
          color: C.accent, letterSpacing: '-0.3px',
        }}>
          Bitten60
        </div>
        <div style={{
          fontSize: '10px', color: C.muted,
          marginTop: '2px', letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          2 picks · someone was just there
        </div>
      </div>

      {/* ── COUNTDOWN ── */}
      {countdown !== null && countdown > 0 && (
        <div style={{
          background: C.accentDim,
          borderBottom: `1px solid ${C.accentBorder}`,
          padding: '10px 20px',
          textAlign: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '12px', color: C.accent, fontWeight: '600' }}>
            Come back in {fmtCountdown(countdown)} to vote
          </span>
        </div>
      )}

      {/* ── SCROLL AREA ── */}
      <div ref={scrollRef} style={{
        flex: 1,
        overflowY: 'scroll',
        WebkitOverflowScrolling: 'touch',
        padding: '24px 20px',
      }}>
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>

          {/* ── LOCATION SCREEN ── */}
          {screen === 'location' && (
            <div>
              <div style={{ marginBottom: '32px', marginTop: '4px' }}>
                <div style={{
                  fontSize: '26px', fontWeight: '800',
                  color: C.text, letterSpacing: '-0.5px',
                  marginBottom: '8px', lineHeight: 1.2,
                }}>
                  Where are you?
                </div>
                <div style={{ fontSize: '14px', color: C.mutedLight, lineHeight: 1.5 }}>
                  We'll find the best spots near you
                </div>
              </div>

              {locError && (
                <div style={{
                  background: C.redDim,
                  border: `1px solid ${C.redBorder}`,
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: C.red,
                  lineHeight: 1.5,
                }}>
                  {locError}
                </div>
              )}

              <button
                onClick={detectGPS}
                disabled={locLoading}
                style={{
                  width: '100%',
                  background: C.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '16px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: locLoading ? 'not-allowed' : 'pointer',
                  marginBottom: '12px',
                  opacity: locLoading ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                  letterSpacing: '-0.1px',
                }}
              >
                {locLoading ? 'Detecting...' : 'Use my current location'}
              </button>

              <div style={{
                display: 'flex', alignItems: 'center',
                gap: '12px', margin: '20px 0',
              }}>
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
                style={{
                  width: '100%',
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: '14px',
                  padding: '15px 16px',
                  fontSize: '16px',
                  color: C.text,
                  outline: 'none',
                  marginBottom: '10px',
                  WebkitAppearance: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e => e.target.style.borderColor = C.border}
              />

              <button
                onClick={searchLocation}
                disabled={locLoading || !manualInput.trim()}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: manualInput.trim() ? C.mutedLight : C.muted,
                  border: `1px solid ${C.border}`,
                  borderRadius: '14px',
                  padding: '15px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: manualInput.trim() ? 'pointer' : 'not-allowed',
                  opacity: !manualInput.trim() ? 0.4 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {locLoading ? 'Searching...' : 'Search this area'}
              </button>
            </div>
          )}

          {/* ── MOOD SCREEN ── */}
          {screen === 'mood' && (
            <div>
              <div style={{ marginBottom: '28px', marginTop: '4px' }}>
                <div style={{
                  fontSize: '12px', color: C.muted,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  marginBottom: '6px',
                }}>
                  {getGreeting()}
                </div>
                <div style={{
                  fontSize: '26px', fontWeight: '800',
                  color: C.text, letterSpacing: '-0.5px', lineHeight: 1.2,
                }}>
                  What's the plan?
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {moods.map((m, i) => (
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
                      WebkitTapHighlightColor: 'transparent',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onTouchStart={e => {
                      e.currentTarget.style.borderColor = C.accent;
                      e.currentTarget.style.background = C.accentDim;
                    }}
                    onTouchEnd={e => {
                      e.currentTarget.style.borderColor = C.border;
                      e.currentTarget.style.background = C.surface;
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = C.accent;
                      e.currentTarget.style.background = C.accentDim;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = C.border;
                      e.currentTarget.style.background = C.surface;
                    }}
                  >
                    <div style={{
                      fontSize: '17px', fontWeight: '700',
                      color: C.text, marginBottom: '3px',
                      letterSpacing: '-0.2px',
                    }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: '13px', color: C.muted }}>
                      {m.sub}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setScreen('location')}
                style={{
                  width: '100%', background: 'transparent',
                  color: C.muted, border: 'none',
                  padding: '16px', fontSize: '13px',
                  cursor: 'pointer', marginTop: '8px',
                }}
              >
                ← Change location
              </button>
            </div>
          )}

          {/* ── RESULTS SCREEN ── */}
          {screen === 'results' && (
            <div>
              {loading && (
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '60px 0',
                }}>
                  <div style={{
                    width: '24px', height: '24px',
                    border: `2px solid ${C.border}`,
                    borderTopColor: C.accent,
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                    marginBottom: '14px',
                  }} />
                  <div style={{ fontSize: '14px', color: C.muted }}>
                    Finding your 2 best spots...
                  </div>
                </div>
              )}

              {error && !loading && (
                <div>
                  <div style={{
                    background: C.redDim,
                    border: `1px solid ${C.redBorder}`,
                    borderRadius: '14px',
                    padding: '14px 16px',
                    marginBottom: '16px',
                    fontSize: '14px',
                    color: C.red,
                    lineHeight: 1.5,
                  }}>
                    {error}
                  </div>
                  <button
                    onClick={reset}
                    style={{
                      width: '100%', background: C.accent,
                      color: '#fff', border: 'none',
                      borderRadius: '14px', padding: '15px',
                      fontSize: '15px', fontWeight: '700', cursor: 'pointer',
                    }}
                  >
                    Try a different vibe
                  </button>
                </div>
              )}

              {!loading && !error && places.length > 0 && (
                <div>
                  <div style={{
                    fontSize: '11px', color: C.muted,
                    marginBottom: '16px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}>
                    Your 2 picks · {locationLabel}
                  </div>

                  {places.map((place, ri) => {
                    const isFirst = ri === 0;
                    const score = votes[place.id];
                    const name = place.displayName?.text || 'Restaurant';
                    const address = place.shortFormattedAddress || '';
                    const rating = place.rating;
                    const reviews = place.userRatingCount;
                    const price = PRICE_LABEL[place.priceLevel] || '';
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
                          boxShadow: isFirst
                            ? `0 0 0 1px rgba(232,133,10,0.15), 0 4px 20px rgba(232,133,10,0.06)`
                            : 'none',
                        }}
                      >
                        {isFirst && (
                          <div style={{
                            background: C.accent,
                            padding: '6px 0',
                            textAlign: 'center',
                            fontSize: '10px',
                            fontWeight: '800',
                            color: '#fff',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                          }}>
                            Top Pick
                          </div>
                        )}

                        <div style={{ padding: '20px' }}>

                          {/* Live vote badge */}
                          <div style={{
                            display: 'flex', alignItems: 'center',
                            gap: '7px', marginBottom: '14px',
                          }}>
                            <div style={{
                              width: '6px', height: '6px',
                              borderRadius: '50%',
                              background: score ? C.green : C.border,
                              flexShrink: 0,
                            }} />
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              color: score ? C.green : C.muted,
                              letterSpacing: '0.02em',
                            }}>
                              {score
                                ? `${score.pct}% worth it · voted ${score.freshness}`
                                : 'Be the first to vote after visiting'}
                            </span>
                          </div>

                          {/* Name */}
                          <div style={{
                            fontSize: '22px', fontWeight: '800',
                            color: C.text, letterSpacing: '-0.4px',
                            marginBottom: '4px', lineHeight: 1.2,
                          }}>
                            {name}
                          </div>

                          {/* Address */}
                          <div style={{
                            fontSize: '13px', color: C.muted,
                            marginBottom: summary ? '12px' : '16px',
                            lineHeight: 1.4,
                          }}>
                            {address}
                          </div>

                          {/* Summary */}
                          {summary && (
                            <div style={{
                              fontSize: '13px', color: C.mutedLight,
                              lineHeight: 1.6, marginBottom: '16px',
                              fontStyle: 'italic',
                              borderLeft: `2px solid ${C.border}`,
                              paddingLeft: '12px',
                            }}>
                              {summary}
                            </div>
                          )}

                          {/* Stats */}
                          <div style={{
                            display: 'flex', gap: '8px',
                            marginBottom: '20px',
                          }}>
                            {[
                              {
                                val: rating ? `${rating}★` : '—',
                                sub: reviews ? `${reviews.toLocaleString()} reviews` : 'No reviews',
                                color: C.accent,
                              },
                              {
                                val: price || '—',
                                sub: 'Price',
                                color: C.green,
                              },
                            ].map((st, si) => (
                              <div key={si} style={{
                                background: C.bg,
                                border: `1px solid ${C.border}`,
                                borderRadius: '12px',
                                padding: '11px 14px',
                                flex: 1,
                              }}>
                                <div style={{
                                  fontSize: '16px', fontWeight: '800',
                                  color: st.color, marginBottom: '2px',
                                }}>
                                  {st.val}
                                </div>
                                <div style={{
                                  fontSize: '10px', color: C.muted,
                                  textTransform: 'uppercase', letterSpacing: '0.06em',
                                }}>
                                  {st.sub}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* CTA Button */}
                          <button
                            onClick={() => goThere(place)}
                            style={{
                              width: '100%',
                              background: isFirst ? C.accent : 'transparent',
                              color: isFirst ? '#fff' : C.mutedLight,
                              border: isFirst ? 'none' : `1px solid ${C.border}`,
                              borderRadius: '14px',
                              padding: '15px',
                              fontSize: '15px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              marginBottom: place.internationalPhoneNumber ? '12px' : '0',
                              letterSpacing: '-0.1px',
                              transition: 'opacity 0.15s',
                            }}
                          >
                            {isFirst ? 'Take me here' : 'Or go here instead'}
                          </button>

                          {place.internationalPhoneNumber && (
                            
                              href={`tel:${place.internationalPhoneNumber}`}
                              style={{
                                display: 'block',
                                textAlign: 'center',
                                fontSize: '12px',
                                color: C.muted,
                                textDecoration: 'none',
                              }}
                            >
                              {place.internationalPhoneNumber}
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <button
                    onClick={reset}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      color: C.muted,
                      border: `1px solid ${C.border}`,
                      borderRadius: '14px',
                      padding: '14px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      marginTop: '4px',
                    }}
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
        button:active { opacity: 0.7 !important; transform: scale(0.97); }
        input::placeholder { color: #3A3836; }
        ::-webkit-scrollbar { display: none; }
        body { background: #0D0D0D; }
      `}</style>
    </div>
  );
}
