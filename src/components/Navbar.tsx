import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Search, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/');
        } catch {
            console.error('Failed to log out');
        }
    };

    return (
        <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">

                    {/* Left: Logo */}
                    <div className="flex-shrink-0 flex items-center">
                        <Link to="/">
                            <img src="/logo.png" alt="Unidos EC" className="h-10 w-auto" />
                        </Link>
                    </div>

                    {/* Center: Navigation & Search */}
                    <div className="hidden md:flex flex-1 items-center justify-center space-x-8 px-8">
                        <Link to="/explore" className="text-gray-600 hover:text-primary font-medium transition-colors">Explorar</Link>
                        <Link to="/how-it-works" className="text-gray-600 hover:text-primary font-medium transition-colors">Cómo funciona</Link>

                        <div className="relative group w-full max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar campañas..."
                                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-full leading-5 bg-gray-50 text-gray-900 placeholder-gray-500 focus:outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm transition-all duration-200"
                            />
                        </div>
                    </div>

                    {/* Right: User Actions */}
                    <div className="hidden md:flex items-center space-x-4">
                        {user ? (
                            <div className="flex items-center space-x-4">
                                <div className="text-right hidden lg:block">
                                    <p className="text-sm font-bold text-gray-900 leading-none">{user.displayName?.split(' ')[0]}</p>
                                    <p className="text-xs text-green-600 font-medium">Conectado</p>
                                </div>
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
                            className="bg-primary hover:bg-[#008f5b] text-white px-5 py-2.5 rounded-full font-bold shadow-lg shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5"
                        >
                            Iniciar Campaña
                        </Link>
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                        >
                            {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-white border-t border-gray-100 absolute w-full shadow-xl">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <Link to="/explore" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50" onClick={() => setIsOpen(false)}>Explorar</Link>
                        <Link to="/how-it-works" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50" onClick={() => setIsOpen(false)}>Cómo funciona</Link>
                        {!user && (
                            <Link to="/login" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50" onClick={() => setIsOpen(false)}>Ingresar</Link>
                        )}
                    </div>
                    {user && (
                        <div className="pt-4 pb-4 border-t border-gray-100">
                            <div className="flex items-center px-5">
                                <div className="ml-3">
                                    <div className="text-base font-medium leading-none text-gray-800">{user.displayName}</div>
                                    <div className="text-sm font-medium leading-none text-gray-500 mt-1">{user.email}</div>
                                </div>
                                <button
                                    onClick={() => { handleLogout(); setIsOpen(false); }}
                                    className="ml-auto flex-shrink-0 p-1 text-red-500 hover:bg-red-50 rounded-full"
                                >
                                    <LogOut className="h-6 w-6" />
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="p-4 border-t border-gray-100">
                        <Link
                            to="/start-campaign"
                            className="flex w-full items-center justify-center bg-primary text-white px-4 py-3 rounded-xl font-bold text-lg shadow-md"
                            onClick={() => setIsOpen(false)}
                        >
                            Iniciar Campaña
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
