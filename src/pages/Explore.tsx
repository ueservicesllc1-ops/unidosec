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
    const [searchQuery, setSearchQuery] = useState('');
    const [searchParams] = useSearchParams();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get("category"));

    // Categories same as in StartCampaign.tsx
    const categories = ["Salud", "Emergencia", "Educación", "Animales", "Memorial", "Comunidad"];

    useEffect(() => {
        const categoryFromUrl = searchParams.get("category");
        if (categoryFromUrl) {
            setSelectedCategory(categoryFromUrl);
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                // Removed orderBy temporarily
                const q = query(collection(db, "campaigns"));
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

    // Filter campaigns
    const filteredCampaigns = campaigns.filter(camp => {
        const matchesSearch = camp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            camp.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory ? camp.category === selectedCategory : true;
        const isVisible = camp.status !== 'hidden' && camp.status !== 'reported';
        return matchesSearch && matchesCategory && isVisible;
    });

    return (
        <div className="space-y-8 min-h-screen">
            <div className="text-center space-y-4 py-8">
                <h1 className="text-3xl md:text-5xl font-bold text-gray-900">Ayuda a una causa hoy</h1>
                <p className="text-gray-600 max-w-2xl mx-auto">Explora campañas que necesitan tu apoyo.</p>
            </div>

            {/* Filters and Search */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-4 z-10 backdrop-blur-lg bg-white/90">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">

                    {/* Search Bar */}
                    <div className="relative w-full md:w-1/3">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-full focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                            placeholder="Buscar campañas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Categories */}
                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${selectedCategory === null
                                ? 'bg-primary text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Todas
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${selectedCategory === cat
                                    ? 'bg-primary text-white shadow-md'
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
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-500 text-lg mb-4">No encontramos campañas con esos criterios.</p>
                    <button
                        onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
                        className="text-primary font-bold hover:underline"
                    >
                        Limpiar filtros
                    </button>
                </div>
            ) : (
                <div className="grid md:grid-cols-3 gap-8 pb-12">
                    {filteredCampaigns.map((camp) => (
                        <Link to={`/campaign/${camp.id}`} key={camp.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition duration-300 border border-gray-100 flex flex-col h-full group">
                            <div className="relative aspect-video bg-gray-200 overflow-hidden">
                                {camp.imageUrl ? (
                                    <img src={camp.imageUrl} alt={camp.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400">
                                        <Heart className="h-12 w-12 opacity-50" />
                                    </div>
                                )}
                                <span className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-700 uppercase tracking-wide shadow-sm">
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
        </div>
    );
};

export default Explore;
