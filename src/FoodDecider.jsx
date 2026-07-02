import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ThumbsUp, MapPin, Star, DollarSign, Clock, Navigation, Phone, Zap } from 'lucide-react';

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
  const resultRef = useRef(null);

  const cuisineOptions = [
    { name: 'Tacos', emoji: '🌮', type: 'mexican' },
    { name: 'Pizza', emoji: '🍕', type: 'italian' },
    { name: 'Sushi', emoji: '🍣', type: 'japanese' },
    { name: 'Burgers', emoji: '🍔', type: 'american' },
    { name: 'Thai', emoji: '🍜', type: 'thai' },
    { name: 'Indian', emoji: '🍛', type: 'indian' },
  ];

  const restaurantDB = {
    mexican: [
      { id: 'street-taco-stand', name: 'Street Taco Stand', rating: 4.3, price: 1, specialty: 'authentic street tacos', waitTime: '5-10 min', address: '456 Main St', phone: '(555) 111-2222', reviews: 523, vibe: 'quick', hours: '11 AM - 9 PM', neighborhood: 'Downtown' },
      { id: 'taco-libre', name: 'Taco Libre', rating: 4.8, price: 2, specialty: 'birria tacos', waitTime: '10-15 min', address: '234 Mission St', phone: '(555) 234-5678', reviews: 847, vibe: 'comfort', hours: '11 AM - 10 PM', neighborhood: 'Mission District' },
      { id: 'casa-de-oro', name: 'Casa de Oro', rating: 4.7, price: 3, specialty: 'molcajete mixto', waitTime: '25-30 min', address: '789 Sunset Blvd', phone: '(555) 333-4444', reviews: 612, vibe: 'upscale', hours: '5 PM - 11 PM', neighborhood: 'Uptown' },
    ],
    italian: [
      { id: 'quick-slice', name: 'Quick Slice Pizza', rating: 4.2, price: 1, specialty: 'pepperoni slices', waitTime: '5 min', address: '321 Oak Ave', phone: '(555) 555-6666', reviews: 734, vibe: 'quick', hours: '10 AM - 11 PM', neighborhood: 'Downtown' },
      { id: 'tonys-pizza', name: "Tony's Pizza House", rating: 4.4, price: 2, specialty: 'NY-style pizza', waitTime: '10-15 min', address: '123 Broadway', phone: '(555) 678-9012', reviews: 956, vibe: 'comfort', hours: '11 AM - 10 PM', neighborhood: 'Midtown' },
      { id: 'bella-trattoria', name: 'Bella Trattoria', rating: 4.6, price: 3, specialty: 'homemade pasta', waitTime: '30-40 min', address: '567 Pine St', phone: '(555) 777-8888', reviews: 421, vibe: 'upscale', hours: '5 PM - 11 PM', neighborhood: 'Italian Quarter' },
    ],
    japanese: [
      { id: 'sushi-express', name: 'Sushi Express', rating: 4.1, price: 1, specialty: 'california rolls', waitTime: '10 min', address: '234 Elm St', phone: '(555) 999-0000', reviews: 645, vibe: 'quick', hours: '11 AM - 9 PM', neighborhood: 'Downtown' },
      { id: 'ramen-station', name: 'Ramen Station', rating: 4.6, price: 2, specialty: 'tonkotsu ramen', waitTime: '15-20 min', address: '678 Post St', phone: '(555) 901-2345', reviews: 1089, vibe: 'comfort', hours: '11 AM - 10 PM', neighborhood: 'Japantown' },
      { id: 'sakura-omakase', name: 'Sakura Omakase', rating: 4.8, price: 3, specialty: "chef's omakase", waitTime: '45-60 min', address: '890 Cherry Ln', phone: '(555) 121-3141', reviews: 387, vibe: 'upscale', hours: '6 PM - 11 PM', neighborhood: 'Financial District' },
    ],
    american: [
      { id: 'fast-burger', name: 'Fast Burger Shack', rating: 4.0, price: 1, specialty: 'classic cheeseburger', waitTime: '8 min', address: '123 First St', phone: '(555) 151-6171', reviews: 892, vibe: 'quick', hours: '10 AM - 10 PM', neighborhood: 'Downtown' },
      { id: 'burger-joint', name: 'The Burger Joint', rating: 4.5, price: 2, specialty: 'signature burgers', waitTime: '10-15 min', address: '890 Polk St', phone: '(555) 123-4567', reviews: 1432, vibe: 'comfort', hours: '11 AM - 10 PM', neighborhood: 'Castro' },
      { id: 'gourmet-grill', name: 'Gourmet Grill House', rating: 4.7, price: 3, specialty: 'wagyu burger', waitTime: '20-25 min', address: '456 Market St', phone: '(555) 181-9202', reviews: 534, vibe: 'upscale', hours: '5 PM - 11 PM', neighborhood: 'SoMa' },
    ],
    thai: [
      { id: 'thai-quick', name: 'Thai Quick Bites', rating: 4.2, price: 1, specialty: 'pad thai', waitTime: '10 min', address: '789 Oak St', phone: '(555) 222-3333', reviews: 567, vibe: 'quick', hours: '11 AM - 9 PM', neighborhood: 'Chinatown' },
      { id: 'thai-basil', name: 'Thai Basil', rating: 4.6, price: 2, specialty: 'green curry', waitTime: '15-20 min', address: '345 Market St', phone: '(555) 444-5555', reviews: 823, vibe: 'comfort', hours: '11 AM - 10 PM', neighborhood: 'Midtown' },
      { id: 'royal-thai', name: 'Royal Thai Cuisine', rating: 4.8, price: 3, specialty: 'royal platter', waitTime: '30-40 min', address: '567 Union St', phone: '(555) 666-7777', reviews: 445, vibe: 'upscale', hours: '5 PM - 10 PM', neighborhood: 'Nob Hill' },
    ],
    indian: [
      { id: 'curry-express', name: 'Curry Express', rating: 4.1, price: 1, specialty: 'chicken tikka masala', waitTime: '10 min', address: '234 Mission St', phone: '(555) 888-9999', reviews: 456, vibe: 'quick', hours: '11 AM - 9 PM', neighborhood: 'Downtown' },
      { id: 'curry-house', name: 'Curry House', rating: 4.5, price: 2, specialty: 'butter chicken', waitTime: '20-25 min', address: '567 Divisadero St', phone: '(555) 678-9012', reviews: 634, vibe: 'comfort', hours: '11 AM - 10 PM', neighborhood: 'Haight' },
      { id: 'tandoor-palace', name: 'Tandoor Palace', rating: 4.7, price: 3, specialty: 'tandoori platter', waitTime: '25-30 min', address: '890 Union St', phone: '(555) 789-0123', reviews: 445, vibe: 'upscale', hours: '5 PM - 11 PM', neighborhood: 'Marina' },
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
    if (messages.length > 0 && messages[messages.length - 1].component === 'result') {
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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
    addMessage('bot', `${c.emoji} ${c.name}! Great choice!`);
    setTimeout(() => addMessage('bot', "What's your budget?", 'budget'), 600);
  };

  const handleBudget = (b) => {
    const currentVibe = preferences.vibe;
    setPreferences(p => ({ ...p, budget: b }));
    addMessage('bot', ['', 'Perfect! 💪', 'Nice! 👌', 'Premium! 🎩'][b]);
    setTimeout(() => {
      setIsLoading(true);
      addMessage('bot', 'Finding your spot... ✨');
      setTimeout(async () => {
        setIsLoading(false);
        const cuisineType = preferences.cuisines[0] || 'mexican';
        const all = restaurantDB[cuisineType];
        let filtered = all.filter(r => r.price === b);
        if (!filtered.length) filtered = all.filter(r => r.price <= b);
        if (!filtered.length) filtered = all;
        const vibeMap = { 'Quick & Easy': 'quick', Adventure: 'adventure', Comfort: 'comfort', 'Treat Myself': 'upscale' };
        let restaurant = filtered.find(r => r.vibe === vibeMap[currentVibe]) || filtered.sort((a, c) => c.rating - a.rating)[0];
        const reasons = {
          'Quick & Easy': `You wanted quick — ${restaurant.name} has super fast service (${restaurant.waitTime}) and great food.`,
          Adventure: `For your adventurous spirit — ${restaurant.name} is rated ${restaurant.rating}⭐ and their ${restaurant.specialty} is legendary.`,
          Comfort: `Perfect comfort vibes — ${restaurant.name}'s ${restaurant.specialty} is exactly what you need right now.`,
          'Treat Myself': `You deserve this — ${restaurant.name} is a premium spot. Their ${restaurant.specialty} is something special.`,
        };
        let reasoning = reasons[currentVibe] || `${restaurant.name} matches your vibe perfectly.`;
        if (b === 1) reasoning += ' Great value.';
        if (b === 3) reasoning += ' Worth the splurge.';
        const liveScore = await fetchLiveScore(restaurant.id);
        if (liveScore) setLiveScores(prev => ({ ...prev, [restaurant.id]: liveScore }));
        addMessage('bot', '', 'result', { restaurant, reasoning, location: userLocation, liveScore });
      }, 1800);
    }, 500);
  };

  const handleGoThere = (restaurant) => {
    window.open(`https://maps.google.com/?q=${encodeURIComponent(restaurant.name + ' ' + restaurant.address)}`, '_blank');
    setTimeout(() => setVoteScreen({ restaurantId: restaurant.id, restaurantName: restaurant.name, dish: restaurant.specialty }), 3000);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    if (!userLocation) handleLocation(input.trim());
    setInput('');
  };

  const s = {
    page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#080808', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', color: '#F0EDE8' },
    header: { background: '#0F0F0F', borderBottom: '1px solid #1A1A1A', padding: '18px 20px', textAlign: 'center', flexShrink: 0 },
    headerTitle: { fontSize: '26px', fontWeight: '900', color: '#FF5C35', letterSpacing: '-0.5px', margin: 0 },
    headerSub: { fontSize: '11px', color: '#333', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.08em' },
    messages: { flex: 1, overflowY: 'auto', padding: '16px' },
    inner: { maxWidth: '460px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px' },
    botBubble: { background: '#141414', border: '1px solid #1E1E1E', borderRadius: '16px 16px 16px 4px', padding: '12px 16px', fontSize: '14px', color: '#D0CCC8', maxWidth: '85%', whiteSpace: 'pre-line', lineHeight: '1.5' },
    userBubble: { background: '#FF5C35', borderRadius: '16px 16px 4px 16px', padding: '12px 16px', fontSize: '14px', color: '#fff', fontWeight: '600', maxWidth: '80%', alignSelf: 'flex-end' },
    card: { background: '#0F0F0F', border: '1px solid #1E1E1E', borderRadius: '16px', padding: '16px' },
    cardTitle: { fontSize: '14px', color: '#D0CCC8', marginBottom: '12px', lineHeight: '1.5', whiteSpace: 'pre-line' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
    vibeBtn: { background: '#141414', border: '1px solid #242424', borderRadius: '12px', padding: '16px 10px', cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.15s' },
    cuisineBtn: { background: '#141414', border: '1px solid #242424', borderRadius: '12px', padding: '14px 8px', cursor: 'pointer', textAlign: 'center' },
    budgetBtn: { background: '#141414', border: '1px solid #242424', borderRadius: '12px', padding: '18px 8px', cursor: 'pointer', textAlign: 'center' },
    input: { background: '#0F0F0F', borderTop: '1px solid #1A1A1A', padding: '14px 16px', flexShrink: 0 },
    inputRow: { maxWidth: '460px', margin: '0 auto', display: 'flex', gap: '8px' },
    inputField: { flex: 1, background: '#141414', border: '1px solid #242424', borderRadius: '12px', padding: '13px 16px', fontSize: '14px', color: '#F0EDE8', outline: 'none' },
    sendBtn: { background: '#FF5C35', border: 'none', borderRadius: '12px', padding: '13px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    inputHint: { textAlign: 'center', fontSize: '11px', color: '#2A2A2A', marginTop: '8px', letterSpacing: '0.04em' },
    overlay: { position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
    voteCard: { background: '#0F0F0F', border: '1px solid #1E1E1E', borderRadius: '24px', padding: '28px 22px', maxWidth: '340px', width: '100%' },
    voteTitle: { fontSize: '22px', fontWeight: '900', color: '#F0EDE8', textAlign: 'center', marginBottom: '6px' },
    voteSub: { fontSize: '12px', color: '#444', textAlign: 'center', marginBottom: '20px' },
    voteDish: { background: '#141414', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '12px 14px', marginBottom: '18px', display: 'flex', gap: '10px', alignItems: 'center' },
    voteButtons: { display: 'flex', gap: '10px' },
    worthItBtn: { flex: 1, background: '#0D2B1A', border: '1px solid #22C55E', color: '#22C55E', borderRadius: '12px', padding: '15px', fontSize: '15px', fontWeight: '800', cursor: 'pointer' },
    notQuiteBtn: { flex: 1, background: '#2B0D0D', border: '1px solid #EF4444', color: '#EF4444', borderRadius: '12px', padding: '15px', fontSize: '15px', fontWeight: '800', cursor: 'pointer' },
  };

  return (
    <div style={s.page}>

      {voteScreen && (
        <div style={s.overlay}>
          <div style={s.voteCard}>
            {!voteSubmitted ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '6px', fontSize: '40px' }}>🍽️</div>
                <div style={s.voteTitle}>How was it?</div>
                <div style={s.voteSub}>One tap · takes 2 seconds</div>
                <div style={s.voteDish}>
                  <span style={{ fontSize: '20px' }}>⚡</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#F0EDE8' }}>{voteScreen.dish}</div>
                    <div style={{ fontSize: '12px', color: '#444', marginTop: '2px' }}>{voteScreen.restaurantName}</div>
                  </div>
                </div>
                <div style={s.voteButtons}>
                  <button style={s.worthItBtn} onClick={() => submitVote(true)}>✓ Worth it</button>
                  <button style={s.notQuiteBtn} onClick={() => submitVote(false)}>✗ Not quite</button>
                </div>
                <div style={{ textAlign: 'center', fontSize: '11px', color: '#2A2A2A', marginTop: '12px' }}>your vote updates the score in real time</div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#F0EDE8', marginBottom: '6px' }}>Logged!</div>
                <div style={{ fontSize: '13px', color: '#444', lineHeight: '1.6' }}>Score updated.<br />You helped the next person decide.</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={s.header}>
        <div style={s.headerTitle}>Bitten60</div>
        <div style={s.headerSub}>one answer · 60 seconds · worth it</div>
      </div>

      <div style={s.messages}>
        <div style={s.inner}>
          {messages.map((msg, i) => (
            <div key={i} ref={msg.component === 'result' ? resultRef : null} style={{ display: 'flex', flexDirection: 'column' }}>

              {msg.type === 'user' && <div style={s.userBubble}>{msg.content}</div>}

              {msg.type === 'bot' && !msg.component && msg.content && (
                <div style={s.botBubble}>{msg.content}</div>
              )}

              {msg.component === 'location' && (
                <div style={s.card}>
                  <div style={s.cardTitle}>{msg.content}</div>
                  <div style={{ background: '#141414', border: '1px solid #242424', borderRadius: '10px', padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#444' }}>Type your city or neighborhood below</div>
                    <div style={{ fontSize: '11px', color: '#2A2A2A', marginTop: '4px' }}>"Culver City" · "Downtown LA" · "Brooklyn"</div>
                  </div>
                </div>
              )}

              {msg.component === 'vibe' && (
                <div style={s.card}>
                  <div style={s.cardTitle}>{msg.content}</div>
                  <div style={s.grid2}>
                    {[
                      { name: 'Quick & Easy', emoji: '⚡' },
                      { name: 'Adventure', emoji: '🌟' },
                      { name: 'Comfort', emoji: '🛋️' },
                      { name: 'Treat Myself', emoji: '👑' },
                    ].map(v => (
                      <button key={v.name} style={s.vibeBtn} onClick={() => handleVibe(v.name)}>
                        <div style={{ fontSize: '26px', marginBottom: '6px' }}>{v.emoji}</div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#D0CCC8' }}>{v.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {msg.component === 'cuisine' && (
                <div style={s.card}>
                  <div style={s.cardTitle}>{msg.content}</div>
                  <div style={s.grid3}>
                    {cuisineOptions.map(c => (
                      <button key={c.type} style={s.cuisineBtn} onClick={() => handleCuisine(c)}>
                        <div style={{ fontSize: '26px', marginBottom: '6px' }}>{c.emoji}</div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#D0CCC8' }}>{c.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {msg.component === 'budget' && (
                <div style={s.card}>
                  <div style={s.cardTitle}>{msg.content}</div>
                  <div style={s.grid3}>
                    {[{ v: 1, l: 'Under $15', sym: '$' }, { v: 2, l: '$15–30', sym: '$$' }, { v: 3, l: '$30+', sym: '$$$' }].map(b => (
                      <button key={b.v} style={s.budgetBtn} onClick={() => handleBudget(b.v)}>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: '#FF5C35', marginBottom: '4px' }}>{b.sym}</div>
                        <div style={{ fontSize: '10px', color: '#555' }}>{b.l}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {msg.component === 'result' && msg.data && (() => {
                const { restaurant, reasoning, liveScore } = msg.data;
                const score = liveScore || liveScores[restaurant.id];
                return (
                  <div style={{ background: '#0F0F0F', border: '1px solid #1E1E1E', borderRadius: '20px', overflow: 'hidden' }}>

                    <div style={{ background: score ? '#051A0E' : '#0A0A14', borderBottom: '1px solid #1E1E1E', padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: score ? '#22C55E' : '#2A2A2A', animation: 'pulse 1.5s infinite' }} />
                      <span style={{ fontSize: '12px', fontWeight: '700', color: score ? '#22C55E' : '#333' }}>
                        {score ? `${score.pct}% worth it · voted ${score.freshness}` : 'Be the first to vote after visiting'}
                      </span>
                    </div>

                    <div style={{ padding: '18px' }}>

                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#F0EDE8', letterSpacing: '-0.3px', marginBottom: '5px' }}>{restaurant.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <MapPin size={12} color="#FF5C35" />
                          <span style={{ fontSize: '12px', color: '#555' }}>{restaurant.address} · {restaurant.neighborhood}</span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px', marginBottom: '14px' }}>
                        {[
                          { icon: <Star size={12} />, val: restaurant.rating, sub: 'rating', color: '#F59E0B' },
                          { icon: <DollarSign size={12} />, val: '$'.repeat(restaurant.price), sub: 'price', color: '#22C55E' },
                          { icon: <Clock size={12} />, val: restaurant.waitTime, sub: 'wait', color: '#60A5FA' },
                          { icon: <Clock size={12} />, val: restaurant.hours.split(' - ')[1] || '10 PM', sub: 'closes', color: '#A78BFA' },
                        ].map((st, si) => (
                          <div key={si} style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: '10px', padding: '9px 6px', textAlign: 'center' }}>
                            <div style={{ color: st.color, display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>{st.icon}</div>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#F0EDE8' }}>{st.val}</div>
                            <div style={{ fontSize: '9px', color: '#333', marginTop: '2px' }}>{st.sub}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ background: '#141414', borderLeft: '2px solid #FF5C35', borderRadius: '0 10px 10px 0', padding: '11px 13px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <Zap size={14} color="#FF5C35" />
                        <div>
                          <div style={{ fontSize: '9px', color: '#FF5C35', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>must try</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#F0EDE8' }}>{restaurant.specialty}</div>
                        </div>
                      </div>

                      <div style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: '10px', padding: '11px 13px', marginBottom: '14px' }}>
                        <div style={{ fontSize: '9px', color: '#333', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700', marginBottom: '5px' }}>why this spot</div>
                        <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6' }}>{reasoning}</div>
                      </div>

                      <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                        <a href={`tel:${restaurant.phone}`} style={{ fontSize: '12px', color: '#333', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                          <Phone size={12} />{restaurant.phone}
                        </a>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleGoThere(restaurant)} style={{ flex: 2, background: '#FF5C35', color: '#fff', border: 'none', borderRadius: '12px', padding: '15px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
                          <Navigation size={15} /> Take me there
                        </button>
                        <button onClick={() => { setPreferences({ vibe: null, cuisines: [], budget: null }); addMessage('bot', "Let's find another 🎯", 'vibe'); }} style={{ flex: 1, background: '#141414', color: '#555', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '15px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                          Try again
                        </button>
                      </div>

                      <div style={{ textAlign: 'center', fontSize: '10px', color: '#2A2A2A', marginTop: '10px' }}>
                        after you eat — vote. your score updates in real time 🔥
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>
          ))}

          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: '#0F0F0F', border: '1px solid #1E1E1E', borderRadius: '14px' }}>
              <div style={{ width: '16px', height: '16px', border: '2px solid #FF5C35', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#444' }}>Finding your perfect spot...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div style={s.input}>
        <div style={s.inputRow}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder={!userLocation ? 'Type your location...' : 'Type a message...'}
            style={s.inputField}
          />
          <button onClick={handleSend} style={s.sendBtn}>
            <Send size={17} color="#fff" />
          </button>
        </div>
        <div style={s.inputHint}>🎯 one answer · 60 seconds · someone was just there</div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        * { box-sizing: border-box; }
        button:active { opacity: 0.8; transform: scale(0.97); }
      `}</style>
    </div>
  );
};

export default FoodDecider;
