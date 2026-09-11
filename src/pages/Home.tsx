import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Users, ShieldCheck, User, ChevronDown } from 'lucide-react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { CampaignData } from '../services/campaignService';

interface Campaign extends CampaignData {
    id: string;
    currentAmount: number;
    donorCount: number;
    createdAt: any;
    likesCount?: number;
    status?: string;
}

const Home = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [visibleCount, setVisibleCount] = useState(8);
    const [loading, setLoading] = useState(true);
    const [currentSlide, setCurrentSlide] = useState(0);

    const heroImages = [
        "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80", // Charity/Kids
        "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2089&q=80", // Medical/Doctor
        "https://images.unsplash.com/photo-1593113598332-cd288d649433?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80", // Community/Handshake
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % heroImages.length);
        }, 5000); // Change slide every 5 seconds
        return () => clearInterval(timer);
    }, [heroImages.length]); // Added heroImages.length to dependency array

    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                const q = query(collection(db, "campaigns"));
                const querySnapshot = await getDocs(q);
                const fetchedCampaigns = querySnapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as Campaign[];
                
                // Sort by createdAt desc and filter approved/active only
                const sortedAndFiltered = fetchedCampaigns
                    .filter(camp => camp.status === 'active' || camp.status === 'approved')
                    .sort((a, b) => {
                        const dateA = a.createdAt?.seconds || 0;
                        const dateB = b.createdAt?.seconds || 0;
                        return dateB - dateA;
                    });

                setCampaigns(sortedAndFiltered);
            } catch (error) {
                console.error("Error fetching campaigns:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCampaigns();
    }, []);

    return (
        <div className="space-y-12 sm:space-y-16">
            {/* Hero Carousel Section */}
            <section className="relative min-h-[500px] sm:h-[600px] flex items-center overflow-hidden py-12 sm:py-0">
                {/* Background Images */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/30 z-10" />
                    {heroImages.map((img, index) => (
                        <img
                            key={index}
                            src={img}
                            alt={`Slide ${index + 1}`}
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
                        />
                    ))}
                </div>

                {/* Content Overlay */}
                <div className="container mx-auto px-4 sm:px-6 relative z-20">
                    <div className="max-w-2xl text-white space-y-6 sm:space-y-8">
                        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight">
                            Uniendo a Ecuador <br />
                            <span className="text-primary-400 text-green-400">en momentos difíciles</span>
                        </h1>
                        <p className="text-base sm:text-xl md:text-2xl text-gray-200 font-light leading-relaxed">
                            La plataforma número 1 para recaudar fondos en Ecuador.
                            Ayuda médica, emergencias, educación y más.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
                            <Link
                                to="/start-campaign"
                                className="bg-primary hover:bg-green-600 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-full font-bold text-base sm:text-lg transition shadow-lg hover:shadow-green-500/30 transform hover:-translate-y-1 text-center"
                            >
                                Iniciar una campaña
                            </Link>
                            <Link
                                to="/explore"
                                className="bg-white/10 backdrop-blur-md border border-white/30 text-white hover:bg-white/20 px-6 sm:px-8 py-3.5 sm:py-4 rounded-full font-bold text-base sm:text-lg transition text-center"
                            >
                                Donar a una causa
                            </Link>
                        </div>

                        {/* Trust Indicators */}
                        <div className="pt-4 sm:pt-8 flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-300">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 flex-shrink-0" />
                                <span>Verificación de identidad</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 flex-shrink-0" />
                                <span>+1000 campañas exitosas</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content Container */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16 pb-16">
                {/* Stats / Trust */}
                <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-8 text-center">
                    <div className="p-5 sm:p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <Heart className="h-8 w-8 sm:h-10 sm:w-10 text-primary mx-auto mb-3 sm:mb-4" />
                        <h3 className="font-bold text-lg sm:text-xl mb-1.5 sm:mb-2">100% Ecuatoriano</h3>
                        <p className="text-gray-600 text-xs sm:text-sm">Diseñado para funcionar con bancos locales y métodos de pago que usas.</p>
                    </div>
                    <div className="p-5 sm:p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <ShieldCheck className="h-8 w-8 sm:h-10 sm:w-10 text-secondary mx-auto mb-3 sm:mb-4" />
                        <h3 className="font-bold text-lg sm:text-xl mb-1.5 sm:mb-2">Verificación Real</h3>
                        <p className="text-gray-600 text-xs sm:text-sm">Validamos cada campaña con cédula y documentos para tu seguridad.</p>
                    </div>
                    <div className="p-5 sm:p-6 bg-white rounded-2xl shadow-sm border border-gray-100 sm:col-span-2 md:col-span-1">
                        <Users className="h-8 w-8 sm:h-10 sm:w-10 text-accent mx-auto mb-3 sm:mb-4" />
                        <h3 className="font-bold text-lg sm:text-xl mb-1.5 sm:mb-2">Comunidad Solidaria</h3>
                        <p className="text-gray-600 text-xs sm:text-sm">Comparte fácilmente en WhatsApp y llega a miles de personas.</p>
                    </div>
                </section>

                {/* Featured Campaigns */}
                <section>
                    <div className="flex justify-between items-center mb-6 sm:mb-8">
                        <div>
                            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Campañas Recientes</h2>
                            <p className="text-gray-500 text-xs sm:text-sm mt-1">Descubre historias que necesitan de tu apoyo hoy</p>
                        </div>
                        <Link to="/explore" className="text-xs sm:text-sm font-bold text-primary hover:text-[#008f5b] transition">
                            Ver todas &rarr;
                        </Link>
                    </div>

                    {loading ? (
                        <div className="text-center py-16">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="text-center py-12 px-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <p className="text-gray-500 text-sm">No hay campañas activas en este momento.</p>
                            <Link to="/start-campaign" className="text-primary font-bold text-sm mt-2 inline-block hover:underline">¡Sé el primero en iniciar una!</Link>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                                {campaigns.slice(0, visibleCount).map((camp) => (
                                    <Link to={`/campaign/${camp.id}`} key={camp.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition duration-200 border border-gray-100 flex flex-col h-full group">
                                        <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                                            {camp.imageUrl ? (
                                                <img src={camp.imageUrl} alt={camp.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-400">
                                                    <Heart className="h-10 w-10 opacity-40" />
                                                </div>
                                            )}
                                            <span className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur px-2.5 py-0.5 rounded-full text-[10px] font-black text-gray-800 uppercase tracking-wide shadow-sm">
                                                {camp.category}
                                            </span>
                                        </div>
                                        <div className="p-4 flex-grow flex flex-col justify-between">
                                            <div>
                                                <h3 className="font-bold text-sm sm:text-[15px] text-gray-900 mb-1 line-clamp-2 leading-snug group-hover:text-primary transition min-h-[2.5rem]">{camp.title}</h3>
                                                <p className="text-gray-500 text-xs mb-3 line-clamp-2 leading-relaxed">
                                                    {camp.description}
                                                </p>
                                            </div>

                                            <div>
                                                <div className="pt-2">
                                                    <div className="flex justify-between items-baseline text-xs mb-1">
                                                        <span className="font-extrabold text-gray-950 text-sm sm:text-base">${camp.currentAmount.toLocaleString()}</span>
                                                        <span className="text-gray-400 text-xs">de ${camp.goal.toLocaleString()}</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                        <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min((camp.currentAmount / camp.goal) * 100, 100)}%` }}></div>
                                                    </div>
                                                    <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                                                        <span>{camp.donorCount || 0} donantes</span>
                                                        <span>{Math.round(Math.min((camp.currentAmount / camp.goal) * 100, 100))}%</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-2 pt-2.5 mt-2.5 border-t border-gray-50 text-xs text-gray-500">
                                                    <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                                                        <User className="h-3.5 w-3.5" />
                                                    </div>
                                                    <span className="text-xs text-gray-600 truncate flex-1">por {camp.organizer?.name || 'Anónimo'}</span>
                                                    {camp.likesCount !== undefined && camp.likesCount > 0 && (
                                                        <div className="flex items-center text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                            <Heart className="h-3 w-3 mr-1" fill="currentColor" />
                                                            {camp.likesCount}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            {/* Botón Ver Más */}
                            {visibleCount < campaigns.length && (
                                <div className="text-center pt-8 sm:pt-10">
                                    <button
                                        onClick={() => setVisibleCount((prev) => prev + 8)}
                                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white rounded-full font-bold text-sm sm:text-base shadow-sm hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                                    >
                                        <span>Ver más</span>
                                        <ChevronDown className="w-4 h-4 animate-bounce" />
                                    </button>
                                </div>
                            )}

                            {campaigns.length > 8 && visibleCount >= campaigns.length && (
                                <div className="text-center pt-8 sm:pt-10 text-xs sm:text-sm text-gray-400 font-medium">
                                    Has visto todas las campañas disponibles.{" "}
                                    <Link to="/explore" className="text-primary font-bold hover:underline ml-1">
                                        Explorar todas las categorías &rarr;
                                    </Link>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Home;
