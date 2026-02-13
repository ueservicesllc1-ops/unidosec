import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Heart, Share2, User, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import { getRecentDonations, type CampaignData, type Donation } from '../services/campaignService';
import PayPalDonationButton from '../components/PayPalDonationButton';

interface Campaign extends CampaignData {
    id: string;
    currentAmount: number;
    donorCount: number;
    createdAt: any;
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
        <div className="max-w-5xl mx-auto px-4 pb-12">
            <div className="grid md:grid-cols-3 gap-8">

                {/* Main Content (Left Column) */}
                <div className="md:col-span-2 space-y-6">
                    <h1 className="text-3xl font-bold text-gray-900 leading-tight">{campaign.title}</h1>

                    <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden shadow-sm">
                        {campaign.imageUrl ? (
                            <img src={campaign.imageUrl} alt={campaign.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <Heart className="h-16 w-16 opacity-50" />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-500 border-b border-gray-100 pb-4">
                        <div className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            <span>{campaign.organizer?.name || 'Organizador'}</span>
                        </div>
                        <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{campaign.organizer?.city || 'Ecuador'}</span>
                        </div>
                        <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>Hace instantes</span> {/* TODO: Format date */}
                        </div>
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-semibold uppercase">{campaign.category}</span>
                    </div>

                    <div className="prose max-w-none text-gray-700">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Historia</h3>
                        <p className="whitespace-pre-line leading-relaxed">{campaign.description}</p>
                    </div>

                    {/* Prominent Recent Donations Section */}
                    <div className="pt-8 border-t border-gray-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Donaciones Recientes ({campaign.donorCount})</h3>

                        {recentDonations.length > 0 ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {recentDonations.map((donation) => (
                                    <div key={donation.id} className="flex items-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                        <div className="bg-green-100 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 mr-4">
                                            <Heart className="h-5 w-5 text-green-600" fill="currentColor" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{donation.donorName}</p>
                                            <div className="flex items-center text-sm text-gray-500">
                                                <span className="font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-md mr-2">${donation.amount}</span>
                                                <span>• Hace poco</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-100 border-dashed">
                                <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <h4 className="text-gray-900 font-medium mb-1">Sé el primero en donar</h4>
                                <p className="text-gray-500 text-sm">Tu donación inspirará a otros a apoyar esta causa.</p>
                            </div>
                        )}
                    </div>

                    {/* Updates Section Placeholder */}
                    <div className="border-t border-gray-100 pt-8 mt-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Actualizaciones</h3>
                        <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500 text-sm">
                            No hay actualizaciones todavía.
                        </div>
                    </div>
                </div>

                {/* Sidebar (Right Column) - Donation Card */}
                <div className="md:col-span-1">
                    <div className="sticky top-24 bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-6">

                        {/* Progress */}
                        <div>
                            <div className="flex items-baseline mb-1">
                                <span className="text-3xl font-bold text-gray-900">${campaign.currentAmount.toLocaleString()}</span>
                                <span className="text-sm text-gray-500 ml-1">recaudados de ${campaign.goal.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                                <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                            </div>
                            <p className="text-sm text-gray-500">{campaign.donorCount} donantes</p>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <div className="w-full">
                                <PayPalDonationButton
                                    campaignId={campaign.id}
                                    onSuccess={handleDonationSuccess}
                                />
                            </div>

                            <button className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-xl transition flex items-center justify-center">
                                <Share2 className="h-4 w-4 mr-2" /> Compartir
                            </button>
                        </div>

                        {/* Trust Badges */}
                        <div className="space-y-3 pt-4 border-t border-gray-100">
                            <div className="flex items-start text-xs text-gray-500">
                                <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                <span>Garantía EcuFund: Tu donación llega a quien lo necesita o te devolvemos el dinero.</span>
                            </div>
                            <div className="flex items-start text-xs text-gray-500">
                                <User className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                                <span>Organizado por {campaign.organizer?.name} en beneficio de {campaign.beneficiary === 'myself' ? 'sí mismo' : 'alguien más'}.</span>
                            </div>
                        </div>

                        {/* Recent Donations */}
                        <div className="pt-4 border-t border-gray-100 max-h-96 overflow-y-auto">
                            <h4 className="font-bold text-gray-900 mb-3 text-sm">Donaciones Recientes</h4>

                            {recentDonations.length > 0 ? (
                                <div className="space-y-4">
                                    {recentDonations.map((donation) => (
                                        <div key={donation.id} className="flex items-center space-x-3">
                                            <div className="bg-green-100 p-2 rounded-full flex-shrink-0">
                                                <Heart className="h-4 w-4 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{donation.donorName}</p>
                                                <div className="flex items-center text-xs text-gray-500">
                                                    <span className="font-bold text-green-700 mr-1">${donation.amount}</span>
                                                    <span>• Reciente</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 italic">Sé el primero en donar.</p>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default CampaignDetails;
