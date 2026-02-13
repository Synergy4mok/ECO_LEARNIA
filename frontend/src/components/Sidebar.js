import React from 'react';
import { Home, BookOpen, User, Settings, Leaf } from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const menuItems = [
    { icon: Home, label: 'Dashboard', href: '#' },
    { icon: BookOpen, label: 'Parcours d\'apprentissage', href: '#' },
    { icon: Leaf, label: 'Empreinte carbone', href: '#' },
    { icon: User, label: 'Profil', href: '#' },
    { icon: Settings, label: 'Paramètres', href: '#' },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-neutral-white/90 backdrop-blur-xs border-r border-neutral-white/20 shadow-soft transform transition-transform duration-200 ease-in-out z-50 lg:translate-x-0 lg:static lg:top-0 lg:h-screen lg:w-64 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="p-6 space-y-4">
          {menuItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center space-x-3 px-4 py-3 text-primary hover:bg-secondary hover:text-neutral-white rounded-lg transition-all duration-200 group"
            >
              <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-medium">{item.label}</span>
            </a>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
