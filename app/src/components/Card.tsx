import React from 'react';
import './Card.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className="card-container">
      <div className={`card-content ${className}`}>
        {children}
      </div>
    </div>
  );
};

export default Card;

