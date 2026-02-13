import React from 'react';
import { Menu, Bell, User } from 'lucide-react';
import Button from './Button';

const Navbar = ({ onMenuToggle }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-neutral-white/90 backdrop-blur-xs border-b border-neutral-white/20 shadow-soft h-16 flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-neutral-light transition-colors"
        >
          <Menu className="w-6 h-6 text-primary" />
        </button>
        <h1 className="text-2xl font-bold text-primary">ECOLEARNIA</h1>
      </div>

      <div className="hidden md:flex space-x-6">
        <a href="#" className="text-primary hover:text-secondary transition-colors">Dashboard</a>
        <a href="#" className="text-primary hover:text-secondary transition-colors">Parcours</a>
        <a href="#" className="text-primary hover:text-secondary transition-colors">Profil</a>
      </div>

      <div className="flex items-center space-x-4">
        <button className="p-2 rounded-lg hover:bg-neutral-light transition-colors">
          <Bell className="w-6 h-6 text-primary" />
        </button>
        <button className="p-2 rounded-lg hover:bg-neutral-light transition-colors">
          <User className="w-6 h-6 text-primary" />
        </button>
        <Button size="sm">Se connecter</Button>
      </div>
    </nav>
  );
};

export default Navbar;
