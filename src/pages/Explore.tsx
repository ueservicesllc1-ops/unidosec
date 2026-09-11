import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Heart, User } from 'lucide-react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { CampaignData } from '../services/campaignService';

interface Campaign extends CampaignData {
    id: string;
    currentAmount: number;
    donorCount: number;
    createdAt: any;
    status?: string;
}

const Explore = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || '');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get("category"));

    // Categories same as in StartCampaign.tsx
    const categories = ["Salud", "Emergencia", "Educación", "Animales", "Memorial", "Comunidad"];

    useEffect(() => {
        const categoryFromUrl = searchParams.get("category");
        if (categoryFromUrl) {
            setSelectedCategory(categoryFromUrl);
        }
        const searchFromUrl = searchParams.get("search");
        if (searchFromUrl !== null) {
            setSearchQuery(searchFromUrl);
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                const q = query(collection(db, "campaigns"));
                const querySnapshot = await getDocs(q);
                const fetchedCampaigns = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Campaign[];
                
                // Sort by createdAt desc
                fetchedCampaigns.sort((a, b) => {
                    const dateA = a.createdAt?.seconds || 0;
                    const dateB = b.createdAt?.seconds || 0;
                    return dateB - dateA;
                });

                setCampaigns(fetchedCampaigns);
            } catch (error) {
                console.error("Error fetching campaigns:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCampaigns();
    }, []);

    // Filter campaigns
    const filteredCampaigns = campaigns.filter(camp => {
        const matchesSearch = camp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            camp.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory ? camp.category === selectedCategory : true;
        const isVisible = camp.status === 'active' || camp.status === 'approved';
        return matchesSearch && matchesCategory && isVisible;
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8 min-h-screen">
            <div className="text-center space-y-2 sm:space-y-3 py-4 sm:py-6">
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">Ayuda a una causa hoy</h1>
                <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto">Explora causas verificadas que necesitan el apoyo solidario de todos.</p>
            </div>

            {/* Filters and Search */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 sticky top-2 sm:top-4 z-10 backdrop-blur-lg bg-white/95">
                <div className="flex flex-col md:flex-row gap-3 sm:gap-4 items-center justify-between">

                    {/* Search Bar */}
                    <div className="relative w-full md:w-80">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="pl-10 pr-4 py-2 w-full text-xs sm:text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-primary/20 focus:border-primary transition bg-gray-50/50"
                            placeholder="Buscar por título, causa, ciudad..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Categories */}
                    <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto no-scrollbar scroll-smooth">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${selectedCategory === null
                                ? 'bg-primary text-white shadow-sm shadow-primary/30'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Todas
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${selectedCategory === cat
                                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Campaign Grid */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-16 px-4 bg-gray-50 rounded-3xl border border-dashed border-gray-200 max-w-md mx-auto">
                    <p className="text-gray-600 font-bold text-base mb-1">No encontramos campañas con esos criterios.</p>
                    <p className="text-gray-400 text-xs mb-4">Prueba buscando con otras palabras o selecciona otra categoría.</p>
                    <button
                        onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
                        className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-[#008f5b] transition"
                    >
                        Limpiar filtros
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 pb-12">
                    {filteredCampaigns.map((camp) => (
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
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Explore;
