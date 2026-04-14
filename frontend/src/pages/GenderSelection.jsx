import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';

const GenderSelection = () => {
  const navigate = useNavigate();
  const { setGender, language, setLanguage } = useApp();

  const handleSelect = (selectedGender) => {
    setGender(selectedGender);
    navigate('/home');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans overflow-hidden" data-testid="gender-selection-page">
      {/* Language Toggle */}
      <button
        onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-full text-sm font-medium border border-white/20 hover:bg-white/20 transition-all text-white"
        data-testid="language-toggle"
      >
        {language === 'ar' ? 'English' : 'العربية'}
      </button>

      {/* Men's Section - GENTLEMEN */}
      <div 
        onClick={() => handleSelect('male')}
        className="flex-1 bg-gray-950 flex flex-col items-center justify-center p-10 cursor-pointer group transition-all duration-500 hover:bg-black border-r border-yellow-600/20 relative overflow-hidden"
        data-testid="select-male"
      >
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity duration-500 group-hover:scale-105"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1773904215697-e6c21fc27ac2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzJ8MHwxfHNlYXJjaHw0fHxsdXh1cnklMjBiYXJiZXIlMjBzaG9wfGVufDB8fHx8MTc3NjE2ODQ1MXww&ixlib=rb-4.1.0&q=85)`
          }}
        />
        
        <div className="relative z-10 text-center">
          <div className="text-8xl mb-6 group-hover:scale-110 transition-transform duration-300">💈</div>
          <h2 className="text-5xl md:text-6xl font-black text-yellow-500 mb-4 tracking-tighter">
            GENTLEMEN
          </h2>
          <p className="text-gray-500 text-sm uppercase tracking-widest">
            Barber Hub - Luxury Experience
          </p>
          <div className="mt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <span className="bg-yellow-500 text-black px-8 py-3 rounded-xl font-bold inline-block">
              {language === 'ar' ? 'ادخل' : 'Enter'}
            </span>
          </div>
        </div>
      </div>

      {/* Women's Section - LADIES */}
      <div 
        onClick={() => handleSelect('female')}
        className="flex-1 bg-rose-50 flex flex-col items-center justify-center p-10 cursor-pointer group transition-all duration-500 hover:bg-white relative overflow-hidden"
        data-testid="select-female"
      >
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity duration-500 group-hover:scale-105"
          style={{
            backgroundImage: `url(https://images.pexels.com/photos/7195812/pexels-photo-7195812.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)`
          }}
        />
        
        <div className="relative z-10 text-center">
          <div className="text-8xl mb-6 group-hover:scale-110 transition-transform duration-300">💅</div>
          <h2 className="text-5xl md:text-6xl font-black text-rose-400 mb-4 tracking-tighter">
            LADIES
          </h2>
          <p className="text-gray-400 text-sm uppercase tracking-widest">
            Beauty Hub - Royal Care
          </p>
          <div className="mt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <span className="bg-rose-400 text-white px-8 py-3 rounded-xl font-bold inline-block">
              {language === 'ar' ? 'ادخل' : 'Enter'}
            </span>
          </div>
        </div>
      </div>

      {/* Center Logo */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <div className="text-center animate-pulse">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter">
            <span className="text-yellow-500">BARBER</span>
            <span className="text-white mx-2">•</span>
            <span className="text-rose-400">HUB</span>
          </h1>
        </div>
      </div>
    </div>
  );
};

export default GenderSelection;
