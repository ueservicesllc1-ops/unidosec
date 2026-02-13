import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Heart, Share2, User, MapPin, Facebook, Link as LinkIcon, MessageCircle } from 'lucide-react';
import { getRecentDonations, type CampaignData, type Donation } from '../services/campaignService';
import PayPalDonationButton from '../components/PayPalDonationButton';

// Helper to extract YouTube ID
const getYouTubeEmbedUrl = (url: string) => {
    try {
        const videoId = url.split('v=')[1]?.split('&')[0];
        const shortId = url.split('youtu.be/')[1];
        const id = videoId || shortId;
        return id ? `https://www.youtube.com/embed/${id}` : null;
    } catch (e) {
        return null;
    }
};

interface Campaign extends CampaignData {
    id: string;
    currentAmount: number;
    donorCount: number;
    createdAt: any;
    videoUrl?: string;          // New field
    additionalImages?: string[]; // New field
}

const CampaignDetails = () => {
    const { id } = useParams<{ id: string }>();
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [loading, setLoading] = useState(true);
    const [recentDonations, setRecentDonations] = useState<Donation[]>([]);

    const fetchData = async () => {
        if (!id) return;
        try {
            // Fetch Campaign
            const docRef = doc(db, "campaigns", id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setCampaign({ id: docSnap.id, ...docSnap.data() } as Campaign);
            } else {
                console.log("No such document!");
            }

            // Fetch Donations
            const donations = await getRecentDonations(id);
            setRecentDonations(donations);

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const handleDonationSuccess = () => {
        // Refresh data to show new donation and updated amount
        fetchData();
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
    if (!campaign) return <div className="text-center py-20">Campaña no encontrada</div>;

    const progress = Math.min((campaign.currentAmount / campaign.goal) * 100, 100);

    return (
        <div className="max-w-6xl mx-auto px-4 pb-12 pt-6">

            {/* FLATTENED GRID: Allows interleaving content for Mobile/Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* 1. MULTIMEDIA SECTION (Left Column Top) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Main Media (Video or Image) */}
                    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-sm">
                        {campaign.videoUrl && getYouTubeEmbedUrl(campaign.videoUrl) ? (
                            <iframe
                                src={getYouTubeEmbedUrl(campaign.videoUrl!)!}
                                title="Campaign Video"
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        ) : campaign.imageUrl ? (
                            <img src={campaign.imageUrl} alt={campaign.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <Heart className="h-16 w-16 opacity-50" />
                            </div>
                        )}
                    </div>

                    {/* Gallery Grid (Additional Images) */}
                    {campaign.additionalImages && campaign.additionalImages.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                            {/* If video exists, show main image as first gallery item */}
                            {campaign.videoUrl && campaign.imageUrl && (
                                <div className="aspect-square rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-primary">
                                    <img src={campaign.imageUrl} className="w-full h-full object-cover" alt="Main" />
                                </div>
                            )}
                            {campaign.additionalImages.map((img, idx) => (
                                <div key={idx} className="aspect-square rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-primary">
                                    <img src={img} className="w-full h-full object-cover" alt={`Gallery ${idx}`} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Social Share Bar */}
                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <span className="font-bold text-gray-700 text-sm">Comparte esta causa:</span>
                        <div className="flex space-x-3">
                            <button className="flex items-center space-x-2 bg-[#1877F2] text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                                <Facebook className="h-4 w-4" />
                                <span className="text-xs font-bold hidden sm:inline">Facebook</span>
                            </button>
                            <button className="flex items-center space-x-2 bg-[#25D366] text-white px-4 py-2 rounded-lg hover:bg-green-600 transition">
                                <MessageCircle className="h-4 w-4" />
                                <span className="text-xs font-bold hidden sm:inline">WhatsApp</span>
                            </button>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    alert('¡Enlace copiado!');
                                }}
                                className="flex items-center space-x-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                            >
                                <LinkIcon className="h-4 w-4" />
                                <span className="text-xs font-bold hidden sm:inline">Copiar</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. SIDEBAR (Right Column - Title + Card) */}
                {/* On Mobile this comes 2nd naturally. On Desktop it floats right. */}
                <div className="lg:col-span-1 lg:row-span-2">
                    <div className="sticky top-24 space-y-6">

                        {/* Title & Organizer (Moved here for better layout) */}
                        <div className="space-y-4">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">{campaign.title}</h1>

                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide">{campaign.category}</span>
                                <div className="flex items-center">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    <span>{campaign.organizer?.city || 'Ecuador'}</span>
                                </div>
                            </div>

                            <div className="flex items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <div className="bg-white p-2 rounded-full mr-3 shadow-sm">
                                    <User className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">Organizado por</p>
                                    <p className="font-medium text-gray-900">{campaign.organizer?.name || 'Organizador'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Donation Card */}
                        <div className="bg-white rounded-2xl shadow-xl border border-indigo-50 p-6 space-y-6">
                            {/* Progress */}
                            <div>
                                <div className="flex items-baseline mb-2 justify-between">
                                    <span className="text-3xl font-bold text-gray-900">${campaign.currentAmount.toLocaleString()}</span>
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">meta: ${campaign.goal.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
                                    <div className="bg-primary h-3 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)]" style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="flex justify-between text-sm text-gray-500 font-medium">
                                    <span>{campaign.donorCount} donantes</span>
                                    <span>{Math.round(progress)}% financiado</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-3">
                                <div className="w-full relative z-10">
                                    <PayPalDonationButton
                                        campaignId={campaign.id}
                                        onSuccess={handleDonationSuccess}
                                    />
                                </div>

                                <button className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-3 px-4 rounded-xl transition flex items-center justify-center shadow-sm">
                                    <Share2 className="h-5 w-5 mr-2" /> Compartir Campaña
                                </button>
                            </div>

                            {/* Mini Recent Donations */}
                            <div className="pt-4 border-t border-gray-100">
                                <h4 className="font-bold text-gray-900 mb-2 text-sm flex items-center">
                                    <Heart className="h-4 w-4 mr-2 text-primary" /> Últimos Aportes
                                </h4>
                                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                                    {recentDonations.length > 0 ? (
                                        recentDonations.slice(0, 3).map((donation) => (
                                            <div key={donation.id} className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600 truncate max-w-[120px]">{donation.donorName}</span>
                                                <span className="font-bold text-green-700">${donation.amount}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">Sin donaciones aún.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* 3. STORY CONTENT (Left Column Bottom) */}
                <div className="lg:col-span-2 space-y-8">

                    <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
                        <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                            <span className="bg-yellow-100 p-2 rounded-lg mr-3">📖</span> La Historia
                        </h3>
                        <p className="whitespace-pre-line">{campaign.description}</p>
                    </div>

                    {/* Full Muro de Donantes */}
                    <div className="pt-8 border-t border-gray-100">
                        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                            <span className="bg-green-100 p-2 rounded-lg mr-3">❤️</span> Muro de Donantes
                        </h3>

                        {recentDonations.length > 0 ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {recentDonations.map((donation) => (
                                    <div key={donation.id} className="flex items-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:translate-y-[-2px] transition-transform duration-300">
                                        <div className="bg-green-100 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 mr-4 shadow-inner">
                                            <Heart className="h-5 w-5 text-green-600" fill="currentColor" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{donation.donorName}</p>
                                            <div className="flex items-center text-sm text-gray-500">
                                                <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md mr-2">${donation.amount}</span>
                                                <span className="text-xs">Donación Verificada</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-gray-50 rounded-2xl p-8 text-center border-2 border-dashed border-gray-200">
                                <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">Nadie ha donado aún. ¡Sé el primero!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CampaignDetails;
