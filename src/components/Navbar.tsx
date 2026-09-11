import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Search, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/explore?search=${encodeURIComponent(searchTerm.trim())}`);
            setIsOpen(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/');
        } catch {
            console.error('Failed to log out');
        }
    };

    return (
        <nav className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16 sm:h-20">

                    {/* Left: Logo */}
                    <div className="flex-shrink-0 flex items-center">
                        <Link to="/" className="flex items-center">
                            <img src="/logo.png" alt="Unidos EC" className="h-8 sm:h-10 w-auto" />
                        </Link>
                    </div>

                    {/* Center: Navigation & Search */}
                    <div className="hidden md:flex flex-1 items-center justify-center space-x-8 px-6 lg:px-8">
                        <Link to="/explore" className="text-gray-600 hover:text-primary font-medium transition-colors text-sm lg:text-base">Explorar</Link>
                        <Link to="/how-it-works" className="text-gray-600 hover:text-primary font-medium transition-colors text-sm lg:text-base whitespace-nowrap">Cómo funciona</Link>

                        <form onSubmit={handleSearch} className="relative group w-full max-w-sm lg:max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar campañas..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-full leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary sm:text-xs lg:text-sm transition-all duration-200"
                            />
                        </form>
                    </div>

                    {/* Right: User Actions (Desktop) */}
                    <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
                        {user ? (
                            <div className="flex items-center space-x-2 lg:space-x-3">
                                {/* Notificaciones */}
                                <NotificationBell />
                                {user.email === 'ueservicesllc1@gmail.com' && (
                                    <Link
                                        to="/admin"
                                        className="p-2 text-primary hover:bg-primary/10 transition-colors rounded-full"
                                        title="Panel de Administración"
                                    >
                                        <Shield className="h-5 w-5" />
                                    </Link>
                                )}
                                {/* Avatar + nombre → perfil */}
                                <Link to="/profile" className="flex items-center space-x-2 group">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border-2 border-primary/20 group-hover:border-primary transition-colors object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                            {(user.displayName ?? user.email ?? 'U')[0].toUpperCase()}
                                        </div>
                                    )}
                                    <div className="hidden xl:block text-right">
                                        <p className="text-sm font-bold text-gray-900 leading-none group-hover:text-primary transition-colors">{user.displayName?.split(' ')[0]}</p>
                                        <p className="text-xs text-green-600 font-medium">Conectado</p>
                                    </div>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                                    title="Cerrar sesión"
                                >
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </div>
                        ) : (
                            <Link to="/login" className="text-gray-600 hover:text-primary font-bold text-sm transition-colors">
                                Iniciar Sesión
                            </Link>
                        )}

                        <Link
                            to="/start-campaign"
                            className="bg-primary hover:bg-[#008f5b] text-white px-4 lg:px-5 py-2 lg:py-2.5 rounded-full font-bold text-xs lg:text-sm shadow-lg shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5 whitespace-nowrap"
                        >
                            Iniciar Campaña
                        </Link>
                    </div>

                    {/* Mobile top action buttons */}
                    <div className="md:hidden flex items-center space-x-1 sm:space-x-2">
                        {user && <NotificationBell />}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none transition"
                            aria-label="Menú principal"
                        >
                            {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Drawer */}
            {isOpen && (
                <div className="md:hidden bg-white border-t border-gray-100 shadow-xl">
                    {/* Mobile Search */}
                    <div className="p-3 border-b border-gray-100">
                        <form onSubmit={handleSearch} className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar campañas..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full text-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-primary"
                            />
                        </form>
                    </div>

                    {/* Links */}
                    <div className="px-3 py-2 space-y-1">
                        <Link 
                            to="/explore" 
                            className="block px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:text-primary hover:bg-gray-50 transition" 
                            onClick={() => setIsOpen(false)}
                        >
                            Explorar Campañas
                        </Link>
                        <Link 
                            to="/how-it-works" 
                            className="block px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:text-primary hover:bg-gray-50 transition" 
                            onClick={() => setIsOpen(false)}
                        >
                            Cómo funciona
                        </Link>
                        {user?.email === 'ueservicesllc1@gmail.com' && (
                            <Link 
                                to="/admin" 
                                className="block px-3 py-2.5 rounded-xl text-sm font-bold text-primary hover:bg-primary/5 transition" 
                                onClick={() => setIsOpen(false)}
                            >
                                🛡️ Panel de Administración
                            </Link>
                        )}
                        {user ? (
                            <Link 
                                to="/profile" 
                                className="block px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:text-primary hover:bg-gray-50 transition" 
                                onClick={() => setIsOpen(false)}
                            >
                                Mi Perfil & Mensajes
                            </Link>
                        ) : (
                            <Link 
                                to="/login" 
                                className="block px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:text-primary hover:bg-gray-50 transition" 
                                onClick={() => setIsOpen(false)}
                            >
                                Iniciar Sesión / Registrarse
                            </Link>
                        )}
                    </div>

                    {/* User profile card & logout if logged in */}
                    {user && (
                        <div className="pt-3 pb-3 px-4 border-t border-gray-100 bg-gray-50/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 min-w-0">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                                            {(user.displayName ?? user.email ?? 'U')[0].toUpperCase()}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-gray-900 truncate">{user.displayName || 'Usuario'}</div>
                                        <div className="text-xs text-gray-500 truncate">{user.email}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { handleLogout(); setIsOpen(false); }}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                    title="Cerrar sesión"
                                >
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Mobile CTA */}
                    <div className="p-3 border-t border-gray-100">
                        <Link
                            to="/start-campaign"
                            className="flex w-full items-center justify-center bg-primary hover:bg-[#008f5b] text-white px-4 py-3 rounded-xl font-bold text-sm shadow-md transition"
                            onClick={() => setIsOpen(false)}
                        >
                            + Iniciar Campaña
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
