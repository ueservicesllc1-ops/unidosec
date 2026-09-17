import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Heart, Share2, User, MapPin, Facebook, Link as LinkIcon, MessageCircle, Landmark, X, Instagram, QrCode, Download, Clock, ShieldAlert, ShieldCheck, FileText, CheckCircle2, AlertTriangle, Lock, Info, HelpCircle } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { getRecentDonations, toggleCampaignLike, type CampaignData, type Donation } from '../services/campaignService';
import { useAuth } from '../context/AuthContext';
import { createWithdrawalRequest } from '../services/withdrawalService';
import { uploadVerificationDocument, uploadMedicalDocument, canWithdraw, isCampaignRequiringMedicalDoc, type VerificationDocType } from '../services/medicalVerificationService';
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
    videoUrl?: string;
    additionalImages?: string[];
    likesCount?: number;
    likedBy?: string[];
    // Verificación de documentos y auditoría
    medicalDocumentRequired?: boolean;
    medicalDocumentStatus?: string;
    medicalDocumentUrl?: string;
    medicalAdminNote?: string;
    idDocumentUrl?: string;
    idDocumentStatus?: string;
    id_cardAdminNote?: string;
    bankCertificateUrl?: string;
    bankCertificateStatus?: string;
    bank_certificateAdminNote?: string;
    authorizationLetterUrl?: string;
    authorizationLetterStatus?: string;
    authorization_letterAdminNote?: string;
    additionalVerificationDocUrl?: string;
    userId?: string;
}

