import React from 'react';

const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-neutral-white/80 backdrop-blur-xs border border-neutral-white/20 rounded-xl p-6 shadow-soft hover:shadow-hover transition-shadow duration-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
