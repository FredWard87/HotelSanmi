// contexts/AnimationContext.js
import React, { createContext, useContext, useState } from 'react';

const AnimationContext = createContext();

export const AnimationProvider = ({ children }) => {
  const [animationsPaused, setAnimationsPaused] = useState(false);

  const pauseAnimations = () => {
    console.log('🔄 Pausando animaciones del home');
    setAnimationsPaused(true);
  };

  const resumeAnimations = () => {
    console.log('🔄 Reanudando animaciones del home');
    setAnimationsPaused(false);
  };

  return (
    <AnimationContext.Provider value={{ 
      animationsPaused, 
      pauseAnimations, 
      resumeAnimations 
    }}>
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation debe ser usado dentro de AnimationProvider');
  }
  return context;
};