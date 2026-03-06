import React, { useState, useEffect } from 'react';
import { 
  PawPrint, 
  HeartPulse, 
  CalendarDays, 
  Crown, 
  Plus, 
  LogOut, 
  ChevronRight, 
  Sparkles, 
  Syringe, 
  Stethoscope,
  Utensils,
  Camera,
  Video,
  Bell,
  BellOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Pet, HealthRecord, Vaccine, PetEvent, User } from './types';
import { analyzePetHealth, generateDietPlan, generatePetImage } from './services/gemini';

const SPECIES_EMOJI = {
  dog: '🐕',
  cat: '🐱',
  bird: '🐦',
  other: '🐾'
};

const SPECIES_COLORS = {
  dog: 'bg-orange-500',
  cat: 'bg-purple-500',
  bird: 'bg-blue-500',
  other: 'bg-emerald-500'
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetIndex, setSelectedPetIndex] = useState(0);
  const [events, setEvents] = useState<PetEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Load initial data from API
  useEffect(() => {
    const savedUser = localStorage.getItem('petvida_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      fetchPets(parsedUser.id);
      fetchEvents(parsedUser.id);
    }
    
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const fetchPets = async (userId: string) => {
    try {
      const res = await fetch(`/api/pets/${userId}`);
      const data = await res.json();
      setPets(data);
    } catch (e) {
      console.error("Erro ao carregar pets", e);
    }
  };

  const fetchEvents = async (userId: string) => {
    try {
      const res = await fetch(`/api/events/${userId}`);
      const data = await res.json();
      setEvents(data);
    } catch (e) {
      console.error("Erro ao carregar eventos", e);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        new Notification("PetVida", { body: "Notificações ativadas com sucesso!" });
      }
    }
  };

  const sendNotification = (title: string, body: string) => {
    if (notificationPermission === 'granted') {
      new Notification(title, { body, icon: SPECIES_EMOJI.dog });
    }
  };

  const currentPet = pets[selectedPetIndex];

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        localStorage.setItem('petvida_user', JSON.stringify(userData));
        fetchPets(userData.id);
        fetchEvents(userData.id);
      } else {
        alert("Credenciais inválidas");
      }
    } catch (e) {
      // Simple fallback for first time
      const newUser = { id: Date.now().toString(), name: 'Usuário', email, password };
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      setUser(newUser);
      localStorage.setItem('petvida_user', JSON.stringify(newUser));
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('petvida_user');
  };

  const handleAddPet = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const newPet: Pet = {
      id: Date.now().toString(),
      name: formData.get('name') as string,
      species: formData.get('species') as any,
      breed: formData.get('breed') as string,
      weight: formData.get('weight') as string,
      age: formData.get('age') as string,
      healthRecords: [],
      vaccines: []
    };
    
    await fetch('/api/pets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newPet, userId: user.id })
    });
    
    fetchPets(user.id);
    setIsModalOpen(false);
    sendNotification("Novo Pet!", `${newPet.name} foi adicionado à sua família.`);
  };

  const handleAddEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !currentPet) return;
    const formData = new FormData(e.currentTarget);
    const newEvent: PetEvent = {
      id: Date.now().toString(),
      type: formData.get('type') as any,
      description: formData.get('description') as string,
      date: formData.get('date') as string,
      time: formData.get('time') as string,
    };

    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newEvent, userId: user.id, petId: currentPet.id })
    });

    fetchEvents(user.id);
    sendNotification("Evento Agendado", `${newEvent.description} para ${currentPet.name} em ${newEvent.date}.`);
  };

  const handleAIHealth = async () => {
    if (!currentPet) return;
    setIsLoading(true);
    setAiResponse(null);
    try {
      const result = await analyzePetHealth(currentPet);
      setAiResponse(result || "Não foi possível analisar no momento.");
    } catch (error) {
      setAiResponse("Erro ao conectar com a IA.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIDiet = async () => {
    if (!currentPet) return;
    setIsLoading(true);
    setAiResponse(null);
    try {
      const result = await generateDietPlan(currentPet);
      setAiResponse(result || "Não foi possível gerar o plano.");
    } catch (error) {
      setAiResponse("Erro ao conectar com a IA.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIImage = async (style: string) => {
    if (!currentPet) return;
    setIsLoading(true);
    setGeneratedImage(null);
    try {
      const result = await generatePetImage(currentPet, style);
      setGeneratedImage(result);
    } catch (error) {
      setAiResponse("Erro ao gerar imagem.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-brand-cream">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-8 glass-card rounded-3xl text-center"
        >
          <div className="text-6xl mb-4">🐾</div>
          <h1 className="text-3xl font-black text-brand-orange mb-2">PetVida</h1>
          <p className="text-gray-500 mb-8">Cuidados inteligentes para seu pet</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              name="email"
              type="email" 
              placeholder="E-mail" 
              className="w-full p-4 rounded-2xl border-2 border-orange-100 focus:border-brand-orange outline-none transition-all"
              required
            />
            <input 
              name="password"
              type="password" 
              placeholder="Senha" 
              className="w-full p-4 rounded-2xl border-2 border-orange-100 focus:border-brand-orange outline-none transition-all"
              required
            />
            <button className="w-full bg-brand-orange text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 hover:scale-[1.02] transition-transform">
              Entrar ou Criar Conta
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pb-24 max-w-2xl mx-auto min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-brand-orange p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2 text-white font-black text-xl">
          <PawPrint size={24} />
          <span>PetVida</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={requestNotificationPermission}
            className={`p-2 rounded-xl text-white transition-colors ${notificationPermission === 'granted' ? 'bg-emerald-500' : 'bg-white/20'}`}
          >
            {notificationPermission === 'granted' ? <Bell size={20} /> : <BellOff size={20} />}
          </button>
          <button 
            onClick={() => setActiveTab('premium')}
            className="p-2 bg-white/20 rounded-xl text-white hover:bg-white/30 transition-colors"
          >
            <Crown size={20} />
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-xl text-white text-sm font-bold"
          >
            <span className="hidden sm:inline">{user.name}</span>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black">Meus Pets</h2>
                  <p className="text-gray-500 text-sm">Gerencie seus companheiros</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-brand-orange text-white p-3 rounded-2xl shadow-md hover:scale-110 transition-transform"
                >
                  <Plus size={24} />
                </button>
              </div>

              <div className="space-y-3">
                {pets.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <PawPrint size={48} className="mx-auto mb-2 opacity-20" />
                    <p className="font-bold">Nenhum pet cadastrado</p>
                  </div>
                ) : pets.map((pet, index) => (
                  <motion.div 
                    key={pet.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedPetIndex(index)}
                    className={`p-4 rounded-3xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                      selectedPetIndex === index 
                        ? 'border-brand-orange bg-white shadow-md' 
                        : 'border-transparent bg-white/50'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${SPECIES_COLORS[pet.species]}`}>
                      {SPECIES_EMOJI[pet.species]}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{pet.name}</h3>
                      <p className="text-sm text-gray-500">{pet.breed} • {pet.age}</p>
                    </div>
                    <ChevronRight className="text-gray-300" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'health' && (
            <motion.div 
              key="health"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-black">Saúde</h2>
              
              {/* AI Analysis Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 font-bold">
                      <Sparkles size={20} />
                      <span>Análise IA</span>
                    </div>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full uppercase tracking-wider font-black">Premium</span>
                  </div>
                  <p className="text-indigo-100 text-sm mb-4">
                    A IA analisa o histórico do {currentPet?.name} e dá recomendações personalizadas.
                  </p>
                  <button 
                    onClick={handleAIHealth}
                    disabled={isLoading || !currentPet}
                    className="w-full bg-white text-indigo-600 font-black py-3 rounded-2xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent" /> : <Sparkles size={18} />}
                    Analisar Saúde
                  </button>
                </div>
                <div className="absolute -right-4 -bottom-4 text-white/10 rotate-12">
                  <HeartPulse size={120} />
                </div>
              </div>

              {aiResponse && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-white rounded-3xl border-2 border-indigo-100 text-sm leading-relaxed whitespace-pre-wrap"
                >
                  {aiResponse}
                </motion.div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div className="p-6 glass-card rounded-3xl">
                  <div className="flex items-center gap-2 font-bold mb-4 text-brand-orange">
                    <Stethoscope size={20} />
                    <span>Registros Médicos</span>
                  </div>
                  <div className="space-y-3">
                    {currentPet?.healthRecords.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center">Nenhum registro</p>
                    ) : currentPet?.healthRecords.map(record => (
                      <div key={record.id} className="flex items-center gap-3 p-3 bg-brand-cream rounded-2xl">
                        <div className="w-2 h-2 rounded-full bg-brand-orange" />
                        <div>
                          <p className="font-bold text-sm">{record.type} - {record.description}</p>
                          <p className="text-xs text-gray-500">{record.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 glass-card rounded-3xl">
                  <div className="flex items-center gap-2 font-bold mb-4 text-emerald-600">
                    <Syringe size={20} />
                    <span>Vacinas</span>
                  </div>
                  <div className="space-y-3">
                    {currentPet?.vaccines.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center">Nenhuma vacina</p>
                    ) : currentPet?.vaccines.map(v => (
                      <div key={v.id} className="flex items-center gap-3 p-3 bg-brand-cream rounded-2xl">
                        <div className={`w-2 h-2 rounded-full ${v.status === 'Aplicada' ? 'bg-emerald-500' : 'bg-orange-400'}`} />
                        <div>
                          <p className="font-bold text-sm">{v.name}</p>
                          <p className="text-xs text-gray-500">{v.date} • {v.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'agenda' && (
            <motion.div 
              key="agenda"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-black">Agenda</h2>
              <div className="p-6 glass-card rounded-3xl">
                <div className="flex items-center gap-2 font-bold mb-4 text-blue-600">
                  <CalendarDays size={20} />
                  <span>Próximos Eventos</span>
                </div>
                <div className="space-y-4">
                  {events.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <CalendarDays size={48} className="mx-auto mb-2 opacity-20" />
                      <p className="font-bold">Nenhum evento agendado</p>
                    </div>
                  ) : events.map(event => (
                    <div key={event.id} className="flex items-center gap-4 p-4 bg-brand-cream rounded-2xl">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                        <CalendarDays size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{event.description}</p>
                        <p className="text-xs text-gray-500">{event.date} às {event.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <form onSubmit={handleAddEvent} className="mt-6 p-4 bg-white rounded-2xl border-2 border-blue-50 space-y-3">
                  <p className="text-xs font-black text-blue-600 uppercase">Novo Compromisso</p>
                  <select name="type" className="w-full p-3 bg-brand-cream rounded-xl text-sm outline-none">
                    <option value="Banho">Banho</option>
                    <option value="Tosa">Tosa</option>
                    <option value="Veterinário">Veterinário</option>
                    <option value="Vacina">Vacina</option>
                  </select>
                  <input name="description" placeholder="Descrição" className="w-full p-3 bg-brand-cream rounded-xl text-sm outline-none" required />
                  <div className="grid grid-cols-2 gap-2">
                    <input name="date" type="date" className="w-full p-3 bg-brand-cream rounded-xl text-sm outline-none" required />
                    <input name="time" type="time" className="w-full p-3 bg-brand-cream rounded-xl text-sm outline-none" required />
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm">Agendar</button>
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === 'premium' && (
            <motion.div 
              key="premium"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="text-center py-6">
                <div className="text-5xl mb-2">👑</div>
                <h2 className="text-2xl font-black">Recursos Premium</h2>
                <p className="text-gray-500 text-sm">Potencializado por Inteligência Artificial</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="p-6 glass-card rounded-3xl border-2 border-brand-orange/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 font-bold text-brand-orange">
                      <Utensils size={20} />
                      <span>Plano Alimentar IA</span>
                    </div>
                    <Sparkles size={16} className="text-brand-orange" />
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Gere uma dieta personalizada baseada na raça, peso e idade.</p>
                  <button 
                    onClick={handleAIDiet}
                    disabled={isLoading || !currentPet}
                    className="w-full bg-brand-orange text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"
                  >
                    {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <Sparkles size={18} />}
                    Gerar Plano
                  </button>
                </div>

                <div className="p-6 glass-card rounded-3xl border-2 border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 font-bold text-purple-600">
                      <Camera size={20} />
                      <span>Retrato IA</span>
                    </div>
                    <Sparkles size={16} className="text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Crie uma imagem artística do seu pet em diferentes estilos.</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {['Realista', 'Pixar', 'Aquarela', 'Anime'].map(style => (
                      <button 
                        key={style}
                        onClick={() => handleAIImage(style)}
                        disabled={isLoading || !currentPet}
                        className="p-2 bg-purple-50 text-purple-600 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors"
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                  {generatedImage && (
                    <motion.img 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      src={generatedImage} 
                      className="w-full h-64 object-cover rounded-2xl mb-4" 
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex items-center justify-between shadow-2xl z-50">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-brand-orange' : 'text-gray-400'}`}
        >
          <PawPrint size={24} />
          <span className="text-[10px] font-bold">Início</span>
        </button>
        <button 
          onClick={() => setActiveTab('health')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'health' ? 'text-brand-orange' : 'text-gray-400'}`}
        >
          <HeartPulse size={24} />
          <span className="text-[10px] font-bold">Saúde</span>
        </button>
        <button 
          onClick={() => setActiveTab('agenda')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'agenda' ? 'text-brand-orange' : 'text-gray-400'}`}
        >
          <CalendarDays size={24} />
          <span className="text-[10px] font-bold">Agenda</span>
        </button>
        <button 
          onClick={() => setActiveTab('premium')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'premium' ? 'text-brand-orange' : 'text-gray-400'}`}
        >
          <Crown size={24} />
          <span className="text-[10px] font-bold">Premium</span>
        </button>
      </nav>

      {/* Add Pet Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-black mb-1">Adicionar Pet</h3>
              <p className="text-gray-500 text-sm mb-6">Preencha os dados do seu companheiro</p>
              
              <form onSubmit={handleAddPet} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase ml-2">Nome</label>
                  <input name="name" required className="w-full p-4 bg-brand-cream rounded-2xl border-2 border-transparent focus:border-brand-orange outline-none" placeholder="Ex: Rex" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-400 uppercase ml-2">Espécie</label>
                    <select name="species" className="w-full p-4 bg-brand-cream rounded-2xl border-2 border-transparent focus:border-brand-orange outline-none">
                      <option value="dog">Cachorro</option>
                      <option value="cat">Gato</option>
                      <option value="bird">Pássaro</option>
                      <option value="other">Outro</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-400 uppercase ml-2">Idade</label>
                    <input name="age" className="w-full p-4 bg-brand-cream rounded-2xl border-2 border-transparent focus:border-brand-orange outline-none" placeholder="Ex: 3 anos" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase ml-2">Raça</label>
                  <input name="breed" className="w-full p-4 bg-brand-cream rounded-2xl border-2 border-transparent focus:border-brand-orange outline-none" placeholder="Ex: Golden Retriever" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold text-gray-400">Cancelar</button>
                  <button type="submit" className="flex-1 bg-brand-orange text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200">Salvar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
