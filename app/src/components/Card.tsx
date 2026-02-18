import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className="flex flex-col h-screen items-center justify-center bg-bg text-text text-center p-4">
      <div className={`bg-surface rounded-2xl p-10 border border-border shadow-[0_8px_32px_rgba(0,0,0,0.3)] max-w-[400px] w-full ${className}`}>
        {children}
      </div>
    </div>
  );
};

export default Card;
