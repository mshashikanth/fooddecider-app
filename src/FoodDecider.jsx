import React, { useState, useRef, useEffect, useCallback } from 'react';

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

let supabase = null;
if (SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
  import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });
}

const FoodDecider = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [preferences, setPreferences] = useState({ vibe: null, cuisines: [], budget: null });
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [voteScreen, setVoteScreen] = useState(null);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [liveScores, setLiveScores] = useState({});
  const messagesEndRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const cuisineOptions = [
    { name: 'Tacos', type: 'mexican' },
    { name: 'Pizza', type: 'italian' },
    { name: 'Sushi', type: 'japanese' },
    { name: 'Burgers', type: 'american' },
    { name: 'Thai', type: 'thai' },
    { name: 'Indian', type: 'indian' },
  ];

  const restaurantDB = {
    mexican: [
      { id: 'cilantro-mexican-grill', name: 'Cilantro Mexican Grill', rating: 4.4, price: 1, specialty: 'carne asada burrito', waitTime: '5-10 min', phone: '(310) 558-4400', reviews: 812, vibe: 'quick', hours: '11 AM - 9 PM', neighborhood: 'Culver City' },
      { id: 'mas-malo', name: 'Mas Malo', rating: 4.5, price: 2, specialty: 'birria tacos', waitTime: '10-15 min', phone: '(310) 391-0800', reviews: 1243, vibe: 'comfort', hours: '11 AM - 10 PM', neighborhood: 'Culver City' },
      { id: 'hugos-tacos', name: "Hugo's Tacos", rating: 4.3, price: 1, specialty: 'veggie tacos', waitTime: '5 min', phone: '(310) 670-3500', reviews: 967, vibe: 'quick', hours: '10 AM - 9 PM', neighborhood: 'Culver City' },
    ],
    italian: [
      { id: 'tender-greens', name: 'Tender Greens', rating: 4.4, price: 2, specialty: 'roasted chicken plate', waitTime: '10 min', phone: '(310) 842-8300', reviews: 1876, vibe: 'comfort', hours: '11 AM - 9 PM', neighborhood: 'Culver City' },
      { id: 'il-capriccio', name: 'Il Capriccio', rating: 4.7, price: 3, specialty: 'house-made tagliatelle', waitTime: '20-30 min', phone: '(310) 208-5792', reviews: 521, vibe: 'upscale', hours: '5 PM - 10 PM', neighborhood: 'Westwood' },
      { id: 'rome-in-a-cup', name: 'Rome in a Cup', rating: 4.6, price: 1, specialty: 'authentic gelato', waitTime: '5 min', phone: '(310) 839-0000', reviews: 634, vibe: 'quick', hours: '10 AM - 10 PM', neighborhood: 'Culver City' },
    ],
    japanese: [
      { id: 'tsujita-la', name: 'Tsujita LA', rating: 4.7, price: 2, specialty: 'tsukemen ramen', waitTime: '20-30 min', phone: '(310) 231-7373', reviews: 3421, vibe: 'comfort', hours: '11 AM - 11 PM', neighborhood: 'Sawtelle' },
      { id: 'hide-sushi', name: 'Hide Sushi', rating: 4.6, price: 2, specialty: 'omakase nigiri', waitTime: '15-20 min', phone: '(310) 477-7242', reviews: 2134, vibe: 'comfort', hours: '11:30 AM - 10 PM', neighborhood: 'Sawtelle' },
      { id: 'hakata-ikkousha', name: 'Hakata Ikkousha', rating: 4.5, price: 2, specialty: 'tonkotsu ramen', waitTime: '15 min', phone: '(310) 914-1661', reviews: 987, vibe: 'quick', hours: '11 AM - 10 PM', neighborhood: 'West LA' },
    ],
    american: [
      { id: 'fathers-office', name: "Father's Office", rating: 4.4, price: 2, specialty: 'The Office Burger', waitTime: '10-20 min', phone: '(310) 736-2224', reviews: 5621, vibe: 'comfort', hours: '4 PM - 11 PM', neighborhood: 'Culver City' },
      { id: 'in-n-out-culver', name: 'In-N-Out Burger', rating: 4.5, price: 1, specialty: 'Double Double Animal Style', waitTime: '5-10 min', phone: '(800) 786-1000', reviews: 8934, vibe: 'quick', hours: '10:30 AM - 1 AM', neighborhood: 'Culver City' },
      { id: 'gourmet-grill', name: 'Gourmet Grill House', rating: 4.7, price: 3, specialty: 'wagyu burger', waitTime: '20-25 min', phone: '(310) 555-9202', reviews: 534, vibe: 'upscale', hours: '5 PM - 11 PM', neighborhood: 'Culver City' },
    ],
    thai: [
      { id: 'charm-thai', name: 'Charm Thai', rating: 4.6, price: 2, specialty: 'massaman curry', waitTime: '15-20 min', phone: '(310) 839-4222', reviews: 876, vibe: 'comfort', hours: '11 AM - 10 PM', neighborhood: 'Culver City' },
      { id: 'thai-dishes', name: 'Thai Dishes', rating: 4.4, price: 1, specialty: 'pad see ew', waitTime: '10 min', phone: '(323) 665-5900', reviews: 1243, vibe: 'quick', hours: '11 AM - 9:30 PM', neighborhood: 'Culver City' },
      { id: 'palms-thai', name: 'Palms Thai', rating: 4.3, price: 1, specialty: 'green curry', waitTime: '10 min', phone: '(323) 462-5073', reviews: 2341, vibe: 'quick', hours: '11 AM - 11 PM', neighborhood: 'Culver City' },
    ],
    indian: [
      { id: 'mayura', name: 'Mayura Indian Restaurant', rating: 4.7, price: 2, specialty: 'butter chicken', waitTime: '15 min', phone: '(310) 559-9644', reviews: 3421, vibe: 'comfort', hours: '11:30 AM - 10 PM', neighborhood: 'Culver City' },
      { id: 'india-sweets', name: 'India Sweets & Spices', rating: 4.6, price: 1, specialty: 'chana masala thali', waitTime: '5-10 min', phone: '(310) 837-5286', reviews: 2134, vibe: 'quick', hours: '11 AM - 9 PM', neighborhood: 'Culver City' },
      { id: 'akbar-restaurant', name: 'Akbar Restaurant', rating: 4.5, price: 2, specialty: 'lamb saag', waitTime: '15-20 min', phone: '(310) 586-7738', reviews: 1567, vibe: 'comfort', hours: '11:30 AM - 10 PM', neighborhood: 'Culver City' },
    ],
  };

  const fetchLiveScore = async (restaurantId) => {
    if (!supabase) return null;
    try {
      const { data } = await supabase.from('votes').select('worth_it, created_at').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(50);
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
        await supabase.from('votes').insert({ restaurant_id: voteScreen.restaurantId, dish_name: voteScreen.dish, worth_it: worthIt, created_at: new Date().toISOString() });
      } catch (e) { console.log(e); }
    }
    setVoteSubmitted(true);
    setTimeout(() => { setVoteScreen(null); setVoteSubmitted(false); }, 2500);
  };

  const addMessage = useCallback((type, content, component = null, data = null) => {
    setMessages(prev => [...prev, { type, content, component, data }]);
  }, []);

  useEffect(() => {
    if (!initialized) {
      addMessage('bot', "Hey! 👋 Let's find you the perfect spot to eat.");
      setTimeout(() => addMessage('bot', 'Where are you? (City or neighborhood)', 'location'), 800);
      setInitialized(true);
    }
  }, [initialized, addMessage]);

  useEffect(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  }, [messages]);

  const handleLocation = (loc) => {
    setUserLocation(loc);
    addMessage('user', loc);
    setTimeout(() => addMessage('bot', `Perfect! I know great spots in ${loc} 🎯\n\nWhat's your vibe?`, 'vibe'), 600);
  };

  const handleVibe = (vibe) => {
    setPreferences(p => ({ ...p, vibe }));
    const r = { 'Quick & Easy': 'Love it! Speed is key ⚡', Adventure: 'Bold choice! 🌟', Comfort: 'Cozy vibes! 🛋️', 'Treat Myself': 'You deserve it! 👑' };
    addMessage('bot', r[vibe]);
    setTimeout(() => addMessage('bot', 'What type of food sounds good?', 'cuisine'), 600);
  };

  const handleCuisine = (c) => {
    setPreferences(p => ({ ...p, cuisines: [c.type] }));
    addMessage('bot', `${c.name} — great choice!`);
    setTimeout(() => addMessage('bot', "What's your budget?", 'budget'), 600);
  };

  const handleBudget = (b) => {
    const currentVibe = preferences.vibe;
    const currentCuisine = preferences.cuisines[0] || 'american';
    setPreferences(p => ({ ...p, budget: b }));
    addMessage('bot', ['', 'Perfect! 💪', 'Nice! 👌', 'Premium! 🎩'][b]);
    setTimeout(() => {
      setIsLoading(true);
      addMessage('bot', 'Finding your 2 best spots... ✨');
      setTimeout(async () => {
        setIsLoading(false);
        const all = restaurantDB[currentCuisine];
        let filtered = all.filter(r => r.price === b);
        if (!filtered.length) filtered = all.filter(r => r.price <= b);
        if (!filtered.length) filtered = all;
        const vibeMap = { 'Quick & Easy': 'quick', Adventure: 'adventure', Comfort: 'comfort', 'Treat Myself': 'upscale' };
        const sorted = [...filtered].sort((a, c) => {
          if (a.vibe === vibeMap[currentVibe] && c.vibe !== vibeMap[currentVibe]) return -1;
          if (c.vibe === vibeMap[currentVibe] && a.vibe !== vibeMap[currentVibe]) return 1;
          return c.rating - a.rating;
        });
        const top2 = sorted.slice(0, 2);
        const scores = await Promise.all(top2.map(r => fetchLiveScore(r.id)));
        const newScores = {};
        top2.forEach((r, i) => { if (scores[i]) newScores[r.id] = scores[i]; });
        setLiveScores(prev => ({ ...prev, ...newScores }));
        addMessage('bot', '', 'result', { restaurants: top2, location: userLocation, liveScores: newScores });
      }, 1800);
    }, 500);
  };

  const handleGoThere = (restaurant) => {
    window.open(`https://maps.google.com/search?q=${encodeURIComponent(restaurant.name + ' ' + restaurant.neighborhood + ' Los Angeles CA')}`, '_blank');
    setTimeout(() => setVoteScreen({ restaurantId: restaurant.id, restaurantName: restaurant.name, dish: restaurant.specialty }), 3000);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    if (!userLocation) handleLocation(input.trim());
    setInput('');
    inputRef.current?.blur();
  };

  const card = { background: '#0F0F0F', border: '1px solid #1E1E1E', borderRadius: '16px', padding: '14px' };

  const RestaurantCard = ({ restaurant, msgScores, isFirst }) => {
    const score = msgScores?.[restaurant.id] || liveScores[restaurant.id];
    return (
      <div style={{ background: '#0F0F0F', border: `1px solid ${isFirst ? '#FF5C35' : '#1E1E1E'}`, borderRadius: '16px', marginBottom: '10px', overflow: 'hidden' }}>
        {isFirst && (
          <div style={{ background: '#FF5C35', padding: '5px 0', fontSize: '10px', fontWeight: '800', color: '#fff', letterSpacing: '0.1em', textAlign: 'center' }}>
            TOP PICK
          </div>
        )}
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: score ? '#22C55E' : '#2A2A2A', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', fontWeight: '700', color: score ? '#22C55E' : '#333' }}>
              {score ? `${score.pct}% worth it · voted ${score.freshness}` : 'be the first to vote after visiting'}
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '900', color: '#F0EDE8', letterSpacing: '-0.3px', marginBottom: '2px' }}>{restaurant.name}</div>
          <div style={{ fontSize: '12px', color: '#444', marginBottom: '12px' }}>📍 {restaurant.neighborhood} · 🕐 {restaurant.hours}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px', marginBottom: '12px' }}>
            {[
              { val: `${restaurant.rating}★`, sub: `${restaurant.reviews} reviews`, color: '#F59E0B' },
              { val: '$'.repeat(restaurant.price), sub: 'price', color: '#22C55E' },
              { val: restaurant.waitTime, sub: 'wait', color: '#60A5FA' },
            ].map((st, si) => (
              <div key={si} style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: '10px', padding: '10px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: st.color }}>{st.val}</div>
                <div style={{ fontSize: '9px', color: '#333', marginTop: '3px' }}>{st.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#141414', borderLeft: '2px solid #FF5C35', borderRadius: '0 10px 10px 0', padding: '10px 14px', marginBottom: '12px' }}>
            <div style={{ fontSize: '9px', color: '#FF5C35', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>must try</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#F0EDE8' }}>{restaurant.specialty}</div>
          </div>
          <button
            onClick={() => handleGoThere(restaurant)}
            style={{ width: '100%', background: isFirst ? '#FF5C35' : 'transparent', color: isFirst ? '#fff' : '#555', border: isFirst ? 'none' : '1px solid #2A2A2A', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', marginBottom: '10px', display: 'block' }}
          >
            {isFirst ? '🗺️ Take me here' : '🗺️ Or go here instead'}
          </button>
          <a href={`tel:${restaurant.phone}`} style={{ display: 'block', textAlign: 'center', fontSize: '12px', color: '#333', textDecoration: 'none' }}>
            📞 {restaurant.phone}
          </a>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#080808', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', color: '#F0EDE8', overflow: 'hidden' }}>

      {voteScreen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#0F0F0F', border: '1px solid #1E1E1E', borderRadius: '24px', padding: '28px 22px', maxWidth: '340px', width: '100%' }}>
            {!voteSubmitted ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '44px', marginBottom: '10px' }}>🍽️</div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: '#F0EDE8', marginBottom: '4px' }}>How was it?</div>
                  <div style={{ fontSize: '12px', color: '#444' }}>One tap · takes 2 seconds</div>
                </div>
                <div style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '12px 14px', marginBottom: '18px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '20px' }}>⚡</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#F0EDE8' }}>{voteScreen.dish}</div>
                    <div style={{ fontSize: '11px', color: '#444', marginTop: '2px' }}>{voteScreen.restaurantName}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => submitVote(true)} style={{ flex: 1, background: '#0D2B1A', border: '1px solid #22C55E', color: '#22C55E', borderRadius: '12px', padding: '15px', fontSize: '15px', fontWeight: '800', cursor: 'pointer' }}>✓ Worth it</button>
                  <button onClick={() => submitVote(false)} style={{ flex: 1, background: '#2B0D0D', border: '1px solid #EF4444', color: '#EF4444', borderRadius: '12px', padding: '15px', fontSize: '15px', fontWeight: '800', cursor: 'pointer' }}>✗ Not quite</button>
                </div>
                <div style={{ textAlign: 'center', fontSize: '10px', color: '#2A2A2A', marginTop: '12px' }}>your vote updates the score in real time</div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#F0EDE8', marginBottom: '6px' }}>Logged!</div>
                <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.6' }}>Score updated.<br />You helped the next person decide.</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ background: '#0F0F0F', borderBottom: '1px solid #1A1A1A', padding: '16px 20px 14px', textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: '26px', fontWeight: '900', color: '#FF5C35', letterSpacing: '-0.5px' }}>Bitten60</div>
        <div style={{ fontSize: '10px', color: '#333', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>2 picks · 60 seconds · someone was just there</div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'scroll', WebkitOverflowScrolling: 'touch', padding: '16px' }}>
        <div style={{ maxWidth: '460px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>

              {msg.type === 'user' && (
                <div style={{ alignSelf: 'flex-end', background: '#FF5C35', borderRadius: '16px 16px 4px 16px', padding: '11px 15px', fontSize: '15px', color: '#fff', fontWeight: '600', maxWidth: '80%' }}>
                  {msg.content}
                </div>
              )}

              {msg.type === 'bot' && !msg.component && msg.content && (
                <div style={{ alignSelf: 'flex-start', background: '#141414', border: '1px solid #1E1E1E', borderRadius: '16px 16px 16px 4px', padding: '11px 15px', fontSize: '15px', color: '#D0CCC8', maxWidth: '85%', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                  {msg.content}
                </div>
              )}

              {msg.component === 'location' && (
                <div style={card}>
                  <div style={{ fontSize: '15px', color: '#D0CCC8', marginBottom: '10px', lineHeight: '1.5' }}>{msg.content}</div>
                  <div style={{ background: '#141414', border: '1px solid #242424', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#555' }}>Type your city or neighborhood below</div>
                    <div style={{ fontSize: '11px', color: '#2A2A2A', marginTop: '4px' }}>"Culver City" · "Downtown LA" · "Brooklyn"</div>
                  </div>
                </div>
              )}

              {msg.component === 'vibe' && (
                <div style={card}>
                  <div style={{ fontSize: '15px', color: '#D0CCC8', marginBottom: '12px', whiteSpace: 'pre-line', lineHeight: '1.5' }}>{msg.content}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[{ name: 'Quick & Easy', emoji: '⚡' }, { name: 'Adventure', emoji: '🌟' }, { name: 'Comfort', emoji: '🛋️' }, { name: 'Treat Myself', emoji: '👑' }].map(v => (
                      <button key={v.name} onClick={() => handleVibe(v.name)} style={{ background: '#141414', border: '1px solid #242424', borderRadius: '12px', padding: '18px 10px', cursor: 'pointer', textAlign: 'center', WebkitTapHighlightColor: 'transparent' }}>
                        <div style={{ fontSize: '28px', marginBottom: '6px' }}>{v.emoji}</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#D0CCC8' }}>{v.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {msg.component === 'cuisine' && (
                <div style={card}>
                  <div style={{ fontSize: '15px', color: '#D0CCC8', marginBottom: '12px' }}>{msg.content}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                    {cuisineOptions.map(c => (
                      <button key={c.type} onClick={() => handleCuisine(c)} style={{ background: '#141414', border: '1px solid #242424', borderRadius: '12px', padding: '16px 8px', cursor: 'pointer', textAlign: 'center', WebkitTapHighlightColor: 'transparent', width: '100%' }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#D0CCC8' }}>{c.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {msg.component === 'budget' && (
                <div style={card}>
                  <div style={{ fontSize: '15px', color: '#D0CCC8', marginBottom: '12px' }}>{msg.content}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                    {[{ v: 1, l: 'Under $15', sym: '$' }, { v: 2, l: '$15–30', sym: '$$' }, { v: 3, l: '$30+', sym: '$$$' }].map(b => (
                      <button key={b.v} onClick={() => handleBudget(b.v)} style={{ background: '#141414', border: '1px solid #242424', borderRadius: '12px', padding: '20px 8px', cursor: 'pointer', textAlign: 'center', WebkitTapHighlightColor: 'transparent', width: '100%' }}>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: '#FF5C35', marginBottom: '4px' }}>{b.sym}</div>
                        <div style={{ fontSize: '11px', color: '#555' }}>{b.l}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {msg.component === 'result' && msg.data && (
                <div>
                  <div style={{ fontSize: '12px', color: '#444', marginBottom: '10px', textAlign: 'center' }}>your 2 picks in {msg.data.location}</div>
                  {msg.data.restaurants.map((restaurant, ri) => (
                    <RestaurantCard key={restaurant.id} restaurant={restaurant} msgScores={msg.data.liveScores} isFirst={ri === 0} />
                  ))}
                  <button
                    onClick={() => { setPreferences({ vibe: null, cuisines: [], budget: null }); addMessage('bot', "Let's find another 🎯", 'vibe'); }}
                    style={{ width: '100%', background: 'transparent', color: '#444', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '13px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', marginTop: '4px' }}
                  >
                    search again
                  </button>
                </div>
              )}

            </div>
          ))}

          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: '#0F0F0F', border: '1px solid #1E1E1E', borderRadius: '14px' }}>
              <div style={{ width: '16px', height: '16px', border: '2px solid #FF5C35', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#444' }}>Finding your 2 best spots...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div style={{ background: '#0F0F0F', borderTop: '1px solid #1A1A1A', padding: '12px 16px 28px', flexShrink: 0 }}>
        <div style={{ maxWidth: '460px', margin: '0 auto', display: 'flex', gap: '8px' }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder={!userLocation ? 'Type your location...' : 'Type a message...'}
            style={{ flex: 1, background: '#141414', border: '1px solid #242424', borderRadius: '12px', padding: '13px 16px', fontSize: '16px', color: '#F0EDE8', outline: 'none', WebkitAppearance: 'none' }}
          />
          <button
            onClick={handleSend}
            style={{ background: '#FF5C35', border: 'none', borderRadius: '12px', padding: '13px 18px', cursor: 'pointer', fontSize: '18px', color: '#fff', fontWeight: '700', WebkitTapHighlightColor: 'transparent', flexShrink: 0 }}
          >
            ➤
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: '10px', color: '#2A2A2A', marginTop: '8px', letterSpacing: '0.04em' }}>
          2 picks · 60 seconds · someone was just there
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        button:active { opacity: 0.75; }
        input::placeholder { color: #333; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default FoodDecider;
