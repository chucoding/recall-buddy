import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className="flex flex-col h-screen items-center justify-center bg-linear-to-br from-primary to-primary-dark text-white text-center p-4">
      <div className={`bg-white/10 rounded-2xl p-10 backdrop-blur-sm border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] max-w-[400px] w-full ${className}`}>
        {children}
      </div>
    </div>
  );
};

export default Card;
