import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Users, ShieldCheck, User } from 'lucide-react';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { CampaignData } from '../services/campaignService';

interface Campaign extends CampaignData {
    id: string;
    currentAmount: number;
    donorCount: number;
    createdAt: any;
}

const Home = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
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
                // Removed orderBy temporarily to ensure campaigns show up (in case of index issues or missing fields)
                const q = query(collection(db, "campaigns"), limit(6));
                const querySnapshot = await getDocs(q);
                const fetchedCampaigns = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Campaign[];
                setCampaigns(fetchedCampaigns);
            } catch (error) {
                console.error("Error fetching campaigns:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCampaigns();
    }, []);

    return (
        <div className="space-y-16">
            {/* Hero Carousel Section */}
            <section className="relative h-[600px] flex items-center overflow-hidden">
                {/* Background Images */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent z-10" />
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
                <div className="container mx-auto px-6 relative z-20">
                    <div className="max-w-2xl text-white space-y-8">
                        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight">
                            Uniendo a Ecuador <br />
                            <span className="text-primary-400 text-green-400">en momentos difíciles</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-200 font-light">
                            La plataforma número 1 para recaudar fondos en Ecuador.
                            Ayuda médica, emergencias, educación y más.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Link
                                to="/start-campaign"
                                className="bg-primary hover:bg-green-600 text-white px-8 py-4 rounded-full font-bold text-lg transition shadow-lg hover:shadow-green-500/30 transform hover:-translate-y-1 text-center"
                            >
                                Iniciar una campaña
                            </Link>
                            <Link
                                to="/explore"
                                className="bg-white/10 backdrop-blur-md border border-white/30 text-white hover:bg-white/20 px-8 py-4 rounded-full font-bold text-lg transition text-center"
                            >
                                Donar a una causa
                            </Link>
                        </div>

                        {/* Trust Indicators */}
                        <div className="pt-8 flex items-center gap-6 text-sm text-gray-300">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-green-400" />
                                <span>Verificación de identidad</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Heart className="h-5 w-5 text-green-400" />
                                <span>+1000 campañas exitosas</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content Container */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 pb-16">
                {/* Stats / Trust */}
                <section className="grid md:grid-cols-3 gap-8 text-center">
                    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <Heart className="h-10 w-10 text-primary mx-auto mb-4" />
                        <h3 className="font-bold text-xl mb-2">100% Ecuatoriano</h3>
                        <p className="text-gray-600">Diseñado para funcionar con bancos locales y métodos de pago que usas.</p>
                    </div>
                    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <ShieldCheck className="h-10 w-10 text-secondary mx-auto mb-4" />
                        <h3 className="font-bold text-xl mb-2">Verificación Real</h3>
                        <p className="text-gray-600">Validamos cada campaña con cédula y documentos para tu seguridad.</p>
                    </div>
                    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <Users className="h-10 w-10 text-accent mx-auto mb-4" />
                        <h3 className="font-bold text-xl mb-2">Comunidad Solidaria</h3>
                        <p className="text-gray-600">Comparte fácilmente en WhatsApp y llega a miles de personas.</p>
                    </div>
                </section>

                {/* Featured Campaigns */}
                <section>
                    <div className="flex justify-between items-end mb-8">
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Campañas Recientes</h2>
                        {/* <Link to="/explore" className="text-primary font-bold flex items-center hover:underline">
              Ver todas <ArrowRight className="h-4 w-4 ml-1" />
          </Link> */}
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl">
                            <p className="text-gray-500">No hay campañas activas en este momento.</p>
                            <Link to="/start-campaign" className="text-primary font-bold mt-2 inline-block">¡Sé el primero en iniciar una!</Link>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-8">
                            {campaigns.map((camp) => (
                                <Link to={`/campaign/${camp.id}`} key={camp.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition border border-gray-100 flex flex-col group h-full">
                                    <div className="relative aspect-video bg-gray-200 overflow-hidden">
                                        {camp.imageUrl ? (
                                            <img src={camp.imageUrl} alt={camp.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-400">
                                                <Heart className="h-12 w-12 opacity-50" />
                                            </div>
                                        )}
                                        <span className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-700 uppercase tracking-wide">
                                            {camp.category}
                                        </span>
                                    </div>
                                    <div className="p-5 flex-grow flex flex-col">
                                        <h3 className="font-bold text-lg mb-2 line-clamp-2 leading-tight group-hover:text-primary transition">{camp.title}</h3>
                                        <p className="text-gray-500 text-sm mb-4 line-clamp-3 flex-grow">
                                            {camp.description}
                                        </p>

                                        <div className="mb-4">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-bold text-gray-900">${camp.currentAmount.toLocaleString()}</span>
                                                <span className="text-gray-500">de ${camp.goal.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2">
                                                <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min((camp.currentAmount / camp.goal) * 100, 100)}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2 pt-4 border-t border-gray-50">
                                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                                <User className="h-4 w-4" />
                                            </div>
                                            <span className="text-sm text-gray-600 truncate flex-1">por {camp.organizer?.name || 'Anónimo'}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Home;
