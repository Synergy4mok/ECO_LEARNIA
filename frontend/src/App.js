import React, { useState, useEffect } from 'react';
import * as d3 from 'd3';
import { MessageCircle, Calculator, LogIn, UserPlus, LogOut, Home, Bot, Globe, User, Settings, Leaf, Zap, Trophy, Star, TreePine } from 'lucide-react';
import { motion } from 'framer-motion';
import './App.css';

function App() {
  const [token, setToken] = useState(() => {
    try {
      const stored = localStorage.getItem('token');
      return stored && stored !== 'undefined' ? stored : '';
    } catch {
      return '';
    }
  });
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored && stored !== 'undefined' ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [fullConversations, setFullConversations] = useState([]);
  const [carbonFootprint, setCarbonFootprint] = useState(0);
  const [energySaved, setEnergySaved] = useState(0);
  const [ecoScore, setEcoScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [activity, setActivity] = useState('');
  const [duration, setDuration] = useState(0);
  const [metrics, setMetrics] = useState([]);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [sessionCarbon, setSessionCarbon] = useState(0);
  const [deviceType, setDeviceType] = useState('');
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [plantationSummary, setPlantationSummary] = useState({ total_carbon_kg: 0, total_trees_planted: 0 });
  const [currentConvoIndex, setCurrentConvoIndex] = useState(-1);
  const [isNewConvo, setIsNewConvo] = useState(false);
  const [convoCounter, setConvoCounter] = useState(0);
  const [cumulativeCarbon, setCumulativeCarbon] = useState({phone: 0, tablet: 0, pc: 0, iot: 0});

  const deviceFactors = {
    phone: 0.0015, // ~3W * 0.5 kg/kWh carbon intensity
    tablet: 0.0025, // ~5W * 0.5 kg/kWh
    pc: 0.025, // ~50W * 0.5 kg/kWh
    iot: 0.0005 // ~1W * 0.5 kg/kWh
  };

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
  };

  const saveConversations = (convs) => {
    if (user) {
      sessionStorage.setItem(`conversations_${user.id}`, JSON.stringify(convs));
    }
  };

  useEffect(() => {
    if (user) {
      setFullConversations([]);
      setChatHistory([]);
      setConvoCounter(0);
      const saved = sessionStorage.getItem(`conversations_${user.id}`);
      if (saved) {
        try {
          let convs = JSON.parse(saved);
          if (Array.isArray(convs) && convs.length > 0 && Array.isArray(convs[0])) {
            convs = convs.map((conv, idx) => ({ id: idx, messages: conv }));
          }
          setFullConversations(convs);
          setConvoCounter(convs.length ? Math.max(...convs.map(c => c.id)) + 1 : 0);
          setChatHistory(convs[convs.length - 1]?.messages || []);
        } catch (e) {
          // ignore
        }
      }
      let carbonData = {phone: 0, tablet: 0, pc: 0, iot: 0};
      const savedCarbon = localStorage.getItem(`cumulative_${user.id}`);
      if (savedCarbon) {
        carbonData = JSON.parse(savedCarbon);
      }
      setCumulativeCarbon(carbonData);
    }
  }, [user]);

  const sendChat = async () => {
    if (!chatMessage.trim()) return;
    const response = await fetch('http://localhost:8000/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: chatMessage, user_id: user.id })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      alert(data.detail || "Erreur lors de l'envoi du message");
      return;
    }
    // Update chatHistory directly
    setChatHistory(prev => [...prev, { user_message: chatMessage, ai_response: data.ai_response }]);
    if (currentConvoIndex >= 0) {
      setFullConversations(prev => {
        const updated = [...prev];
        updated[currentConvoIndex].messages = [...chatHistory, { user_message: chatMessage, ai_response: data.ai_response }];
        saveConversations(updated);
        return updated;
      });
    } else {
      setFullConversations(prev => {
        const updated = [...prev];
        const newMessage = { user_message: chatMessage, ai_response: data.ai_response };
        if (updated.length === 0) {
          updated.push({ id: convoCounter, messages: [newMessage] });
          setConvoCounter(prev => prev + 1);
        } else {
          if (isNewConvo) {
            updated.push({ id: convoCounter, messages: [newMessage] });
            setConvoCounter(prev => prev + 1);
            setIsNewConvo(false);
          } else {
            updated[updated.length - 1].messages = [...updated[updated.length - 1].messages, newMessage];
          }
        }
        saveConversations(updated);
        return updated;
      });
    }
    setChatMessage('');
  };

  const fetchChatHistory = async () => {
    if (!user) return;
    const response = await fetch(`http://localhost:8000/get-chat-history?user_id=${user.id}`, { headers });
    const data = await response.json().catch(() => []);
    if (!response.ok) {
      return;
    }
    setChatHistory(data);
  };

  const clearChat = async () => {
    if (currentConvoIndex >= 0) {
      setChatHistory([]);
      setCurrentConvoIndex(-1);
      setIsNewConvo(true);
    } else {
      if (chatHistory.length > 0) {
        setFullConversations(prev => {
          const updated = [...prev, { id: convoCounter, messages: chatHistory }];
          setConvoCounter(prev => prev + 1);
          saveConversations(updated);
          return updated;
        });
      }
      setChatHistory([]);
      setIsNewConvo(true);
    }
    const response = await fetch(`http://localhost:8000/clear-chat-history?user_id=${user.id}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) {
      // ignore
    }
  };

  const calculateCarbon = async () => {
    const response = await fetch('http://localhost:8000/calculate-carbon', {
      method: 'POST',
      headers,
      body: JSON.stringify({ activity, duration_minutes: duration, user_id: user.id })
    });
    const data = await response.json();
    setCarbonFootprint(data.carbon_footprint_kg);
    fetchMetrics();
  };

  const fetchMetrics = async () => {
    if (!user) return;
    const response = await fetch(`http://localhost:8000/get-carbon-metrics?user_id=${user.id}`, { headers });
    const data = await response.json();
    setMetrics(data);
  };

  const fetchPlantationSummary = async () => {
    if (!user) return;
    const response = await fetch(`http://localhost:8000/get-plantation-summary?user_id=${user.id}`, { headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return;
    }
    setPlantationSummary({
      total_carbon_kg: Number(data.total_carbon_kg) || 0,
      total_trees_planted: Number(data.total_trees_planted) || 0
    });
  };

  const computeSessionCarbon = () => {
    if (!startTime || !deviceType) return;
    const factor = deviceFactors[deviceType] ?? 0;
    const elapsedMinutes = (Date.now() - startTime) / 1000 / 60;
    const carbon = elapsedMinutes * factor;
    setSessionCarbon(carbon);
    setEnergySaved(carbon * 1000); // Example calculation
    setEcoScore(Math.min(100, carbon * 100000)); // Score based on carbon
    setPoints(Math.floor(carbon * 1000000)); // Points based on carbon
    setCumulativeCarbon(prev => ({...prev, [deviceType]: carbon}));
  };

  useEffect(() => {
    if (user) {
      fetchMetrics();
      fetchPlantationSummary();
      fetchChatHistory();
    }
  }, [user]);

  useEffect(() => {
    if (user && !startTime) {
      setStartTime(Date.now());
    }
  }, [user, startTime]);

  useEffect(() => {
    if (user && !deviceType) {
      setShowDeviceModal(true);
    }
  }, [user, deviceType]);

  useEffect(() => {
    if (user && startTime && deviceType) {
      computeSessionCarbon();
      const interval = setInterval(computeSessionCarbon, 1000);
      return () => clearInterval(interval);
    }
  }, [user, startTime, deviceType]);

  useEffect(() => {
    if (document.getElementById('chart') && metrics.length > 0) {
      const svg = d3.select('#chart')
        .html('')
        .append('svg')
        .attr('width', 600)
        .attr('height', 300);

      const margin = { top: 20, right: 30, bottom: 40, left: 40 };
      const width = 600 - margin.left - margin.right;
      const height = 300 - margin.top - margin.bottom;

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand()
        .domain(metrics.map(d => d.activity))
        .range([0, width])
        .padding(0.1);

      const y = d3.scaleLinear()
        .domain([0, d3.max(metrics, d => d.footprint_kg)])
        .range([height, 0]);

      g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));

      g.append('g')
        .call(d3.axisLeft(y));

      g.selectAll('.bar')
        .data(metrics)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.activity))
        .attr('y', d => y(d.footprint_kg))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.footprint_kg))
        .attr('fill', '#16a34a');
    }
  }, [metrics]);

  useEffect(() => {
    const data = Object.entries(cumulativeCarbon).map(([device, value]) => ({device, value: value * 1000})); // grams
    d3.select('#carbon-chart').selectAll('*').remove();
    if (data.length === 0) return;
    const margin = {top: 20, right: 30, bottom: 40, left: 40};
    const width = 400 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;
    const svg = d3.select('#carbon-chart').append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    const x = d3.scaleBand().domain(data.map(d => d.device)).range([0, width]).padding(0.1);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value)]).nice().range([height, 0]);
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));
    svg.append('g')
      .call(d3.axisLeft(y));
    svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d.device))
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.value))
      .attr('fill', '#16a34a');
  }, [cumulativeCarbon]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`cumulative_${user.id}`, JSON.stringify(cumulativeCarbon));
    }
  }, [cumulativeCarbon, user]);

  const handleAuth = async () => {
    const endpoint = authMode === 'login' ? '/login' : '/register';
    const body = authMode === 'login' ? { email, password } : { name, username, email, password };
    const response = await fetch(`http://localhost:8000${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (response.ok) {
      if (authMode === 'login') {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setStartTime(Date.now());
        setSessionCarbon(0);
        setDeviceType('');
        setShowDeviceModal(true);
      } else {
        alert(data.message);
        setAuthMode('login');
      }
    } else {
      alert(data.detail || 'Error');
    }
  };

  const handleLogout = async () => {
    localStorage.setItem(`cumulative_${user.id}`, JSON.stringify(cumulativeCarbon));
    const durationMinutes = startTime ? (Date.now() - startTime) / 1000 / 60 : 0;
    await fetch('http://localhost:8000/logout', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        token,
        device_type: deviceType || 'unknown',
        duration_minutes: durationMinutes,
        carbon_footprint_kg: sessionCarbon
      })
    });
    // Keep conversations persisted
    setFullConversations([]);
    setChatHistory([]);
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setStartTime(null);
    setSessionCarbon(0);
    setDeviceType('');
    setShowDeviceModal(false);
    setPlantationSummary({ total_carbon_kg: 0, total_trees_planted: 0 });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-green-50 to-green-100 flex items-center justify-center p-8 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-40">
          <motion.div 
            className="absolute top-10 left-10 w-40 h-40 bg-green-300 rounded-full blur-2xl animate-pulse"
            animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          ></motion.div>
          <motion.div 
            className="absolute bottom-10 right-10 w-48 h-48 bg-green-400 rounded-full blur-2xl animate-pulse delay-1000"
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          ></motion.div>
          <motion.div 
            className="absolute top-1/2 left-1/3 w-32 h-32 bg-green-500 rounded-full blur-2xl animate-pulse delay-500"
            animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.5, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          ></motion.div>
          <motion.div 
            className="absolute top-20 right-20 w-24 h-24 bg-green-600 rounded-full blur-xl animate-bounce"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          ></motion.div>
        </div>

        <motion.div 
          className="relative z-10 bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl p-10 w-full max-w-md border border-white/30 transform hover:scale-105 transition-transform duration-500"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <motion.div 
              className="inline-block p-4 bg-gradient-to-r from-green-400 to-green-500 rounded-full mb-4 shadow-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="text-4xl">🌱</span>
            </motion.div>
            <motion.h1 
              className="text-5xl font-black bg-gradient-to-r from-green-500 via-green-600 to-green-700 bg-clip-text text-transparent mb-2 animate-fade-in"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              ECOLEARNIA
            </motion.h1>
            <motion.p 
              className="text-gray-600 text-lg font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              Apprentissage écologique intelligent
            </motion.p>
          </motion.div>

          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.6 }}
          >
            <div className="space-y-4">
              <motion.div 
                className="relative"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <span className="mr-2">📧</span> Adresse email
                </label>
                <input
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full p-4 bg-white/90 backdrop-blur-sm border-2 border-green-200 rounded-2xl focus:border-green-400 focus:ring-4 focus:ring-green-200/50 transition-all duration-300 text-gray-800 placeholder-gray-400 shadow-sm hover:shadow-md"
                />
              </motion.div>

              {authMode === 'register' && (
                <motion.div 
                  className="relative"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <span className="mr-2">👤</span> Nom d'utilisateur
                  </label>
                  <input
                    type="text"
                    placeholder="Votre nom d'utilisateur"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full p-4 bg-white/90 backdrop-blur-sm border-2 border-green-200 rounded-2xl focus:border-green-400 focus:ring-4 focus:ring-green-200/50 transition-all duration-300 text-gray-800 placeholder-gray-400 shadow-sm hover:shadow-md"
                  />
                </motion.div>
              )}

              <motion.div 
                className="relative"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <span className="mr-2">🔒</span> Mot de passe
                </label>
                <input
                  type="password"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full p-4 bg-white/90 backdrop-blur-sm border-2 border-green-200 rounded-2xl focus:border-green-400 focus:ring-4 focus:ring-green-200/50 transition-all duration-300 text-gray-800 placeholder-gray-400 shadow-sm hover:shadow-md"
                />
              </motion.div>
            </div>

            <motion.button
              onClick={handleAuth}
              className="w-full bg-gradient-to-r from-green-500 via-green-600 to-green-700 hover:from-green-600 hover:via-green-700 hover:to-green-800 text-white py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg flex items-center justify-center space-x-2"
              whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <span>🚀</span>
              <span>Se connecter</span>
            </motion.button>

            <motion.div 
              className="text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.6 }}
            >
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-green-600 hover:text-green-800 transition-colors font-semibold underline decoration-2 underline-offset-4 hover:decoration-green-400"
              >
                {authMode === 'login' ? 'Créer un nouveau compte ✨' : 'Déjà un compte ?'}
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-gradient-to-b from-green-50 via-white to-green-50 p-6 shadow-2xl border-r border-gray-200 min-h-screen relative">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50/20 to-green-50/20 rounded-r-lg"></div>
          <div className="relative z-10">
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <motion.div 
                  className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center mr-3 shadow-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <span className="text-xl text-white font-bold">E</span>
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 drop-shadow-sm">
                    ECOLEARNIA
                  </h2>
                  <p className="text-gray-600 text-sm">Plateforme moderne</p>
                </div>
              </div>
            </div>

            <nav className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Navigation</div>
              {[
                { label: 'Dashboard', icon: Home, active: true },
              ].map((item) => (
                <motion.button
                  key={item.label}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-300 flex items-center space-x-3 hover:scale-105 hover:shadow-lg ${
                    item.active
                      ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 border-l-4 border-green-600 shadow-md'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900'
                  }`}
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </motion.button>
              ))}
            </nav>

            <div className="mt-8 pt-6 border-t border-gradient-to-r from-gray-200 to-gray-300">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 drop-shadow-sm">Conversations récentes</h3>
              <div className="space-y-3">
                {fullConversations.length === 0 ? (
                  <motion.div 
                    className="text-center py-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow-inner"
                    whileHover={{ scale: 1.02 }}
                  >
                    <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-pulse" />
                    <p className="text-gray-500 text-sm">Aucune conversation</p>
                  </motion.div>
                ) : (
                  fullConversations.slice(-5).reverse().map((convo, index) => (
                    <motion.div 
                      key={index} 
                      className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200 transition-all duration-200 cursor-pointer hover:scale-102 hover:shadow-md"
                      onClick={() => { setChatHistory(convo.messages); setCurrentConvoIndex(fullConversations.length - 1 - index); setIsNewConvo(false); }}
                      whileHover={{ scale: 1.03, x: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <p className="text-sm font-medium text-gray-900 truncate drop-shadow-sm">
                        Chat ${convo.id}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date().toLocaleDateString()}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
              <motion.button
                onClick={clearChat}
                className="mt-4 w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-4 rounded-lg font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg shadow-md"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                Nouvelle conversation
              </motion.button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {showDeviceModal && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <Calculator className="w-6 h-6 mr-3 text-blue-600" />
                  Choisir votre appareil
                </h2>
                <select
                  value={deviceType}
                  onChange={e => setDeviceType(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg mb-6 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors text-gray-900"
                >
                  <option value="">Sélectionner un appareil</option>
                  <option value="phone">Téléphone</option>
                  <option value="tablet">Tablette</option>
                  <option value="pc">Ordinateur</option>
                  <option value="iot">IoT</option>
                </select>
                <button
                  onClick={() => {
                    if (deviceType) {
                      setShowDeviceModal(false);
                      setStartTime(new Date());
                    }
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center shadow-md">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Tableau de bord
                </h1>
                <p className="text-gray-600 mt-1">Bienvenue, <span className="font-semibold text-green-600">{user.name}</span> ! Découvrez votre impact positif.</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Déconnexion</span>
            </button>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Chat Section */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Chat IA</h2>
                  <p className="text-gray-600 text-sm">Posez vos questions intelligentes</p>
                </div>
              </div>

              <div className="chat-history mb-6 max-h-64 overflow-y-auto space-y-3">
                {chatHistory.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Posez votre première question !</p>
                  </div>
                ) : (
                  chatHistory.map((chat, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-end">
                        <div className="bg-green-600 text-white px-4 py-2 rounded-lg max-w-xs shadow-sm">
                          <p className="text-sm">{chat.user_message}</p>
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg max-w-xs shadow-sm">
                          <p className="text-sm">{chat.ai_response}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex space-x-3">
                <input
                  type="text"
                  placeholder="Tapez votre message..."
                  value={chatMessage}
                  onChange={e => setChatMessage(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && sendChat()}
                  className="flex-1 p-3 bg-gray-50 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors text-gray-900 placeholder-gray-500"
                />
                <button
                  onClick={sendChat}
                  className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dashboard Section */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                  <Calculator className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Empreinte carbone</h2>
                  <p className="text-gray-600 text-sm">Suivez votre impact environnemental</p>
                </div>
              </div>

              <div className="space-y-6">
                <motion.div 
                  className="flex justify-between items-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md hover:shadow-xl border border-green-200 transition-all duration-300"
                  whileHover={{ scale: 1.05, rotate: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center">
                    <Leaf className="w-8 h-8 text-green-600 mr-4" />
                    <div>
                      <p className="font-semibold text-gray-900">CO₂ économisé</p>
                      <p className="text-2xl font-bold text-green-600">{((cumulativeCarbon[deviceType] || 0) * 1000).toFixed(5)} g</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="flex justify-between items-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md hover:shadow-xl border border-blue-200 transition-all duration-300"
                  whileHover={{ scale: 1.05, rotate: -1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center">
                    <Zap className="w-8 h-8 text-blue-600 mr-4" />
                    <div>
                      <p className="font-semibold text-gray-900">Énergie sauvegardée</p>
                      <p className="text-2xl font-bold text-blue-600">{energySaved} kWh</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="flex justify-between items-center p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-md hover:shadow-xl border border-emerald-200 transition-all duration-300"
                  whileHover={{ scale: 1.05, rotate: 0.5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center">
                    <TreePine className="w-8 h-8 text-emerald-700 mr-4" />
                    <div>
                      <p className="font-semibold text-gray-900">Arbres plantés</p>
                      <p className="text-2xl font-bold text-emerald-700">{(Object.values(cumulativeCarbon).reduce((sum, val) => sum + val, 0) / 100).toFixed(5)}</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div id="carbon-chart" className="mt-6"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
