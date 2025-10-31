import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, UtensilsCrossed, ThumbsUp, MapPin, Star, DollarSign, Clock, Sparkles, Zap, Navigation, Phone } from 'lucide-react';

const FoodDecider = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [stage, setStage] = useState('initial');
  const [userLocation, setUserLocation] = useState(null);
  const [preferences, setPreferences] = useState({
    vibe: null,
    cuisines: [],
    budget: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef(null);
  const resultRef = useRef(null);

  const cuisineOptions = [
    { name: 'Tacos', emoji: '🌮', type: 'mexican' },
    { name: 'Pizza', emoji: '🍕', type: 'italian' },
    { name: 'Sushi', emoji: '🍣', type: 'japanese' },
    { name: 'Burgers', emoji: '🍔', type: 'american' },
    { name: 'Thai', emoji: '🍜', type: 'thai' },
    { name: 'Indian', emoji: '🍛', type: 'indian' }
  ];

  const restaurantDB = {
    mexican: [
      { name: "Street Taco Stand", rating: 4.3, price: 1, specialty: "authentic street tacos", waitTime: "5-10 min", address: "456 Main St", phone: "(555) 111-2222", 
reviews: 523, vibe: "quick", hours: "11 AM - 9 PM", neighborhood: "Downtown" },
      { name: "Taco Libre", rating: 4.8, price: 2, specialty: "birria tacos", waitTime: "10-15 min", address: "234 Mission St", phone: "(555) 234-5678", reviews: 847, 
vibe: "comfort", hours: "11 AM - 10 PM", neighborhood: "Mission District" },
      { name: "Casa de Oro", rating: 4.7, price: 3, specialty: "molcajete mixto", waitTime: "25-30 min", address: "789 Sunset Blvd", phone: "(555) 333-4444", reviews: 612, 
vibe: "upscale", hours: "5 PM - 11 PM", neighborhood: "Uptown" }
    ],
    italian: [
      { name: "Quick Slice Pizza", rating: 4.2, price: 1, specialty: "pepperoni slices", waitTime: "5 min", address: "321 Oak Ave", phone: "(555) 555-6666", reviews: 734, 
vibe: "quick", hours: "10 AM - 11 PM", neighborhood: "Downtown" },
      { name: "Tony's Pizza House", rating: 4.4, price: 2, specialty: "NY-style pizza", waitTime: "10-15 min", address: "123 Broadway", phone: "(555) 678-9012", reviews: 
956, vibe: "comfort", hours: "11 AM - 10 PM", neighborhood: "Midtown" },
      { name: "Bella Trattoria", rating: 4.6, price: 3, specialty: "homemade pasta", waitTime: "30-40 min", address: "567 Pine St", phone: "(555) 777-8888", reviews: 421, 
vibe: "upscale", hours: "5 PM - 11 PM", neighborhood: "Italian Quarter" }
    ],
    japanese: [
      { name: "Sushi Express", rating: 4.1, price: 1, specialty: "california rolls", waitTime: "10 min", address: "234 Elm St", phone: "(555) 999-0000", reviews: 645, 
vibe: "quick", hours: "11 AM - 9 PM", neighborhood: "Downtown" },
      { name: "Ramen Station", rating: 4.6, price: 2, specialty: "tonkotsu ramen", waitTime: "15-20 min", address: "678 Post St", phone: "(555) 901-2345", reviews: 1089, 
vibe: "comfort", hours: "11 AM - 10 PM", neighborhood: "Japantown" },
      { name: "Sakura Omakase", rating: 4.8, price: 3, specialty: "chef's omakase", waitTime: "45-60 min", address: "890 Cherry Ln", phone: "(555) 121-3141", reviews: 387, 
vibe: "upscale", hours: "6 PM - 11 PM", neighborhood: "Financial District" }
    ],
    american: [
      { name: "Fast Burger Shack", rating: 4.0, price: 1, specialty: "classic cheeseburger", waitTime: "8 min", address: "123 First St", phone: "(555) 151-6171", reviews: 
892, vibe: "quick", hours: "10 AM - 10 PM", neighborhood: "Downtown" },
      { name: "The Burger Joint", rating: 4.5, price: 2, specialty: "signature burgers", waitTime: "10-15 min", address: "890 Polk St", phone: "(555) 123-4567", reviews: 
1432, vibe: "comfort", hours: "11 AM - 10 PM", neighborhood: "Castro" },
      { name: "Gourmet Grill House", rating: 4.7, price: 3, specialty: "wagyu burger", waitTime: "20-25 min", address: "456 Market St", phone: "(555) 181-9202", reviews: 
534, vibe: "upscale", hours: "5 PM - 11 PM", neighborhood: "SoMa" }
    ],
    thai: [
      { name: "Thai Quick Bites", rating: 4.2, price: 1, specialty: "pad thai", waitTime: "10 min", address: "789 Oak St", phone: "(555) 222-3333", reviews: 567, vibe: 
"quick", hours: "11 AM - 9 PM", neighborhood: "Chinatown" },
      { name: "Thai Basil", rating: 4.6, price: 2, specialty: "green curry", waitTime: "15-20 min", address: "345 Market St", phone: "(555) 444-5555", reviews: 823, vibe: 
"comfort", hours: "11 AM - 10 PM", neighborhood: "Midtown" },
      { name: "Royal Thai Cuisine", rating: 4.8, price: 3, specialty: "royal platter", waitTime: "30-40 min", address: "567 Union St", phone: "(555) 666-7777", reviews: 
445, vibe: "upscale", hours: "5 PM - 10 PM", neighborhood: "Nob Hill" }
    ],
    indian: [
      { name: "Curry Express", rating: 4.1, price: 1, specialty: "chicken tikka masala", waitTime: "10 min", address: "234 Mission St", phone: "(555) 888-9999", reviews: 
456, vibe: "quick", hours: "11 AM - 9 PM", neighborhood: "Downtown" },
      { name: "Curry House", rating: 4.5, price: 2, specialty: "butter chicken", waitTime: "20-25 min", address: "567 Divisadero St", phone: "(555) 678-9012", reviews: 
634, vibe: "comfort", hours: "11 AM - 10 PM", neighborhood: "Haight" },
      { name: "Tandoor Palace", rating: 4.7, price: 3, specialty: "tandoori platter", waitTime: "25-30 min", address: "890 Union St", phone: "(555) 789-0123", reviews: 
445, vibe: "upscale", hours: "5 PM - 11 PM", neighborhood: "Marina" }
    ]
  };

  const addMessage = useCallback((type, content, component = null, data = null) => {
    setMessages(prev => [...prev, { type, content, component, data, timestamp: Date.now() }]);
  }, []);

  useEffect(() => {
    if (!initialized) {
      addMessage('assistant', "Hey! 👋 Let's find you the perfect spot to eat.");
      setTimeout(() => {
        addMessage('assistant', "Where are you? (City or neighborhood) 📍", 'location-input');
      }, 800);
      setInitialized(true);
    }
  }, [initialized, addMessage]);

  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].component === 'recommendation') {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleLocationSubmit = (location) => {
    setUserLocation(location);
    setStage('vibe-select');
    addMessage('user', location);
    setTimeout(() => {
      addMessage('assistant', `Perfect! I know great spots in ${location} 🎯\n\nWhat's your vibe?`, 'vibe-selector');
    }, 600);
  };

  const handleVibeSelection = (vibe) => {
    setPreferences(prev => ({ ...prev, vibe }));
    setStage('cuisine-select');
    const responses = {
      'Quick & Easy': "Love it! Speed is key 🏃‍♂️",
      'Adventure': "Bold choice! 🌟",
      'Comfort': "Cozy vibes! 🛋️",
      'Treat Myself': "Yes! 👑"
    };
    addMessage('assistant', responses[vibe]);
    setTimeout(() => {
      addMessage('assistant', "What type of food sounds good?", 'cuisine-selector');
    }, 600);
  };

  const handleCuisineReaction = (cuisine) => {
    setPreferences(prev => ({ ...prev, cuisines: [...prev.cuisines, cuisine.type] }));
    setStage('budget-select');
    addMessage('assistant', `${cuisine.emoji} ${cuisine.name}! Great choice!`);
    setTimeout(() => {
      addMessage('assistant', "What's your budget? 💰", 'budget-selector');
    }, 600);
  };

  const handleBudgetSelection = (budget) => {
    setPreferences(prev => ({ ...prev, budget }));
    setStage('decision');
    const responses = { 1: "Perfect! 💪", 2: "Nice! 👌", 3: "Premium! 🎩" };
    addMessage('assistant', responses[budget]);
    setTimeout(() => {
      setIsLoading(true);
      addMessage('assistant', "Finding your spot... ✨");
      setTimeout(() => {
        setIsLoading(false);
        generateRecommendation();
      }, 2000);
    }, 500);
  };

  const generateRecommendation = () => {
    const cuisineType = preferences.cuisines[0] || 'mexican';
    const allRestaurants = restaurantDB[cuisineType];
    
    let filtered = allRestaurants.filter(r => r.price === preferences.budget);
    if (filtered.length === 0) filtered = allRestaurants.filter(r => r.price <= preferences.budget);
    if (filtered.length === 0) filtered = allRestaurants;
    
    const vibeMapping = {
      'Quick & Easy': 'quick',
      'Adventure': 'adventure',
      'Comfort': 'comfort',
      'Treat Myself': 'upscale'
    };
    
    const targetVibe = vibeMapping[preferences.vibe];
    let restaurant = filtered.find(r => r.vibe === targetVibe);
    if (!restaurant) restaurant = filtered.sort((a, b) => b.rating - a.rating)[0];
    
    let reasoning = '';
    if (preferences.vibe === 'Quick & Easy') {
      reasoning = `You wanted quick! ${restaurant.name} has super fast service (${restaurant.waitTime}) and great food.`;
    } else if (preferences.vibe === 'Adventure') {
      reasoning = `For your adventurous spirit! ${restaurant.name} has amazing ratings (${restaurant.rating}⭐) and their ${restaurant.specialty} is legendary!`;
    } else if (preferences.vibe === 'Comfort') {
      reasoning = `Perfect comfort food vibes! ${restaurant.name}'s ${restaurant.specialty} is exactly what you need.`;
    } else {
      reasoning = `You deserve this! ${restaurant.name} is a premium spot with excellent ratings (${restaurant.rating}⭐). Their ${restaurant.specialty} is special!`;
    }
    
    if (preferences.budget === 1) reasoning += ` Great value!`;
    else if (preferences.budget === 3) reasoning += ` Worth the splurge!`;
    
    addMessage('assistant', '', 'recommendation', { restaurant, reasoning, location: userLocation });
  };

  const handleSend = () => {
    if (!input.trim()) return;
    addMessage('user', input);
    if (!userLocation) handleLocationSubmit(input);
    setInput('');
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
      {/* Header - Blue/Purple gradient */}
      <div className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-2xl px-4 sm:px-6 py-6">
        <div className="flex items-center justify-center gap-4">
          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl shadow-xl border-2 border-white/30">
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg">FoodDecider</h1>
            <p className="text-sm text-white/90 font-medium drop-shadow">Mood-based restaurant decisions</p>
          </div>
        </div>
      </div>

      {/* Chat Container - CENTERED */}
      <div className="flex-1 w-full overflow-y-auto px-4 sm:px-6 py-6 flex justify-center">
        <div className="w-full max-w-4xl space-y-6">
          {messages.map((message, idx) => (
            <div 
              key={idx} 
              ref={message.component === 'recommendation' ? resultRef : null}
              className="flex w-full justify-center"
            >
              <div className={`w-full max-w-3xl rounded-2xl px-6 py-4 shadow-xl transition-all ${
                message.type === 'user' 
                  ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white text-center' 
                  : 'bg-white text-gray-800 border border-indigo-100'
              }`}>
                <div className="font-medium leading-relaxed whitespace-pre-line text-center">{message.content}</div>
                
                {message.component === 'location-input' && (
                  <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-indigo-200">
                    <p className="text-sm text-gray-700 font-medium text-center">Type your city or neighborhood below ⬇️</p>
                    <p className="text-xs text-gray-500 mt-1 text-center">Examples: "Brooklyn", "Downtown LA", "Scottsdale"</p>
                  </div>
                )}
                
                {message.component === 'vibe-selector' && (
                  <div className="mt-5 grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                    {[
                      { name: 'Quick & Easy', emoji: '⚡', gradient: 'from-cyan-400 via-blue-400 to-indigo-500' },
                      { name: 'Adventure', emoji: '🌟', gradient: 'from-purple-500 via-pink-500 to-rose-500' },
                      { name: 'Comfort', emoji: '🛋️', gradient: 'from-blue-400 via-indigo-400 to-purple-500' },
                      { name: 'Treat Myself', emoji: '👑', gradient: 'from-violet-500 via-purple-500 to-fuchsia-500' }
                    ].map((vibe) => (
                      <button
                        key={vibe.name}
                        onClick={() => handleVibeSelection(vibe.name)}
                        className={`bg-gradient-to-r ${vibe.gradient} text-white py-6 px-5 rounded-2xl font-bold shadow-lg hover:shadow-2xl transition-all transform 
hover:scale-105 active:scale-95`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-4xl">{vibe.emoji}</span>
                          <span className="text-lg">{vibe.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {message.component === 'cuisine-selector' && (
                  <div className="mt-5 flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
                    {cuisineOptions.map((cuisine) => (
                      <div key={cuisine.type} className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl p-4 border-2 border-indigo-200 shadow-md hover:shadow-xl 
hover:border-indigo-400 transition-all transform hover:scale-105 w-28">
                        <div className="text-center mb-2">
                          <span className="text-5xl">{cuisine.emoji}</span>
                          <div className="font-bold text-sm mt-2 text-gray-800">{cuisine.name}</div>
                        </div>
                        <button 
                          onClick={() => handleCuisineReaction(cuisine)} 
                          className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white py-2 rounded-xl font-bold 
text-xs shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-1"
                        >
                          <ThumbsUp className="w-3 h-3" /> Pick
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {message.component === 'budget-selector' && (
                  <div className="mt-5 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                    {[
                      {v:1, l:'Under $15', sym:'$', color:'from-emerald-400 via-teal-400 to-cyan-500'},
                      {v:2, l:'$15-30', sym:'$$', color:'from-blue-400 via-indigo-400 to-violet-500'},
                      {v:3, l:'$30+', sym:'$$$', color:'from-purple-400 via-fuchsia-400 to-pink-500'}
                    ].map((b) => (
                      <button 
                        key={b.v} 
                        onClick={() => handleBudgetSelection(b.v)} 
                        className={`bg-gradient-to-br ${b.color} text-white py-6 rounded-2xl font-bold shadow-lg hover:shadow-2xl transition-all transform hover:scale-110 
active:scale-95`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-4xl">{b.sym}</span>
                          <span className="text-sm font-semibold">{b.l}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {message.component === 'recommendation' && message.data && (
                  <div className="mt-6">
                    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-6 sm:p-8 border-4 border-indigo-400 shadow-2xl">
                      <div className="text-center mb-6">
                        <div className="flex items-center justify-center gap-3 mb-4">
                          <Sparkles className="w-10 h-10 text-yellow-500 animate-pulse" />
                          <h3 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Perfect Match!</h3>
                          <Sparkles className="w-10 h-10 text-yellow-500 animate-pulse" />
                        </div>
                        <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-3">{message.data.restaurant.name}</h2>
                        <div className="flex flex-col items-center gap-1 text-gray-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-indigo-500" />
                            <span className="font-semibold">{message.data.restaurant.address}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-500">{message.data.restaurant.neighborhood}, {message.data.location}</span>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-2xl p-6 mb-6 shadow-xl">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 px-4 py-4 rounded-xl border-2 border-yellow-300 text-center">
                            <Star className="w-6 h-6 fill-yellow-500 text-yellow-500 mx-auto mb-2" />
                            <div className="font-black text-2xl text-gray-800">{message.data.restaurant.rating}</div>
                            <p className="text-xs text-gray-600 mt-1">{message.data.restaurant.reviews} reviews</p>
                          </div>
                          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 px-4 py-4 rounded-xl border-2 border-emerald-300 text-center">
                            <DollarSign className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                            <div className="font-black text-2xl text-gray-800">{'$'.repeat(message.data.restaurant.price)}</div>
                            <p className="text-xs text-gray-600 mt-1">Price</p>
                          </div>
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-4 rounded-xl border-2 border-blue-300 text-center">
                            <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                            <div className="font-black text-lg text-gray-800">{message.data.restaurant.waitTime}</div>
                            <p className="text-xs text-gray-600 mt-1">Wait time</p>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 px-4 py-4 rounded-xl border-2 border-purple-300 text-center">
                            <Clock className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                            <div className="font-black text-sm text-gray-800">{message.data.restaurant.hours}</div>
                            <p className="text-xs text-gray-600 mt-1">Open</p>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-l-4 border-indigo-500 p-5 rounded-xl mb-5 shadow-md">
                          <p className="font-bold text-lg flex items-center gap-3 text-indigo-900">
                            <Zap className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                            <span>Must Try: <span className="text-indigo-700">{message.data.restaurant.specialty}</span></span>
                          </p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center gap-3 text-sm justify-center">
                            <Phone className="w-5 h-5 text-gray-600" />
                            <a href={`tel:${message.data.restaurant.phone}`} className="font-semibold text-gray-800 hover:text-indigo-600 
transition-colors">{message.data.restaurant.phone}</a>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-5 mb-6 border-2 border-indigo-300 shadow-lg">
                        <p className="font-medium leading-relaxed text-gray-800">
                          <strong className="text-indigo-700 text-lg block mb-2">Why this spot:</strong>
                          <span className="text-gray-700">{message.data.reasoning}</span>
                        </p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4">
                        <button 
                          onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(message.data.restaurant.name + ' ' + message.data.restaurant.address 
+ ' ' + message.data.location)}`, '_blank')} 
                          className="flex-1 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700 
text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-2xl transition-all transform hover:scale-105 active:scale-95"
                        >
                          <Navigation className="w-6 h-6" /> Get Directions
                        </button>
                        <button 
                          onClick={() => { 
                            setStage('vibe-select'); 
                            setPreferences({vibe:null,cuisines:[],budget:null}); 
                            addMessage('assistant', "Let's find another! 🎯", 'vibe-selector'); 
                          }} 
                          className="flex-1 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800 py-5 rounded-2xl font-black 
text-lg shadow-xl border-2 border-gray-300 transition-all transform hover:scale-105 active:scale-95"
                        >
                          Try Again 🔁
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-center w-full">
              <div className="bg-white shadow-2xl rounded-2xl px-6 py-5 border-2 border-indigo-200 flex items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                <div>
                  <span className="font-bold text-gray-800 block">Finding your perfect spot...</span>
                  <span className="text-sm text-gray-600">Analyzing {preferences.vibe} vibes</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - CENTERED */}
      <div className="w-full bg-white/95 backdrop-blur-md shadow-2xl px-4 sm:px-6 py-6 border-t-2 border-indigo-200">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-3 mb-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={!userLocation ? "Type your location..." : "Type a message..."}
              className="flex-1 px-6 py-4 border-2 border-indigo-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 font-medium 
text-lg shadow-lg transition-all text-center"
            />
            <button 
              onClick={handleSend} 
              disabled={isLoading} 
              className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 disabled:opacity-50 
text-white px-8 py-4 rounded-2xl shadow-2xl font-bold transition-all transform hover:scale-105 active:scale-95"
            >
              <Send className="w-7 h-7" />
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center">🎯 Mood-based decisions, not endless scrolling</p>
        </div>
      </div>
    </div>
  );
};

export default FoodDecider;
