import React from 'react';

const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-200 ease-in-out rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variants = {
    primary: 'bg-gradient-to-br from-primary to-secondary text-neutral-white hover:shadow-hover hover:-translate-y-0.5 focus:ring-primary',
    secondary: 'bg-neutral-white text-primary border border-primary hover:bg-primary hover:text-neutral-white focus:ring-primary',
    accent: 'bg-accent text-neutral-white hover:bg-opacity-90 focus:ring-accent',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