const CampaignDetails = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [loading, setLoading] = useState(true);
    const [likeLoading, setLikeLoading] = useState(false);
    const [likeAnimating, setLikeAnimating] = useState(false);
    const [recentDonations, setRecentDonations] = useState<Donation[]>([]);
    const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
    const [showRequirementsModal, setShowRequirementsModal] = useState(false);
    const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

    // Estado para carga de documentos de verificación
    const [uploadingDocType, setUploadingDocType] = useState<VerificationDocType | null>(null);
    const [selectedDocFiles, setSelectedDocFiles] = useState<Record<string, File | null>>({});

    const handleFileUpload = async (docType: VerificationDocType, label: string) => {
        const file = selectedDocFiles[docType];
        if (!file) {
            alert(`Por favor selecciona un archivo para: ${label}`);
            return;
        }
        if (!campaign) return;
        if (!user) {
            alert('Debes iniciar sesión con la cuenta creadora de la campaña para subir documentos.');
            return;
        }

        // Validación de tamaño (máximo 20MB)
        const sizeInMB = file.size / (1024 * 1024);
        if (file.size > 20 * 1024 * 1024) {
            alert(`El archivo "${file.name}" supera el peso máximo permitido (20MB). Tu archivo pesa ${sizeInMB.toFixed(2)}MB. Por favor comprímelo o elige uno más liviano.`);
            return;
        }

        setUploadingDocType(docType);
        try {
            await uploadVerificationDocument(campaign.id, file, docType, user.uid);
            setSelectedDocFiles(prev => ({ ...prev, [docType]: null }));
            await fetchData();
            alert(`✅ ${label} subido exitosamente (${sizeInMB.toFixed(2)} MB). Nuestro equipo de auditoría lo revisará a la brevedad.`);
        } catch (err: any) {
            console.error('Error subiendo documento:', err);
            const msg = err?.message || 'Error al subir el documento. Revisa tu conexión a internet o intenta nuevamente.';
            alert(`❌ No se pudo subir el documento: ${msg}`);
        } finally {
            setUploadingDocType(null);
        }
    };

    const [withdrawalFormData, setWithdrawalFormData] = useState({
        firstName: '',
        lastName: '',
        idNumber: '',
        phone: '',
        email: '',
        address: '',
        ruc: '',
        bankAccountNumber: '',
        bankName: '',
        accountType: 'ahorros'
    });

    // Share Modal state
    const [showShareModal, setShowShareModal] = useState(false);
    const [copied, setCopied] = useState(false);

    // Gallery Modal state
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

    // QR Code Modal State
    const [showQRModal, setShowQRModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

    const handleWithdrawalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!campaign) return;

        const auth = canWithdraw(campaign);
        if (!auth.allowed) {
            const reasons: string[] = auth.blockedBy;
            const msgs = reasons.map((r: string) => {
                if (r === 'NO_FUNDS') return '• No hay fondos recaudados en esta campaña aún.';
                if (r.startsWith('MEDICAL_DOC_NOT_APPROVED')) {
                    const status = r.split(':')[1] || '';
                    if (status === 'under_review') return '• Tu documentación médica está en revisión por nuestro equipo administrativo.';
                    if (status === 'rejected') return '• Tu documentación médica fue rechazada. Debes subir un documento válido con los requisitos exigidos.';
                    if (status === 'more_info_required') return '• Se ha solicitado información médica adicional.';
                    return '• La certificación médica es un requisito obligatorio y debe estar aprobada por auditoría antes del desembolso.';
                }
                return `• ${r}`;
            });
            alert(`🔒 Retiro no disponible\n\n${msgs.join('\n')}\n\nPor favor completa los requisitos de verificación obligatorios.`);
            return;
        }

        setIsSubmittingWithdrawal(true);
        try {
            await createWithdrawalRequest({
                campaignId: campaign.id,
                campaignTitle: campaign.title,
                organizerEmail: campaign.organizer.email,
                ...withdrawalFormData,
                amountRequested: campaign.currentAmount
            });
            alert("✅ Solicitud de retiro enviada correctamente. Nuestro equipo revisará los datos bancarios y la documentación.");
            setShowWithdrawalModal(false);
        } catch (error: any) {
            if (error?.code === 'WITHDRAWAL_BLOCKED') {
                const reasons: string[] = error.reasons ?? [];
                const msgs = reasons.map((r: string) => {
                    if (r === 'NO_FUNDS') return '• No hay fondos recaudados.';
                    if (r.startsWith('MEDICAL_DOC_NOT_APPROVED')) return '• La documentación médica no ha sido aprobada por el administrador.';
                    return `• ${r}`;
                });
                alert(`🔒 Retiro bloqueado\n\n${msgs.join('\n')}`);
            } else {
                alert('Error al enviar la solicitud. Por favor intenta nuevamente.');
            }
            console.error(error);
        } finally {
            setIsSubmittingWithdrawal(false);
        }
    };

    const isOrganizer = !!(
        user &&
        campaign &&
        (
            (user.email && campaign.organizer?.email && user.email.trim().toLowerCase() === campaign.organizer.email.trim().toLowerCase()) ||
            (campaign.userId && user.uid === campaign.userId) ||
            ((campaign.organizer as any)?.uid && user.uid === (campaign.organizer as any).uid)
        )
    );
    // El usuario está logueado pero NO es el organizador (email diferente)
    const isLoggedInButNotOrganizer = !!(user && campaign && !isOrganizer);

    // Get or create a persistent guest ID for anonymous likes
    const getGuestId = () => {
        let gid = localStorage.getItem('ecufund_guest_id');
        if (!gid) {
            gid = 'guest_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('ecufund_guest_id', gid);
        }
        return gid;
    };

    const effectiveUserId = user?.uid || getGuestId();
    const hasLiked = !!(campaign?.likedBy?.includes(effectiveUserId));
    const likesCount = campaign?.likesCount ?? 0;

    const handleLike = async () => {
        if (!campaign || likeLoading) return;
        setLikeLoading(true);
        setLikeAnimating(true);
        setTimeout(() => setLikeAnimating(false), 400);

        // Optimistic UI update
        setCampaign(prev => {
            if (!prev) return prev;
            const alreadyLiked = prev.likedBy?.includes(effectiveUserId);
            return {
                ...prev,
                likesCount: (prev.likesCount ?? 0) + (alreadyLiked ? -1 : 1),
                likedBy: alreadyLiked
                    ? (prev.likedBy ?? []).filter(uid => uid !== effectiveUserId)
                    : [...(prev.likedBy ?? []), effectiveUserId]
            };
        });
        try {
            await toggleCampaignLike(campaign.id, effectiveUserId, hasLiked);
        } catch (e) {
            console.error(e);
            fetchData(); // rollback on error
        } finally {
            setLikeLoading(false);
        }
    };

    const downloadQRCode = () => {
        const canvas = document.getElementById('campaign-qr') as HTMLCanvasElement;
        if (canvas) {
            const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
            let downloadLink = document.createElement("a");
            downloadLink.href = pngUrl;
            downloadLink.download = `QR-${campaign?.title}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    };

    const handleShare = async () => {
        const shareData = {
            title: campaign?.title || 'EcuFund',
            text: campaign?.description?.slice(0, 160) || '¡Apoya esta causa!',
            url: window.location.href,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            try {
                await navigator.clipboard.writeText(window.location.href);
                alert('¡Enlace copiado al portapapeles!');
            } catch (err) {
                console.error('Failed to copy: ', err);
            }
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
    if (!campaign) return <div className="text-center py-20">Campaña no encontrada</div>;

    const isOwner = Boolean(user?.email && campaign.organizer?.email && user.email.toLowerCase() === campaign.organizer.email.toLowerCase());
    const isAdmin = Boolean(user?.email && user.email.toLowerCase() === 'ueservicesllc1@gmail.com');

    // Si la campaña está pendiente de aprobación y no es el dueño ni admin, mostrar pantalla informativa
    if (campaign.status === 'pending' && !isOwner && !isAdmin) {
        return (
            <div className="max-w-xl mx-auto py-20 px-4 text-center">
                <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-gray-100 animate-in fade-in duration-200">
                    <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-amber-50/50">
                        <Clock className="w-8 h-8" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider mb-3">
                        Campaña en Revisión
                    </span>
                    <h1 className="text-2xl font-black text-gray-900 mb-3">
                        Esta campaña aún no está disponible públicamente
                    </h1>
                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                        Pronto estará visible una vez sea aprobada por los administradores dentro de 24 horas. Nuestro equipo de seguridad está validando la información para proteger a la comunidad.
                    </p>
                    <Link
                        to="/explore"
                        className="inline-flex items-center justify-center py-3 px-6 bg-primary text-white font-bold rounded-xl hover:bg-[#008f5b] transition shadow-md shadow-primary/20 text-sm"
                    >
                        Explorar campañas activas
                    </Link>
                </div>
            </div>
        );
    }

    const progress = Math.min((campaign.currentAmount / campaign.goal) * 100, 100);

    const campaignUrl = window.location.href;
    const ogImage = campaign.imageUrl || 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&h=630&q=80';
    const ogDescription = campaign.description
        ? campaign.description.slice(0, 160).replace(/\n/g, ' ')
        : `Apoya la campaña "${campaign.title}" en EcuFund. ¡Tu donación hace la diferencia!`;

    return (
        <div className="max-w-6xl mx-auto px-4 pb-12 pt-6">
            {/* Banner de Campaña en Revisión para el creador y admin */}
            {campaign.status === 'pending' && (
                <div className="mb-6 p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex items-start gap-4 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md">
                                En Revisión Administrativa
                            </span>
                            <span className="text-xs text-amber-800 font-semibold">
                                {isOwner ? 'Solo visible para ti (creador) y administradores' : 'Vista previa de Administrador'}
                            </span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                            ⏳ Pronto estará visible una vez sea aprobada por los administradores dentro de 24 horas.
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                            Durante este periodo de validación, la campaña no aparece en listados públicos ni permite recibir donaciones de terceros.
                        </p>
                    </div>
                </div>
            )}
            <Helmet>
                <title>{campaign.title} | EcuFund</title>
                <meta name="description" content={ogDescription} />

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content={campaignUrl} />
                <meta property="og:title" content={`${campaign.title} | EcuFund`} />
                <meta property="og:description" content={ogDescription} />
                <meta property="og:image" content={ogImage} />
                <meta property="og:image:secure_url" content={ogImage} />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:image:alt" content={campaign.title} />
                <meta property="og:site_name" content="EcuFund" />
                <meta property="fb:app_id" content="123456789012345" />
                <meta property="og:locale" content="es_EC" />

                {/* Twitter Card */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:url" content={campaignUrl} />
                <meta name="twitter:title" content={`${campaign.title} | EcuFund`} />
                <meta name="twitter:description" content={ogDescription} />
                <meta name="twitter:image" content={ogImage} />
                
                {/* Schema.org / Google+ */}
                <meta itemProp="name" content={`${campaign.title} | EcuFund`} />
                <meta itemProp="description" content={ogDescription} />
                <meta itemProp="image" content={ogImage} />
            </Helmet>

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
                            <img 
                                src={campaign.imageUrl} 
                                alt={campaign.title} 
                                className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 hover:scale-105" 
                                onClick={() => setSelectedImage(campaign.imageUrl || null)}
                            />
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
                                <div 
                                    className="aspect-square rounded-lg overflow-hidden cursor-zoom-in border-2 border-transparent hover:border-primary transition-all shadow-sm"
                                    onClick={() => setSelectedImage(campaign.imageUrl || null)}
                                >
                                    <img src={campaign.imageUrl} className="w-full h-full object-cover" alt="Main" />
                                </div>
                            )}
                            {campaign.additionalImages.map((img, idx) => (
                                <div 
                                    key={idx} 
                                    className="aspect-square rounded-lg overflow-hidden cursor-zoom-in border-2 border-transparent hover:border-primary transition-all shadow-sm"
                                    onClick={() => setSelectedImage(img)}
                                >
                                    <img src={img} className="w-full h-full object-cover" alt={`Gallery ${idx}`} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Social Share Bar */}
                    <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <span className="font-bold text-gray-700 text-sm flex-1 min-w-max">Comparte esta causa:</span>
                        <div className="flex flex-wrap gap-2">
                            {/* Like Button */}
                            <button
                                onClick={handleLike}
                                disabled={likeLoading}
                                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg font-bold text-[10px] transition-all duration-200 border-2 ${hasLiked
                                    ? 'bg-pink-500 border-pink-500 text-white shadow-md shadow-pink-200'
                                    : 'bg-white border-pink-200 text-pink-500 hover:bg-pink-50'
                                    }`}
                                title={hasLiked ? 'Quitar Me gusta' : 'Me gusta'}
                            >
                                <Heart
                                    className={`h-4 w-4 transition-transform duration-200 ${likeAnimating ? 'scale-150' : 'scale-100'
                                        }`}
                                    fill={hasLiked ? 'currentColor' : 'none'}
                                />
                                <span className="hidden sm:inline">{hasLiked ? 'Me gusta' : 'Me gusta'}</span>
                                <span className="font-black tabular-nums">{likesCount > 0 ? likesCount : ''}</span>
                            </button>

                            <button
                                onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}
                                className="flex items-center space-x-2 bg-[#1877F2] text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition"
                            >
                                <Facebook className="h-4 w-4" />
                                <span className="text-[10px] font-bold hidden sm:inline">Facebook</span>
                            </button>
                            <button
                                onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Mira esta campaña en EcuFund: ${campaign.title} ${window.location.href}`)}`, '_blank')}
                                className="flex items-center space-x-2 bg-[#25D366] text-white px-3 py-2 rounded-lg hover:bg-green-600 transition"
                            >
                                <MessageCircle className="h-4 w-4" />
                                <span className="text-[10px] font-bold hidden sm:inline">WhatsApp</span>
                            </button>
                            <button
                                onClick={() => alert('Para Instagram, te recomendamos copiar el link y pegarlo en tu biografía o historias.')}
                                className="flex items-center space-x-2 bg-[#E4405F] text-white px-3 py-2 rounded-lg hover:bg-[#d62e4c] transition"
                            >
                                <Instagram className="h-4 w-4" />
                                <span className="text-[10px] font-bold hidden sm:inline">Instagram</span>
                            </button>
                            <button
                                onClick={handleShare}
                                className="flex items-center space-x-2 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition"
                            >
                                <LinkIcon className="h-4 w-4" />
                                <span className="text-[10px] font-bold hidden sm:inline">Link</span>
                            </button>
                            <button
                                onClick={() => setShowQRModal(true)}
                                className="flex items-center space-x-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 transition"
                                title="Generar QR"
                            >
                                <QrCode className="h-4 w-4" />
                                <span className="text-[10px] font-bold hidden sm:inline">QR</span>
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
                                    {campaign.status === 'pending' ? (
                                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-center">
                                            <p className="text-xs font-bold text-amber-900 flex items-center justify-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-amber-600" /> Donaciones Deshabilitadas
                                            </p>
                                            <p className="text-[11px] text-amber-700 mt-1">
                                                Campaña en revisión de seguridad. Estará disponible una vez sea aprobada dentro de 24h.
                                            </p>
                                        </div>
                                    ) : (
                                        <PayPalDonationButton
                                            campaignId={campaign.id}
                                            onSuccess={handleDonationSuccess}
                                        />
                                    )}
                                </div>

                                {/* Like Button (Sidebar) */}
                                <button
                                    onClick={handleLike}
                                    disabled={likeLoading}
                                    className={`w-full font-bold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 border-2 ${hasLiked
                                        ? 'bg-pink-500 border-pink-500 text-white shadow-lg shadow-pink-200'
                                        : 'bg-white border-pink-200 text-pink-500 hover:bg-pink-50'
                                        }`}
                                >
                                    <Heart
                                        className={`h-5 w-5 transition-transform duration-200 ${likeAnimating ? 'scale-150' : 'scale-100'
                                            }`}
                                        fill={hasLiked ? 'currentColor' : 'none'}
                                    />
                                    <span>{hasLiked ? '¡Te gusta!' : 'Me gusta'}</span>
                                    {likesCount > 0 && (
                                        <span className="ml-auto bg-white/30 text-current font-black text-sm px-2 py-0.5 rounded-full">
                                            {likesCount}
                                        </span>
                                    )}
                                </button>

                                <button 
                                    onClick={handleShare}
                                    className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-3 px-4 rounded-xl transition flex items-center justify-center shadow-sm"
                                >
                                    <Share2 className="h-5 w-5 mr-2" /> Compartir Campaña
                                </button>

                                {/* ─────────────────────────────────────────────── */}
                                {/* ZONA DE VERIFICACIÓN Y RETIRO DE FONDOS */}
                                {/* ─────────────────────────────────────────────── */}
                                {isOrganizer ? (() => {
                                    const medRequired = isCampaignRequiringMedicalDoc(campaign);
                                    const medStatus = campaign.medicalDocumentStatus ?? (medRequired ? 'pending_upload' : 'not_required');
                                    const idStatus = campaign.idDocumentStatus ?? 'pending_upload';
                                    const bankStatus = campaign.bankCertificateStatus ?? 'pending_upload';
                                    const authLetterStatus = campaign.authorizationLetterStatus ?? 'pending_upload';
                                    const auth = canWithdraw(campaign);

                                    const renderDocBadge = (status?: string, required = true) => {
                                        if (!required) {
                                            return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-500">Opcional</span>;
                                        }
                                        switch (status) {
                                            case 'approved':
                                                return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Aprobado</span>;
                                            case 'under_review':
                                                return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-100 text-amber-800 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> En Revisión</span>;
                                            case 'rejected':
                                                return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-100 text-red-700 flex items-center gap-1"><X className="w-3.5 h-3.5" /> Rechazado</span>;
                                            case 'more_info_required':
                                                return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-100 text-purple-700 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Requiere Corrección</span>;
                                            default:
                                                return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-100 text-blue-800 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Pendiente de Carga</span>;
                                        }
                                    };

                                    return (
                                        <div className="w-full space-y-4 pt-2">
                                            {/* Cabecera del Centro de Verificación */}
                                            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-700">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                                                        <h4 className="text-sm font-black uppercase tracking-wider text-white">
                                                            Centro de Documentación de Respaldo
                                                        </h4>
                                                    </div>
                                                    <Link
                                                        to="/withdrawal-terms"
                                                        target="_blank"
                                                        className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1"
                                                    >
                                                        Normativa <HelpCircle className="w-3.5 h-3.5 inline" />
                                                    </Link>
                                                </div>
                                                <p className="text-xs text-slate-300 leading-relaxed">
                                                    Para habilitar el desembolso de los fondos recaudados, adjunta los documentos oficiales requeridos (Cédula, Certificado Bancario y respaldo médico/autorizaciones). Límite de <strong>20 MB</strong> por archivo (PDF, JPG, PNG).
                                                </p>
                                            </div>

                                            {/* ── 1. CÉDULA DE IDENTIDAD ── */}
                                            <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm hover:border-blue-300 transition">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-start gap-2.5">
                                                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0 font-bold">
                                                            🪪
                                                        </div>
                                                        <div>
                                                            <h5 className="text-xs font-black text-slate-900 uppercase">1. Cédula de Identidad o Pasaporte</h5>
                                                            <p className="text-[11px] text-slate-500">Copia nítida o foto por ambos lados del organizador y beneficiario.</p>
                                                        </div>
                                                    </div>
                                                    {renderDocBadge(idStatus, true)}
                                                </div>

                                                {campaign.id_cardAdminNote && (
                                                    <div className="bg-red-50 p-2.5 rounded-xl border border-red-200 text-xs text-red-800">
                                                        <strong>Nota de auditoría:</strong> {campaign.id_cardAdminNote}
                                                    </div>
                                                )}

                                                <div className="flex flex-col sm:flex-row gap-2 items-center">
                                                    <input
                                                        type="file"
                                                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                                                        className="block w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer border border-dashed border-slate-200 rounded-xl p-1.5 bg-slate-50"
                                                        onChange={e => setSelectedDocFiles(prev => ({ ...prev, id_card: e.target.files?.[0] ?? null }))}
                                                    />
                                                    {selectedDocFiles.id_card && (
                                                        <button
                                                            onClick={() => handleFileUpload('id_card', 'Cédula de Identidad')}
                                                            disabled={uploadingDocType === 'id_card'}
                                                            className="w-full sm:w-auto whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-2 px-4 rounded-xl transition shadow disabled:opacity-50 flex items-center justify-center gap-1.5"
                                                        >
                                                            {uploadingDocType === 'id_card' ? '⏳ Subiendo...' : '📤 Subir Cédula'}
                                                        </button>
                                                    )}
                                                </div>

                                                {campaign.idDocumentUrl && (
                                                    <a
                                                        href={campaign.idDocumentUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" /> Ver cédula adjunta actualmente ↗
                                                    </a>
                                                )}
                                            </div>

                                            {/* ── 2. CERTIFICADO BANCARIO OFICIAL ── */}
                                            <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm hover:border-emerald-300 transition">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-start gap-2.5">
                                                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold">
                                                            🏦
                                                        </div>
                                                        <div>
                                                            <h5 className="text-xs font-black text-slate-900 uppercase">2. Certificado Bancario Oficial</h5>
                                                            <p className="text-[11px] text-slate-500">Emitido por banco o cooperativa regulada (vigencia &le; 30 días).</p>
                                                        </div>
                                                    </div>
                                                    {renderDocBadge(bankStatus, true)}
                                                </div>

                                                {campaign.bank_certificateAdminNote && (
                                                    <div className="bg-red-50 p-2.5 rounded-xl border border-red-200 text-xs text-red-800">
                                                        <strong>Nota de auditoría:</strong> {campaign.bank_certificateAdminNote}
                                                    </div>
                                                )}

                                                <div className="flex flex-col sm:flex-row gap-2 items-center">
                                                    <input
                                                        type="file"
                                                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                                                        className="block w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer border border-dashed border-slate-200 rounded-xl p-1.5 bg-slate-50"
                                                        onChange={e => setSelectedDocFiles(prev => ({ ...prev, bank_certificate: e.target.files?.[0] ?? null }))}
                                                    />
                                                    {selectedDocFiles.bank_certificate && (
                                                        <button
                                                            onClick={() => handleFileUpload('bank_certificate', 'Certificado Bancario')}
                                                            disabled={uploadingDocType === 'bank_certificate'}
                                                            className="w-full sm:w-auto whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2 px-4 rounded-xl transition shadow disabled:opacity-50 flex items-center justify-center gap-1.5"
                                                        >
                                                            {uploadingDocType === 'bank_certificate' ? '⏳ Subiendo...' : '📤 Subir Certificado'}
                                                        </button>
                                                    )}
                                                </div>

                                                {campaign.bankCertificateUrl && (
                                                    <a
                                                        href={campaign.bankCertificateUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold hover:underline"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" /> Ver certificado bancario adjunto ↗
                                                    </a>
                                                )}
                                            </div>

                                            {/* ── 3. CARTA DE AUTORIZACIÓN O PODER NOTARIADO ── */}
                                            <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm hover:border-amber-300 transition">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-start gap-2.5">
                                                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0 font-bold">
                                                            📜
                                                        </div>
                                                        <div>
                                                            <h5 className="text-xs font-black text-slate-900 uppercase">3. Carta de Autorización / Poder</h5>
                                                            <p className="text-[11px] text-slate-500">Obligatorio si el beneficiario o titular de cuenta es un familiar o tercero.</p>
                                                        </div>
                                                    </div>
                                                    {renderDocBadge(authLetterStatus, campaign.beneficiary !== 'myself')}
                                                </div>

                                                {campaign.authorization_letterAdminNote && (
                                                    <div className="bg-red-50 p-2.5 rounded-xl border border-red-200 text-xs text-red-800">
                                                        <strong>Nota de auditoría:</strong> {campaign.authorization_letterAdminNote}
                                                    </div>
                                                )}

                                                <div className="flex flex-col sm:flex-row gap-2 items-center">
                                                    <input
                                                        type="file"
                                                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                                                        className="block w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-600 file:text-white hover:file:bg-amber-700 cursor-pointer border border-dashed border-slate-200 rounded-xl p-1.5 bg-slate-50"
                                                        onChange={e => setSelectedDocFiles(prev => ({ ...prev, authorization_letter: e.target.files?.[0] ?? null }))}
                                                    />
                                                    {selectedDocFiles.authorization_letter && (
                                                        <button
                                                            onClick={() => handleFileUpload('authorization_letter', 'Carta de Autorización')}
                                                            disabled={uploadingDocType === 'authorization_letter'}
                                                            className="w-full sm:w-auto whitespace-nowrap bg-amber-600 hover:bg-amber-700 text-white text-xs font-black py-2 px-4 rounded-xl transition shadow disabled:opacity-50 flex items-center justify-center gap-1.5"
                                                        >
                                                            {uploadingDocType === 'authorization_letter' ? '⏳ Subiendo...' : '📤 Subir Carta'}
                                                        </button>
                                                    )}
                                                </div>

                                                {campaign.authorizationLetterUrl && (
                                                    <a
                                                        href={campaign.authorizationLetterUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-amber-700 font-bold hover:underline"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" /> Ver carta de autorización adjunta ↗
                                                    </a>
                                                )}
                                            </div>

                                            {/* ── 4. CERTIFICACIÓN MÉDICA / EPICRISIS (Si aplica) ── */}
                                            {medRequired && (
                                                <div className="bg-white border-2 border-red-200 rounded-2xl p-4 space-y-3 shadow-sm hover:border-red-300 transition">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-start gap-2.5">
                                                            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-700 flex items-center justify-center flex-shrink-0 font-bold">
                                                                ⚕️
                                                            </div>
                                                            <div>
                                                                <h5 className="text-xs font-black text-slate-900 uppercase">4. Certificado Médico / Epicrisis Oficial</h5>
                                                                <p className="text-[11px] text-slate-500">Diagnóstico médico, firma, sello y registro profesional (vigencia &le; 60 días).</p>
                                                            </div>
                                                        </div>
                                                        {renderDocBadge(medStatus, true)}
                                                    </div>

                                                    {campaign.medicalAdminNote && (
                                                        <div className="bg-red-50 p-2.5 rounded-xl border border-red-200 text-xs text-red-800">
                                                            <strong>Observación de auditoría médica:</strong> {campaign.medicalAdminNote}
                                                        </div>
                                                    )}

                                                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                                                        <input
                                                            type="file"
                                                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                                                            className="block w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-600 file:text-white hover:file:bg-red-700 cursor-pointer border border-dashed border-red-200 rounded-xl p-1.5 bg-red-50/40"
                                                            onChange={e => setSelectedDocFiles(prev => ({ ...prev, medical: e.target.files?.[0] ?? null }))}
                                                        />
                                                        {selectedDocFiles.medical && (
                                                            <button
                                                                onClick={() => handleFileUpload('medical', 'Documento Médico / Epicrisis')}
                                                                disabled={uploadingDocType === 'medical'}
                                                                className="w-full sm:w-auto whitespace-nowrap bg-red-600 hover:bg-red-700 text-white text-xs font-black py-2 px-4 rounded-xl transition shadow disabled:opacity-50 flex items-center justify-center gap-1.5"
                                                            >
                                                                {uploadingDocType === 'medical' ? '⏳ Subiendo...' : '📤 Subir Doc. Médico'}
                                                            </button>
                                                        )}
                                                    </div>

                                                    {campaign.medicalDocumentUrl && (
                                                        <a
                                                            href={campaign.medicalDocumentUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs text-red-700 font-bold hover:underline"
                                                        >
                                                            <FileText className="w-3.5 h-3.5" /> Ver documento médico adjunto ↗
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            {/* ── 5. OTROS RESPALDOS ADICIONALES (Facturas, Presupuestos) ── */}
                                            <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm hover:border-purple-300 transition">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-start gap-2.5">
                                                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center flex-shrink-0 font-bold">
                                                            📎
                                                        </div>
                                                        <div>
                                                            <h5 className="text-xs font-black text-slate-900 uppercase">5. Otros Respaldos Adicionales</h5>
                                                            <p className="text-[11px] text-slate-500">Facturas, proformas, recetas o presupuestos clínicos complementarios.</p>
                                                        </div>
                                                    </div>
                                                    {renderDocBadge(campaign.additionalVerificationDocUrl ? 'under_review' : 'pending_upload', false)}
                                                </div>

                                                <div className="flex flex-col sm:flex-row gap-2 items-center">
                                                    <input
                                                        type="file"
                                                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                                                        className="block w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer border border-dashed border-slate-200 rounded-xl p-1.5 bg-slate-50"
                                                        onChange={e => setSelectedDocFiles(prev => ({ ...prev, additional: e.target.files?.[0] ?? null }))}
                                                    />
                                                    {selectedDocFiles.additional && (
                                                        <button
                                                            onClick={() => handleFileUpload('additional', 'Documento Adicional')}
                                                            disabled={uploadingDocType === 'additional'}
                                                            className="w-full sm:w-auto whitespace-nowrap bg-purple-600 hover:bg-purple-700 text-white text-xs font-black py-2 px-4 rounded-xl transition shadow disabled:opacity-50 flex items-center justify-center gap-1.5"
                                                        >
                                                            {uploadingDocType === 'additional' ? '⏳ Subiendo...' : '📤 Subir Respaldo'}
                                                        </button>
                                                    )}
                                                </div>

                                                {campaign.additionalVerificationDocUrl && (
                                                    <a
                                                        href={campaign.additionalVerificationDocUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-purple-700 font-bold hover:underline"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" /> Ver documento adicional adjunto ↗
                                                    </a>
                                                )}
                                            </div>

                                            {/* Botón de Retiro Condicionado */}
                                            <button
                                                onClick={() => {
                                                    if (!auth.allowed) {
                                                        const msgs = auth.blockedBy.map(r => {
                                                            if (r === 'NO_FUNDS') return '• No hay fondos recaudados en esta campaña todavía.';
                                                            if (r.startsWith('MEDICAL_DOC_NOT_APPROVED')) {
                                                                const s = r.split(':')[1] || '';
                                                                if (s === 'under_review') return '• Tu documentación médica está en revisión por nuestro equipo administrativo.';
                                                                if (s === 'rejected') return '• Tu documentación médica fue rechazada. Debes subir un documento válido.';
                                                                if (s === 'more_info_required') return '• Se requiere información adicional de tu documentación médica.';
                                                                return '• Debes subir el certificado médico oficial y esperar su aprobación.';
                                                            }
                                                            if (r === 'ID_DOC_REJECTED') return '• La cédula de identidad fue rechazada. Por favor sube una copia legible.';
                                                            if (r === 'BANK_CERT_REJECTED') return '• El certificado bancario fue rechazado. Debe coincidir con la cuenta del titular.';
                                                            return `• ${r}`;
                                                        }).join('\n');
                                                        alert(`🔒 Retiro Bloqueado\n\n${msgs}\n\nPara seguridad de los fondos, todos los requisitos de verificación deben estar aprobados.`);
                                                        return;
                                                    }
                                                    setShowWithdrawalModal(true);
                                                }}
                                                disabled={!auth.allowed}
                                                className={`w-full font-black py-3.5 px-4 rounded-xl transition flex items-center justify-center shadow-lg gap-2 ${
                                                    auth.allowed
                                                        ? 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-slate-900/20'
                                                        : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                                                }`}
                                            >
                                                {auth.allowed ? (
                                                    <>
                                                        <Landmark className="h-5 w-5 text-emerald-400" />
                                                        Solicitar Retiro de Fondos (${campaign.currentAmount?.toLocaleString() || 0})
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock className="h-4 w-4 text-gray-400" />
                                                        {campaign.currentAmount <= 0 ? 'Sin fondos para retirar' : '🔒 Retiro Bloqueado (Verificación Pendiente)'}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })()
                                : !user ? (
                                    <div className="w-full bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium py-3 px-4 rounded-xl flex items-center">
                                        <Landmark className="h-4 w-4 mr-2 flex-shrink-0 text-amber-600" />
                                        <span>¿Eres el organizador? <button onClick={() => {}} className="underline font-bold">Inicia sesión</button> para solicitar el retiro.</span>
                                    </div>
                                ) : isLoggedInButNotOrganizer ? (
                                    <div className="w-full bg-red-50 border border-red-200 text-red-700 text-xs font-medium py-3 px-4 rounded-xl flex items-start">
                                        <Landmark className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5 text-red-400" />
                                        <span>Solo el organizador de esta campaña puede solicitar el retiro. Ingresa con el email correcto.</span>
                                    </div>
                                ) : null}
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

            {/* Withdrawal Modal */}
            {showWithdrawalModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between z-10">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center">
                                <Landmark className="h-6 w-6 text-primary mr-3" /> Solicitud de Retiro de Fondos
                            </h2>
                            <button onClick={() => setShowWithdrawalModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition">
                                <X className="h-6 w-6 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleWithdrawalSubmit} className="p-6 space-y-6">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                                <p className="text-sm text-blue-800 flex items-start">
                                    <span className="mr-2 italic font-bold">Nota:</span>
                                    Estás solicitando el retiro de <strong>${campaign.currentAmount.toLocaleString()}</strong> recaudados hasta el momento.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Nombre</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        value={withdrawalFormData.firstName}
                                        onChange={(e) => setWithdrawalFormData({ ...withdrawalFormData, firstName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Apellido</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        value={withdrawalFormData.lastName}
                                        onChange={(e) => setWithdrawalFormData({ ...withdrawalFormData, lastName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Cédula de Identidad</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        value={withdrawalFormData.idNumber}
                                        onChange={(e) => setWithdrawalFormData({ ...withdrawalFormData, idNumber: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Teléfono</label>
                                    <input
                                        required
                                        type="tel"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        value={withdrawalFormData.phone}
                                        onChange={(e) => setWithdrawalFormData({ ...withdrawalFormData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Email de contacto</label>
                                    <input
                                        required
                                        type="email"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        value={withdrawalFormData.email}
                                        onChange={(e) => setWithdrawalFormData({ ...withdrawalFormData, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">RUC (Opcional)</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        value={withdrawalFormData.ruc}
                                        onChange={(e) => setWithdrawalFormData({ ...withdrawalFormData, ruc: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Dirección Domiciliaria</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        value={withdrawalFormData.address}
                                        onChange={(e) => setWithdrawalFormData({ ...withdrawalFormData, address: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 space-y-4">
                                <h3 className="font-bold text-gray-900 flex items-center">
                                    <span className="bg-primary/10 text-primary p-2 rounded-lg mr-2">🏦</span> Datos Bancarios
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Nombre del Banco</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            value={withdrawalFormData.bankName}
                                            onChange={(e) => setWithdrawalFormData({ ...withdrawalFormData, bankName: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Tipo de Cuenta</label>
                                        <select
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            value={withdrawalFormData.accountType}
                                            onChange={(e) => setWithdrawalFormData({ ...withdrawalFormData, accountType: e.target.value })}
                                        >
                                            <option value="ahorros">Ahorros</option>
                                            <option value="corriente">Corriente</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Número de Cuenta</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            value={withdrawalFormData.bankAccountNumber}
                                            onChange={(e) => setWithdrawalFormData({ ...withdrawalFormData, bankAccountNumber: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Declaración de Veracidad
                                </p>
                                <p>
                                    Al enviar esta solicitud, confirmas que los datos bancarios e identidad corresponden al titular legítimo y aceptas los <Link to="/withdrawal-terms" target="_blank" className="text-primary font-bold underline">Términos de Verificación y Retiro de Unidos EC</Link>.
                                </p>
                            </div>

                            <button
                                disabled={isSubmittingWithdrawal}
                                type="submit"
                                className="w-full bg-primary text-white font-black py-4 rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50"
                            >
                                {isSubmittingWithdrawal ? 'Enviando...' : 'Confirmar Solicitud de Retiro'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {showQRModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center">
                                <QrCode className="h-5 w-5 text-primary mr-2" /> QR de la Campaña
                            </h2>
                            <button onClick={() => setShowQRModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition">
                                <X className="h-6 w-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-10 flex flex-col items-center justify-center space-y-6">
                            <div className="bg-white p-4 rounded-2xl shadow-inner border border-gray-100">
                                <QRCodeCanvas
                                    id="campaign-qr"
                                    value={window.location.href}
                                    size={200}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>
                            <p className="text-center text-sm text-gray-500 font-medium">
                                Escanea este código para ir directo a la campaña.
                            </p>
                            <button
                                onClick={downloadQRCode}
                                className="w-full bg-slate-900 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center hover:bg-slate-800 transition"
                            >
                                <Download className="h-5 w-5 mr-2" /> Guardar imagen QR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Screen Image Viewer Modal */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-zoom-out" 
                    onClick={() => setSelectedImage(null)}
                >
                    <button 
                        className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full transition-all duration-200 z-[110]"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImage(null);
                        }}
                    >
                        <X className="h-8 w-8" />
                    </button>
                    <img 
                        src={selectedImage} 
                        className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain animate-in zoom-in duration-300" 
                        alt="Zoomed"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default CampaignDetails;
