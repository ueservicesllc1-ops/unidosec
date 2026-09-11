import { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    HeartHandshake,
    Users,
    Calculator,
    Megaphone,
    Settings,
    ChevronRight,
    Search,
    CheckCircle,
    XCircle,
    Eye,
    Trash2,
    RefreshCw,
    Edit3,
    Check,
    X,
    CheckCircle2,
    Plus,
    Coins,
    Landmark,
    Clock,
    Stethoscope,
    FileText,
    AlertTriangle,
    Download,
    MessageSquare,
    ShieldCheck,
    History,
    Send,
} from 'lucide-react';
import {
    getAllCampaigns,
    updateCampaignStatus,
    deleteCampaign,
    getAllDonations,
    getAllUsers,
    deleteUser,
    updateDonation,
    deleteDonation,
    addManualDonation,
    syncCampaignTotals
} from '../services/adminService';
import { getAllWithdrawalRequests, updateWithdrawalStatus, type WithdrawalRequest } from '../services/withdrawalService';
import {
    getAllMedicalCampaigns,
    updateMedicalDocumentStatus,
    getMedicalVerificationLog,
    type MedicalDocumentStatus,
    type MedicalVerificationLog,
} from '../services/medicalVerificationService';
import {
    subscribeToAllConversations,
    subscribeToMessages,
    sendMessage,
    markConversationAsRead,
    updateConversationStatus,
    subscribeToAdminUnreadCount,
    createConversation,
    type Conversation,
    type Message,
    type ConversationStatus,
    type MessageCategory,
} from '../services/messagingService';
import SendMessageButton from '../components/SendMessageButton';
import { timeAgo, sendSystemNotification } from '../services/notificationService';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [adminUnreadCount, setAdminUnreadCount] = useState(0);
    const [stats, setStats] = useState({
        totalRaised: 0,
        donationsCount: 0,
        usersCount: 0,
        activeCampaigns: 0
    });
    const [loadingStats, setLoadingStats] = useState(true);

    const fetchStats = async () => {
        setLoadingStats(true);
        try {
            const [campaigns, donations, users] = await Promise.all([
                getAllCampaigns(),
                getAllDonations(),
                getAllUsers()
            ]);

            const totalRaised = campaigns.reduce((acc: number, curr: any) => acc + (curr.currentAmount || 0), 0);

            setStats({
                totalRaised,
                donationsCount: donations.length,
                usersCount: users.length,
                activeCampaigns: campaigns.filter((c: any) => c.status === 'active' || c.status === 'approved').length
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoadingStats(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    // Suscripción al contador de mensajes sin leer del admin
    useEffect(() => {
        const unsub = subscribeToAdminUnreadCount(setAdminUnreadCount);
        return () => unsub();
    }, []);

    const sidebarItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'donations', label: 'Donaciones', icon: HeartHandshake },
        { id: 'users', label: 'Usuarios', icon: Users },
        { id: 'withdrawals', label: 'Retiros', icon: Landmark },
        { id: 'medical', label: 'Verificación Médica', icon: Stethoscope },
        { id: 'messages', label: 'Mensajes', icon: MessageSquare, badge: adminUnreadCount },
        { id: 'accounting', label: 'Contabilidad', icon: Calculator },
        { id: 'campaigns', label: 'Campañas', icon: Megaphone },
        { id: 'settings', label: 'Configuración', icon: Settings },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <DashboardView stats={stats} loading={loadingStats} onRefresh={fetchStats} />;
            case 'donations':
                return <DonationsView />;
            case 'users':
                return <UsersView />;
            case 'withdrawals':
                return <WithdrawalsView />;
            case 'medical':
                return <MedicalVerificationView />;
            case 'messages':
                return <AdminMessagesView />;
            case 'accounting':
                return <AccountingView />;
            case 'campaigns':
                return <CampaignsView />;
            default:
                return <div className="p-8 text-center text-gray-500 italic text-xl">Selecciona una sección del panel lateral.</div>;
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-20 transition-all duration-300">
                <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
                    <div className="bg-primary/20 p-2 rounded-lg">
                        <Settings className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight">Admin Panel</h2>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-3">
                    <ul className="space-y-1">
                        {sidebarItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <li key={item.id}>
                                    <button
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'group-hover:text-primary transition-colors'}`} />
                                            <span className="font-medium">{item.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {(item as any).badge > 0 && (
                                                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                                    {(item as any).badge > 99 ? '99+' : (item as any).badge}
                                                </span>
                                            )}
                                            {isActive && <ChevronRight className="w-4 h-4" />}
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="p-6 border-t border-slate-800">
                    <div className="flex items-center space-x-3 bg-slate-800/50 p-3 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-white shadow-sm">
                            AD
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold truncate">Admin</p>
                            <p className="text-xs text-slate-500 truncate">ueservicesllc1@gmail.com</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 shadow-sm z-10">
                    <h1 className="text-xl font-bold text-gray-800 capitalize">{activeTab}</h1>
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Global Search..."
                                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all w-64"
                            />
                        </div>
                        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                            <Megaphone className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                <section className="flex-1 overflow-y-auto p-8">
                    {renderContent()}
                </section>
            </main>
        </div>
    );
};

/* --- Sub-Views --- */

const DashboardView = ({ stats, loading, onRefresh }: any) => (
    <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-800">Resumen Estadístico</h3>
            <button onClick={onRefresh} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
                { label: 'Total Recaudado', value: `$${stats.totalRaised.toLocaleString()}`, color: 'bg-emerald-500', icon: HeartHandshake },
                { label: 'Donaciones Totales', value: stats.donationsCount.toLocaleString(), color: 'bg-blue-500', icon: Calculator },
                { label: 'Usuarios Registrados', value: stats.usersCount.toLocaleString(), color: 'bg-purple-500', icon: Users },
                { label: 'Campañas Activas', value: stats.activeCampaigns.toLocaleString(), color: 'bg-amber-500', icon: Megaphone },
            ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className={`${stat.color} p-3 rounded-xl text-white shadow-lg`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        {loading && <RefreshCw className="w-4 h-4 text-gray-300 animate-spin" />}
                    </div>
                    <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                </div>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-gray-800">Crecimiento de Donaciones</h3>
                    <span className="text-xs text-gray-400 italic">Datos en tiempo real</span>
                </div>
                <div className="h-48 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50">
                    <p className="text-gray-400 text-sm">Gráfico de tendencias próximamente</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-6">Próximos Pasos</h3>
                <div className="space-y-4">
                    <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
                        <p className="text-sm font-bold text-primary mb-1">Verificar Campañas</p>
                        <p className="text-xs text-gray-600">Revisa las campañas pendientes en la pestaña de Campañas.</p>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                        <p className="text-sm font-bold text-amber-700 mb-1">Alertas de Seguridad</p>
                        <p className="text-xs text-gray-600">No hay reportes de campañas sospechosas hoy.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const CampaignsView = () => {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'active' | 'hidden'>('all');
    const [showDonationModal, setShowDonationModal] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getAllCampaigns();
            setCampaigns(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSync = async (id: string) => {
        try {
            await syncCampaignTotals(id);
            alert("Totales sincronizados correctamente basados en la lista de donaciones.");
            fetchData();
        } catch (error) {
            alert("Error al sincronizar");
        }
    };

    const handleStatus = async (camp: any, status: any) => {
        const actionName = status === 'approved' ? 'APROBAR y hacer visible' : status === 'hidden' ? 'OCULTAR' : status;
        if (!confirm(`¿Estás seguro de ${actionName} la campaña "${camp.title}"?`)) return;
        try {
            await updateCampaignStatus(camp.id, status);
            if (status === 'approved') {
                const recipientId = camp.organizerId || camp.organizer?.email;
                if (recipientId) {
                    await sendSystemNotification.campaignApproved(recipientId, camp.id, camp.title).catch(console.error);
                }
            }
            fetchData();
        } catch (error) {
            alert("Error al actualizar");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿ESTÁS SEGURO? Esta acción no se puede deshacer.")) return;
        try {
            await deleteCampaign(id);
            fetchData();
        } catch (error) {
            alert("Error al eliminar");
        }
    };

    const handleSyncAll = async () => {
        if (!confirm("Esto recalculará los totales de TODAS las campañas basándose en las donaciones reales. ¿Continuar?")) return;
        setLoading(true);
        try {
            let count = 0;
            for (const camp of campaigns) {
                await syncCampaignTotals(camp.id);
                count++;
            }
            alert(`Éxito: Se han sincronizado ${count} campañas.`);
            fetchData();
        } catch (error) {
            alert("Error en la sincronización masiva");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center py-20"><RefreshCw className="animate-spin text-primary" /></div>;

    const pendingCount = campaigns.filter(c => c.status === 'pending').length;
    const activeCount = campaigns.filter(c => c.status === 'active' || c.status === 'approved').length;
    const hiddenCount = campaigns.filter(c => c.status === 'hidden').length;

    const filteredCampaigns = campaigns.filter(camp => {
        if (filterStatus === 'pending') return camp.status === 'pending';
        if (filterStatus === 'active') return camp.status === 'active' || camp.status === 'approved';
        if (filterStatus === 'hidden') return camp.status === 'hidden';
        return true;
    });

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                            filterStatus === 'all'
                                ? 'bg-slate-900 text-white shadow-slate-900/20'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Todas ({campaigns.length})
                    </button>
                    <button
                        onClick={() => setFilterStatus('pending')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                            filterStatus === 'pending'
                                ? 'bg-amber-600 text-white shadow-amber-600/20'
                                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                        }`}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        Pendientes de Aprobación
                        {pendingCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full ml-0.5">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setFilterStatus('active')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                            filterStatus === 'active'
                                ? 'bg-green-600 text-white shadow-green-600/20'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                    >
                        Aprobadas / Activas ({activeCount})
                    </button>
                    <button
                        onClick={() => setFilterStatus('hidden')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                            filterStatus === 'hidden'
                                ? 'bg-slate-700 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        Ocultas ({hiddenCount})
                    </button>
                    <button 
                        onClick={handleSyncAll}
                        className="bg-red-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-red-700 transition-colors flex items-center space-x-1.5 ml-2"
                        title="Recalcular totales basados en donaciones reales"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reparar Totales</span>
                    </button>
                </div>
                <button onClick={fetchData} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wider font-bold">
                        <tr>
                            <th className="px-6 py-4">Campaña</th>
                            <th className="px-6 py-4">Organizador</th>
                            <th className="px-6 py-4">Estado</th>
                            <th className="px-6 py-4">Recaudado / Meta</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredCampaigns.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                                    No hay campañas en esta sección.
                                </td>
                            </tr>
                        )}
                        {filteredCampaigns.map((camp) => (
                            <tr key={camp.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                            {camp.imageUrl ? (
                                                <img src={camp.imageUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-primary/20 flex items-center justify-center"><Megaphone className="w-4 h-4 text-primary" /></div>
                                            )}
                                        </div>
                                        <div className="max-w-[200px]">
                                            <p className="text-sm font-bold text-gray-900 truncate">{camp.title}</p>
                                            <p className="text-xs text-gray-500">{camp.category}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-medium text-gray-900 truncate uppercase">{camp.organizer?.name}</p>
                                    <p className="text-xs text-gray-500">{camp.organizer?.city}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                        camp.status === 'pending'
                                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                            : camp.status === 'active' || camp.status === 'approved'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-700'
                                    }`}>
                                        {camp.status === 'pending' ? (
                                            <>
                                                <Clock className="w-3 h-3 mr-1 text-amber-600" />
                                                Pendiente (24h)
                                            </>
                                        ) : camp.status === 'active' || camp.status === 'approved' ? (
                                            <>
                                                <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
                                                Aprobada
                                            </>
                                        ) : (
                                            camp.status || 'activa'
                                        )}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-bold text-sm">
                                    ${camp.currentAmount?.toLocaleString()} / ${camp.goal?.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end space-x-1">
                                        {camp.status === 'pending' && (
                                            <button
                                                onClick={() => handleStatus(camp, 'approved')}
                                                className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm mr-1"
                                                title="Aprobar campaña para que sea visible públicamente"
                                            >
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                Aprobar
                                            </button>
                                        )}
                                        <SendMessageButton
                                            userId={camp.organizerId || ''}
                                            userEmail={camp.organizer?.email || ''}
                                            userName={camp.organizer?.name || 'Organizador'}
                                            campaignId={camp.id}
                                            campaignTitle={camp.title}
                                            preselectedCategory="Campaña"
                                            buttonLabel=""
                                            buttonClass="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                        />
                                        <button
                                            onClick={() => {
                                                setSelectedCampaign(camp);
                                                setShowDonationModal(true);
                                            }}
                                            className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors"
                                            title="Añadir Fondos"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                        <Link to={`/campaign/${camp.id}`} target="_blank" className="p-2 text-gray-400 hover:text-primary transition-colors hover:bg-primary/5 rounded-lg" title="Ver"><Eye className="w-4 h-4" /></Link>
                                        <button
                                            onClick={() => handleSync(camp.id)}
                                            className="p-2 text-gray-400 hover:text-blue-500 transition-colors hover:bg-blue-50 rounded-lg"
                                            title="Sincronizar Totales"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                        {camp.status !== 'pending' && (
                                            <button onClick={() => handleStatus(camp, 'approved')} className="p-2 text-gray-400 hover:text-green-500 transition-colors hover:bg-green-50 rounded-lg" title="Aprobar"><CheckCircle className="w-4 h-4" /></button>
                                        )}
                                        <button onClick={() => handleStatus(camp, 'hidden')} className="p-2 text-gray-400 hover:text-amber-500 transition-colors hover:bg-amber-50 rounded-lg" title="Ocultar"><XCircle className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(camp.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-lg" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showDonationModal && selectedCampaign && (
                <ManualDonationModal
                    campaign={selectedCampaign}
                    onClose={() => {
                        setShowDonationModal(false);
                        setSelectedCampaign(null);
                    }}
                    onSuccess={() => {
                        setShowDonationModal(false);
                        setSelectedCampaign(null);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

const ManualDonationModal = ({ campaign, onClose, onSuccess }: { campaign: any, onClose: () => void, onSuccess: () => void }) => {
    const [donorName, setDonorName] = useState("");
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) {
            alert("Monto inválido");
            return;
        }
        if (!donorName.trim()) {
            alert("Nombre de donante requerido");
            return;
        }

        setLoading(true);
        try {
            await addManualDonation(campaign.id, amt, donorName);
            onSuccess();
        } catch (error) {
            alert("Error al añadir fondos");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center px-2">
                        <Coins className="h-5 w-5 text-emerald-500 mr-2" /> Añadir Fondos
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <X className="h-6 w-6 text-gray-400" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider mb-1">Campaña Destino</p>
                        <p className="text-sm font-black text-emerald-900 truncate">{campaign.title}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Nombre del Donante</label>
                            <input
                                type="text"
                                required
                                value={donorName}
                                onChange={(e) => setDonorName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                                placeholder="Ej: Donación Anónima / Juan Pérez"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Monto ($)</label>
                            <input
                                type="number"
                                required
                                min="0.01"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none text-2xl font-black text-emerald-600"
                                placeholder="0.00"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 text-white font-black py-4 rounded-xl flex items-center justify-center hover:bg-slate-800 transition active:scale-[0.98] disabled:opacity-50 mt-6 shadow-xl shadow-slate-200"
                        >
                            {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : "AÑADIR FONDOS AHORA"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

const DonationsView = () => {
    const [donations, setDonations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState<string>("");

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getAllDonations();
            setDonations(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEditStart = (don: any) => {
        setEditingId(don.id);
        setEditAmount(don.amount.toString());
    };

    const handleEditSave = async (don: any) => {
        const newAmount = parseFloat(editAmount);
        if (isNaN(newAmount)) return;
        try {
            await updateDonation(don.campaignId, don.id, newAmount);
            setEditingId(null);
            fetchData();
        } catch (error) {
            alert("Error al actualizar donación");
        }
    };

    const handleDelete = async (don: any) => {
        if (!confirm("¿Seguro que deseas eliminar esta donación? Se restará del total de la campaña.")) return;
        try {
            await deleteDonation(don.campaignId, don.id);
            fetchData();
        } catch (error) {
            alert("Error al eliminar donación");
        }
    };

    if (loading) return <div className="flex justify-center items-center py-20"><RefreshCw className="animate-spin text-primary" /></div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Transacciones Recientes ({donations.length})</h3>
                <button onClick={fetchData} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wider font-bold">
                        <tr>
                            <th className="px-6 py-4">Donante</th>
                            <th className="px-6 py-4">Campaña</th>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Monto</th>
                            <th className="px-6 py-4">ID Transacción</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {donations.map((don) => (
                            <tr key={don.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                            {don.donorName?.charAt(0)}
                                        </div>
                                        <span className="text-sm font-bold text-gray-900">{don.donorName}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-[200px]">{don.campaignTitle}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {don.createdAt?.seconds ? new Date(don.createdAt.seconds * 1000).toLocaleDateString() : 'Recién'}
                                </td>
                                <td className="px-6 py-4">
                                    {editingId === don.id ? (
                                        <input
                                            type="number"
                                            value={editAmount}
                                            onChange={(e) => setEditAmount(e.target.value)}
                                            className="w-20 px-2 py-1 border border-primary rounded text-sm outline-none"
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="text-sm font-black text-emerald-600">${don.amount}</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500 font-mono italic">{don.id.substring(0, 8)}...</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end space-x-1">
                                        {editingId === don.id ? (
                                            <>
                                                <button onClick={() => handleEditSave(don)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Check className="w-4 h-4" /></button>
                                                <button onClick={() => setEditingId(null)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><X className="w-4 h-4" /></button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => handleEditStart(don)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg"><Edit3 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(don)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const UsersView = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getAllUsers();
            setUsers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (uid: string) => {
        if (uid === 'ueservicesllc1@gmail.com') { // Protection for main admin
            alert("No puedes eliminar al administrador principal.");
            return;
        }
        if (!confirm("¿Seguro que deseas eliminar este usuario de la base de datos?")) return;
        try {
            await deleteUser(uid);
            fetchData();
        } catch (error) {
            alert("Error al eliminar usuario");
        }
    };

    if (loading) return <div className="flex justify-center items-center py-20"><RefreshCw className="animate-spin text-primary" /></div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Usuarios Registrados ({users.length})</h3>
                <button onClick={fetchData} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wider font-bold">
                        <tr>
                            <th className="px-6 py-4">Usuario</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Última Conexión</th>
                            <th className="px-6 py-4">UID</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map((user) => (
                            <tr key={user.uid} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100">
                                            {user.photoURL ? (
                                                <img src={user.photoURL} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-xs">
                                                    {user.displayName?.charAt(0) || 'U'}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-sm font-bold text-gray-900">{user.displayName || 'Usuario'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {user.lastLogin?.seconds ? new Date(user.lastLogin.seconds * 1000).toLocaleString() : 'N/A'}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500 font-mono">{user.uid.substring(0, 8)}...</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <SendMessageButton
                                            userId={user.uid}
                                            userEmail={user.email || ''}
                                            userName={user.displayName || user.email || 'Usuario'}
                                            buttonLabel="Mensaje"
                                            buttonClass="text-xs py-1.5 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg flex items-center gap-1 font-bold"
                                        />
                                        <button
                                            onClick={() => handleDelete(user.uid)}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-lg"
                                            title="Eliminar Usuario"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const WithdrawalsView = () => {
    const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getAllWithdrawalRequests();
            setRequests(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUpdateStatus = async (id: string, status: WithdrawalRequest['status']) => {
        const label = status === 'completed' ? 'completado' : 'rechazado';
        if (!confirm(`¿Marcar este retiro como ${label}?`)) return;
        setUpdatingId(id);
        try {
            await updateWithdrawalStatus(id, status);
            // Optimistic update: actualiza en el estado local
            setRequests(prev =>
                prev.map(r => r.id === id ? { ...r, status } : r)
            );
        } catch (error) {
            alert('Error al actualizar el estado. Intenta de nuevo.');
            console.error(error);
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) return <div className="flex justify-center items-center py-20"><RefreshCw className="animate-spin text-primary" /></div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Solicitudes de Retiro ({requests.length})</h3>
                <button onClick={fetchData} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wider font-bold">
                        <tr>
                            <th className="px-6 py-4">Campaña / Organizador</th>
                            <th className="px-6 py-4">Datos del Solicitante</th>
                            <th className="px-6 py-4">Datos Bancarios</th>
                            <th className="px-6 py-4 text-center">Monto</th>
                            <th className="px-6 py-4 text-center">Estado</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {requests.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">No hay solicitudes de retiro aún.</td></tr>
                        )}
                        {requests.map((req) => (
                            <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="max-w-[180px]">
                                        <p className="text-sm font-bold text-gray-900 truncate">{req.campaignTitle}</p>
                                        <p className="text-xs text-gray-500 truncate">{req.organizerEmail}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm">
                                        <p className="font-bold text-gray-900">{req.firstName} {req.lastName}</p>
                                        <p className="text-xs text-gray-500">C.I: {req.idNumber}</p>
                                        {req.ruc && <p className="text-xs text-gray-500">RUC: {req.ruc}</p>}
                                        <p className="text-xs text-gray-500">{req.phone}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm">
                                        <p className="font-medium text-gray-900">{req.bankName}</p>
                                        <p className="text-xs text-gray-500">CTA: {req.bankAccountNumber}</p>
                                        <p className="text-xs text-gray-400 capitalize">{req.accountType}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center font-black text-slate-800">
                                    ${req.amountRequested.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                        req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                        req.status === 'completed' ? 'bg-green-100 text-green-700' :
                                        req.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {req.status === 'pending' ? <Clock className="w-3 h-3 mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                                        {req.status === 'pending' ? 'Pendiente' :
                                         req.status === 'completed' ? 'Completado' :
                                         req.status === 'rejected' ? 'Rechazado' : req.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <SendMessageButton
                                            userId={req.userId || req.organizerEmail}
                                            userEmail={req.organizerEmail}
                                            userName={`${req.firstName} ${req.lastName}`}
                                            campaignId={req.campaignId}
                                            campaignTitle={req.campaignTitle}
                                            preselectedCategory="Retiro de fondos"
                                            buttonLabel=""
                                            buttonClass="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                        />
                                        {req.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => req.id && handleUpdateStatus(req.id, 'completed')}
                                                    disabled={updatingId === req.id}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-40"
                                                    title="Marcar como completado"
                                                >
                                                    {updatingId === req.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                                </button>
                                                <button
                                                    onClick={() => req.id && handleUpdateStatus(req.id, 'rejected')}
                                                    disabled={updatingId === req.id}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-40"
                                                    title="Rechazar solicitud"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </>
                                        )}
                                        {req.status !== 'pending' && (
                                            <span className="text-xs text-gray-400 italic ml-2">Procesado</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AccountingView = () => (
    <div className="p-8 text-center text-gray-500 italic">Módulo de contabilidad en desarrollo...</div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MEDICAL VERIFICATION VIEW
// ─────────────────────────────────────────────────────────────────────────────
const MedicalVerificationView = () => {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionModal, setActionModal] = useState<{
        campaign: any;
        action: 'approved' | 'rejected' | 'more_info_required';
    } | null>(null);
    const [adminNote, setAdminNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [docViewUrl, setDocViewUrl] = useState<string | null>(null);
    const [logModal, setLogModal] = useState<{ campaign: any; logs: MedicalVerificationLog[] } | null>(null);
    const [loadingLog, setLoadingLog] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'all' | MedicalDocumentStatus>('all');

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getAllMedicalCampaigns();
            setCampaigns(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const openActionModal = (campaign: any, action: 'approved' | 'rejected' | 'more_info_required') => {
        setAdminNote('');
        setActionModal({ campaign, action });
    };

    const handleSubmitAction = async () => {
        if (!actionModal) return;
        if ((actionModal.action === 'rejected' || actionModal.action === 'more_info_required') && !adminNote.trim()) {
            alert('Debes escribir un motivo o nota antes de continuar.');
            return;
        }
        setSubmitting(true);
        try {
            // Admin ID hardcoded a 'admin' — en producción usarías auth.currentUser.uid
            await updateMedicalDocumentStatus(
                actionModal.campaign.id,
                actionModal.action,
                'admin',
                adminNote.trim()
            );
            setActionModal(null);
            fetchData();
        } catch (e) {
            console.error(e);
            alert('Error al actualizar el estado. Intenta de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    const openLog = async (campaign: any) => {
        setLoadingLog(true);
        setLogModal({ campaign, logs: [] });
        try {
            const logs = await getMedicalVerificationLog(campaign.id);
            setLogModal({ campaign, logs });
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingLog(false);
        }
    };

    const statusBadge = (status: string) => {
        const map: Record<string, { label: string; cls: string }> = {
            pending_upload:     { label: 'Pendiente de carga',  cls: 'bg-gray-100 text-gray-600' },
            uploaded:           { label: 'Subido',              cls: 'bg-blue-100 text-blue-700' },
            under_review:       { label: 'En revisión',        cls: 'bg-amber-100 text-amber-700' },
            approved:           { label: 'Aprobado',            cls: 'bg-green-100 text-green-700' },
            rejected:           { label: 'Rechazado',           cls: 'bg-red-100 text-red-600' },
            more_info_required: { label: 'Más info requerida', cls: 'bg-purple-100 text-purple-700' },
            not_required:       { label: 'No requerido',        cls: 'bg-gray-50 text-gray-400' },
        };
        const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
        return <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${s.cls}`}>{s.label}</span>;
    };

    const actionLabel = (action: 'approved' | 'rejected' | 'more_info_required') => {
        if (action === 'approved') return { title: 'Aprobar documentación médica', color: 'text-green-700 bg-green-50 border-green-200', btnClass: 'bg-green-600 hover:bg-green-700', icon: <ShieldCheck className="w-5 h-5 mr-2" /> };
        if (action === 'rejected') return { title: 'Rechazar documentación', color: 'text-red-700 bg-red-50 border-red-200', btnClass: 'bg-red-600 hover:bg-red-700', icon: <XCircle className="w-5 h-5 mr-2" /> };
        return { title: 'Solicitar más documentación', color: 'text-purple-700 bg-purple-50 border-purple-200', btnClass: 'bg-purple-600 hover:bg-purple-700', icon: <MessageSquare className="w-5 h-5 mr-2" /> };
    };

    const filtered = filterStatus === 'all' ? campaigns : campaigns.filter(c => c.medicalDocumentStatus === filterStatus);
    const pendingCount = campaigns.filter(c => c.medicalDocumentStatus === 'under_review').length;

    if (loading) return <div className="flex justify-center items-center py-20"><RefreshCw className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center space-x-3">
                        <div className="bg-blue-100 p-3 rounded-xl">
                            <Stethoscope className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Verificación de Documentación Médica</h2>
                            <p className="text-sm text-gray-500">Campañas que requieren certificación médica antes de poder retirar fondos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {pendingCount > 0 && (
                            <span className="inline-flex items-center px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-bold">
                                <AlertTriangle className="w-4 h-4 mr-1" /> {pendingCount} pendiente{pendingCount > 1 ? 's' : ''} de revisión
                            </span>
                        )}
                        <button onClick={fetchData} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                            <RefreshCw className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Filtros */}
                <div className="flex flex-wrap gap-2 mt-4">
                    {(['all', 'under_review', 'pending_upload', 'approved', 'rejected', 'more_info_required'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                                filterStatus === s
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {s === 'all' ? `Todas (${campaigns.length})` :
                             s === 'under_review' ? `En revisión (${campaigns.filter(c => c.medicalDocumentStatus === s).length})` :
                             s === 'pending_upload' ? 'Sin documento' :
                             s === 'approved' ? 'Aprobadas' :
                             s === 'rejected' ? 'Rechazadas' : 'Más info'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wider font-bold">
                            <tr>
                                <th className="px-6 py-4">Campaña / Beneficiario</th>
                                <th className="px-6 py-4">Categoría</th>
                                <th className="px-6 py-4 text-center">Recaudado</th>
                                <th className="px-6 py-4 text-center">Estado Doc. Médico</th>
                                <th className="px-6 py-4 text-center">Fecha de carga</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 && (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">No hay campañas en esta categoría.</td></tr>
                            )}
                            {filtered.map(camp => (
                                <tr key={camp.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="max-w-[220px]">
                                            <p className="text-sm font-bold text-gray-900 truncate">{camp.title}</p>
                                            <p className="text-xs text-gray-500 truncate">{camp.organizer?.email}</p>
                                            <p className="text-xs text-gray-400 truncate">Beneficiario: {camp.beneficiary === 'myself' ? 'Yo mismo' : camp.beneficiary}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                                            <Stethoscope className="w-3 h-3 mr-1" />{camp.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center font-black text-slate-800">
                                        ${(camp.currentAmount ?? 0).toLocaleString()}
                                        <p className="text-xs text-gray-400 font-normal">de ${(camp.goal ?? 0).toLocaleString()}</p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {statusBadge(camp.medicalDocumentStatus ?? 'pending_upload')}
                                        {camp.medicalAdminNote && (
                                            <p className="text-xs text-gray-400 mt-1 max-w-[150px] truncate italic" title={camp.medicalAdminNote}>
                                                Nota: {camp.medicalAdminNote}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center text-xs text-gray-500">
                                        {camp.medicalDocumentUploadedAt
                                            ? new Date(camp.medicalDocumentUploadedAt.seconds * 1000).toLocaleDateString('es-EC', { day:'2-digit', month:'short', year:'numeric' })
                                            : <span className="text-gray-300 italic">Sin documento</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1 flex-wrap">
                                            {/* Ver documento */}
                                            {camp.medicalDocumentUrl && (
                                                <button
                                                    onClick={() => setDocViewUrl(camp.medicalDocumentUrl)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="Ver documento médico"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                            )}
                                            {/* Ver log */}
                                            <button
                                                onClick={() => openLog(camp)}
                                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                                                title="Ver historial de auditoría"
                                            >
                                                <History className="w-5 h-5" />
                                            </button>
                                            {/* Acciones de revisión */}
                                            {camp.medicalDocumentStatus === 'under_review' && (
                                                <>
                                                    <button
                                                        onClick={() => openActionModal(camp, 'approved')}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                                        title="Aprobar"
                                                    >
                                                        <ShieldCheck className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => openActionModal(camp, 'more_info_required')}
                                                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                                                        title="Solicitar más documentación"
                                                    >
                                                        <MessageSquare className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => openActionModal(camp, 'rejected')}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                        title="Rechazar"
                                                    >
                                                        <XCircle className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                            {/* Enviar mensaje directo al creador */}
                                            <SendMessageButton
                                                userId={camp.organizerId || ''}
                                                userEmail={camp.organizer?.email || ''}
                                                userName={camp.organizer?.name || camp.organizer?.email || 'Creador'}
                                                campaignId={camp.id}
                                                campaignTitle={camp.title}
                                                preselectedCategory="Documentación médica"
                                                buttonLabel=""
                                                buttonClass="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                            />
                                            {/* Ver en sitio */}
                                            <Link
                                                to={`/campaign/${camp.id}`}
                                                target="_blank"
                                                className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition"
                                                title="Ver campaña"
                                            >
                                                <FileText className="w-5 h-5" />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal: Acción (Aprobar / Rechazar / Más info) */}
            {actionModal && (() => {
                const { title, color, btnClass, icon } = actionLabel(actionModal.action);
                const needsNote = actionModal.action !== 'approved';
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                            <div className={`p-6 rounded-t-2xl border ${color}`}>
                                <div className="flex items-center justify-between">
                                    <h2 className="font-bold text-lg flex items-center">{icon}{title}</h2>
                                    <button onClick={() => setActionModal(null)} className="p-1 hover:bg-black/10 rounded-full"><X className="w-5 h-5" /></button>
                                </div>
                                <p className="text-sm mt-2 font-medium">{actionModal.campaign.title}</p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className={`text-sm font-bold text-gray-700 ${needsNote ? '' : 'opacity-60'}`}>
                                        {actionModal.action === 'more_info_required'
                                            ? '📄 Indica qué documentación adicional se requiere (obligatorio)'
                                            : actionModal.action === 'rejected'
                                                ? '❌ Motivo del rechazo (obligatorio)'
                                                : '✅ Nota interna (opcional)'}
                                    </label>
                                    <textarea
                                        rows={4}
                                        required={needsNote}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none text-sm"
                                        placeholder={actionModal.action === 'more_info_required'
                                            ? 'Ej: Por favor suba las facturas médicas y el presupuesto de cirugía...'
                                            : actionModal.action === 'rejected'
                                                ? 'Ej: El documento no es legible, no incluye firma del médico...'
                                                : 'Nota interna sobre la aprobación...'}
                                        value={adminNote}
                                        onChange={e => setAdminNote(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setActionModal(null)}
                                        className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSubmitAction}
                                        disabled={submitting || (needsNote && !adminNote.trim())}
                                        className={`flex-1 py-3 text-white rounded-xl text-sm font-bold transition ${btnClass} disabled:opacity-40 flex items-center justify-center`}
                                    >
                                        {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Modal: Ver documento */}
            {docViewUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setDocViewUrl(null)}>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-3xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b flex items-center justify-between">
                            <h2 className="font-bold text-gray-900 flex items-center"><FileText className="w-5 h-5 mr-2 text-blue-600" /> Documento Médico</h2>
                            <div className="flex gap-2">
                                <a href={docViewUrl} download target="_blank" rel="noreferrer"
                                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition" title="Descargar">
                                    <Download className="w-5 h-5" />
                                </a>
                                <button onClick={() => setDocViewUrl(null)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="overflow-auto max-h-[75vh] flex items-center justify-center p-4 bg-gray-50">
                            {docViewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                                ? <img src={docViewUrl} alt="Documento médico" className="max-w-full max-h-[70vh] object-contain rounded-lg shadow" />
                                : <iframe src={docViewUrl} className="w-full h-[65vh] rounded-lg border" title="Documento PDF" />}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Log de auditoría */}
            {logModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="p-6 border-b flex items-center justify-between">
                            <h2 className="font-bold text-gray-900 flex items-center">
                                <History className="w-5 h-5 mr-2 text-gray-600" /> Historial de Auditoría
                            </h2>
                            <button onClick={() => setLogModal(null)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <p className="px-6 pt-3 text-sm font-bold text-gray-700">{logModal.campaign.title}</p>
                        <div className="flex-1 overflow-y-auto p-6 space-y-3">
                            {loadingLog && <div className="text-center py-8"><RefreshCw className="animate-spin text-primary mx-auto" /></div>}
                            {!loadingLog && logModal.logs.length === 0 && (
                                <p className="text-center text-gray-400 text-sm py-8">Sin registros de auditoría aún.</p>
                            )}
                            {logModal.logs.map((log, i) => (
                                <div key={log.id ?? i} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        log.action === 'approved' ? 'bg-green-100' :
                                        log.action === 'rejected' ? 'bg-red-100' :
                                        log.action === 'more_info_requested' ? 'bg-purple-100' : 'bg-blue-100'
                                    }`}>
                                        {log.action === 'approved' ? <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                                         log.action === 'rejected' ? <XCircle className="w-4 h-4 text-red-600" /> :
                                         log.action === 'more_info_requested' ? <MessageSquare className="w-4 h-4 text-purple-600" /> :
                                         <FileText className="w-4 h-4 text-blue-600" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between flex-wrap gap-1">
                                            <p className="text-xs font-bold text-gray-900">
                                                {log.action === 'uploaded' ? 'Documento subido' :
                                                 log.action === 'resubmitted' ? 'Documento resubido' :
                                                 log.action === 'approved' ? 'Aprobado por admin' :
                                                 log.action === 'rejected' ? 'Rechazado por admin' :
                                                 'Se solicitó más documentación'}
                                            </p>
                                            <span className="text-[10px] text-gray-400">
                                                {log.timestamp?.seconds
                                                    ? new Date(log.timestamp.seconds * 1000).toLocaleString('es-EC')
                                                    : 'Ahora'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-500">
                                            {log.statusBefore} → {log.statusAfter}
                                            {log.adminId && ` • Admin: ${log.adminId}`}
                                        </p>
                                        {log.adminNote && <p className="text-xs text-gray-700 mt-1 italic">{log.adminNote}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// COMPONENTE: MENSAJERÍA ADMINISTRATIVA (AdminMessagesView)
// ─────────────────────────────────────────────────────────────
const MESSAGE_CATEGORIES_LIST: MessageCategory[] = [
    'Verificación de identidad',
    'Verificación bancaria',
    'Verificación de campaña',
    'Documentación médica',
    'Retiro de fondos',
    'Seguridad',
    'Donaciones',
    'Campaña',
    'Soporte',
    'Otro',
];

const STATUS_BADGE_MAP: Record<ConversationStatus, { label: string; cls: string }> = {
    open: { label: 'Abierto', cls: 'bg-blue-100 text-blue-800' },
    waiting_for_user: { label: 'Esperando usuario', cls: 'bg-amber-100 text-amber-800' },
    waiting_for_admin: { label: 'Esperando admin', cls: 'bg-purple-100 text-purple-800 font-bold' },
    resolved: { label: 'Resuelto', cls: 'bg-green-100 text-green-800' },
    closed: { label: 'Cerrado', cls: 'bg-gray-100 text-gray-700' },
    archived: { label: 'Archivado', cls: 'bg-gray-100 text-gray-400' },
};

const AdminMessagesView = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);

    // Filtros y búsqueda
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'waiting_for_admin' | 'waiting_for_user' | 'resolved'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    // Modal nuevo mensaje
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [allCampaigns, setAllCampaigns] = useState<any[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
    const [newCategory, setNewCategory] = useState<MessageCategory>('Soporte');
    const [newSubject, setNewSubject] = useState('');
    const [newBody, setNewBody] = useState('');
    const [submittingNew, setSubmittingNew] = useState(false);

    // Suscripción en tiempo real a todas las conversaciones
    useEffect(() => {
        const unsub = subscribeToAllConversations((convs) => {
            setConversations(convs);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // Cargar usuarios y campañas para modal de redactar
    useEffect(() => {
        getAllUsers().then(setAllUsers).catch(console.error);
        getAllCampaigns().then(setAllCampaigns).catch(console.error);
    }, []);

    // Suscripción a mensajes de la conversación seleccionada
    useEffect(() => {
        if (!selectedConvId) {
            setMessages([]);
            return;
        }

        setLoadingMessages(true);
        // Marcar como leído por el administrador
        markConversationAsRead(selectedConvId, 'admin').catch(console.error);

        const unsub = subscribeToMessages(selectedConvId, (msgs) => {
            setMessages(msgs);
            setLoadingMessages(false);
        });

        return () => unsub();
    }, [selectedConvId]);

    const activeConversation = conversations.find((c) => c.id === selectedConvId);

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedConvId || !activeConversation) return;

        setSendingReply(true);
        try {
            await sendMessage(
                selectedConvId,
                replyText.trim(),
                'admin',
                'admin',
                'Administración Unidos EC'
            );

            await sendSystemNotification.newAdminMessage(
                activeConversation.userId,
                selectedConvId,
                activeConversation.subject
            );

            setReplyText('');
        } catch (error) {
            console.error('Error al enviar respuesta:', error);
            alert('Error al enviar la respuesta');
        } finally {
            setSendingReply(false);
        }
    };

    const handleStatusChange = async (newStatus: ConversationStatus) => {
        if (!selectedConvId) return;
        try {
            await updateConversationStatus(selectedConvId, newStatus);
        } catch (error) {
            console.error('Error al actualizar estado:', error);
            alert('Error al actualizar estado');
        }
    };

    const handleCreateConversation = async () => {
        if (!selectedUser) {
            alert('Por favor selecciona un usuario destinatario.');
            return;
        }
        if (!newSubject.trim() || !newBody.trim()) {
            alert('Por favor completa el asunto y el mensaje.');
            return;
        }

        setSubmittingNew(true);
        try {
            const matchedCampaign = allCampaigns.find((c) => c.id === selectedCampaignId);
            const convId = await createConversation({
                userId: selectedUser.uid,
                userEmail: selectedUser.email || '',
                userName: selectedUser.displayName || selectedUser.email || 'Usuario',
                campaignId: selectedCampaignId || undefined,
                campaignTitle: matchedCampaign?.title || undefined,
                subject: newSubject.trim(),
                category: newCategory,
                firstMessage: newBody.trim(),
                adminId: 'admin',
                adminName: 'Administración Unidos EC',
            });

            await sendSystemNotification.newAdminMessage(
                selectedUser.uid,
                convId,
                newSubject.trim()
            );

            setIsNewModalOpen(false);
            setSelectedUser(null);
            setSelectedCampaignId('');
            setNewSubject('');
            setNewBody('');
            setUserSearch('');
            setSelectedConvId(convId);
            alert('✅ Conversación iniciada correctamente.');
        } catch (error) {
            console.error('Error al crear conversación:', error);
            alert('Error al iniciar la conversación');
        } finally {
            setSubmittingNew(false);
        }
    };

    // Filtrado de conversaciones
    const filteredConversations = conversations.filter((c) => {
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchesUser = (c.userName || '').toLowerCase().includes(q);
            const matchesEmail = (c.userEmail || '').toLowerCase().includes(q);
            const matchesSubject = (c.subject || '').toLowerCase().includes(q);
            const matchesCampaign = (c.campaignTitle || '').toLowerCase().includes(q);
            if (!matchesUser && !matchesEmail && !matchesSubject && !matchesCampaign) {
                return false;
            }
        }

        if (statusFilter === 'unread' && (c.unreadByAdmin || 0) === 0) return false;
        if (statusFilter === 'waiting_for_admin' && c.status !== 'waiting_for_admin') return false;
        if (statusFilter === 'waiting_for_user' && c.status !== 'waiting_for_user') return false;
        if (statusFilter === 'resolved' && c.status !== 'resolved') return false;

        if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;

        return true;
    });

    const unreadCount = conversations.reduce((acc, c) => acc + (c.unreadByAdmin || 0), 0);
    const waitingAdminCount = conversations.filter((c) => c.status === 'waiting_for_admin').length;

    return (
        <div className="space-y-6">
            {/* Cabecera y botón nuevo mensaje */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-blue-600" />
                        Mensajería y Comunicaciones
                        {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {unreadCount} sin leer
                            </span>
                        )}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Centro de comunicación oficial entre la administración y los usuarios de la plataforma
                    </p>
                </div>
                <button
                    onClick={() => setIsNewModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-[#008f5b] transition shadow-md shadow-primary/10"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Mensaje
                </button>
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Buscar por usuario, correo, asunto..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                            statusFilter === 'all'
                                ? 'bg-slate-900 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        Todos ({conversations.length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('unread')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                            statusFilter === 'unread'
                                ? 'bg-red-600 text-white'
                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                        }`}
                    >
                        Sin leer ({unreadCount})
                    </button>
                    <button
                        onClick={() => setStatusFilter('waiting_for_admin')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                            statusFilter === 'waiting_for_admin'
                                ? 'bg-purple-600 text-white'
                                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                        }`}
                    >
                        Requiere respuesta ({waitingAdminCount})
                    </button>
                    <button
                        onClick={() => setStatusFilter('waiting_for_user')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                            statusFilter === 'waiting_for_user'
                                ? 'bg-amber-600 text-white'
                                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                    >
                        Esperando usuario
                    </button>
                    <button
                        onClick={() => setStatusFilter('resolved')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                            statusFilter === 'resolved'
                                ? 'bg-green-600 text-white'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                    >
                        Resueltos
                    </button>

                    {/* Selector de categoría */}
                    <div className="relative min-w-[150px]">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            aria-label="Filtrar por categoría de mensaje"
                            className="w-full px-3 py-1.5 bg-gray-100 border-none rounded-lg text-xs font-bold text-gray-700 focus:ring-2 focus:ring-primary/20 cursor-pointer"
                        >
                            <option value="all">Todas las categorías</option>
                            {MESSAGE_CATEGORIES_LIST.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Contenedor Principal: 2 Columnas (Bandeja / Chat) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[620px]">
                {/* Lista de Conversaciones (Izquierda) */}
                <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[650px]">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                            Conversaciones ({filteredConversations.length})
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                        {loading && (
                            <div className="flex justify-center items-center py-24">
                                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        )}

                        {!loading && filteredConversations.length === 0 && (
                            <div className="text-center py-20 px-6">
                                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-bold text-sm">No hay conversaciones</p>
                                <p className="text-gray-400 text-xs mt-1">
                                    No se encontraron mensajes con los filtros actuales.
                                </p>
                            </div>
                        )}

                        {!loading &&
                            filteredConversations.map((c) => {
                                const isSelected = c.id === selectedConvId;
                                const statusInfo = STATUS_BADGE_MAP[c.status] || {
                                    label: c.status,
                                    cls: 'bg-gray-100 text-gray-600',
                                };

                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => c.id && setSelectedConvId(c.id)}
                                        className={`p-4 cursor-pointer transition-all flex gap-3 text-left ${
                                            isSelected
                                                ? 'bg-blue-50/70 border-l-4 border-blue-600'
                                                : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <div className="w-11 h-11 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                                                {c.userName ? c.userName.charAt(0).toUpperCase() : 'U'}
                                            </div>
                                            {(c.unreadByAdmin || 0) > 0 && (
                                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow">
                                                    {c.unreadByAdmin}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1 mb-1">
                                                <span className="font-bold text-sm text-gray-900 truncate">
                                                    {c.userName || 'Usuario'}
                                                </span>
                                                <span className="text-[10px] text-gray-400 flex-shrink-0">
                                                    {timeAgo(c.lastMessageAt)}
                                                </span>
                                            </div>

                                            <p className="text-xs font-medium text-gray-800 truncate mb-1">
                                                {c.subject}
                                            </p>

                                            <p className="text-xs text-gray-500 truncate mb-2">
                                                {c.lastMessagePreview || 'Sin mensajes'}
                                            </p>

                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span
                                                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${statusInfo.cls}`}
                                                >
                                                    {statusInfo.label}
                                                </span>
                                                <span className="text-[9px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium truncate max-w-[120px]">
                                                    {c.category}
                                                </span>
                                                {c.campaignTitle && (
                                                    <span className="text-[9px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium truncate max-w-[130px]">
                                                        {c.campaignTitle}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>

                {/* Vista del Chat / Hilo (Derecha) */}
                <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[650px]">
                    {!selectedConvId || !activeConversation ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50">
                            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                                <MessageSquare className="w-8 h-8" />
                            </div>
                            <h3 className="font-bold text-gray-800 text-lg">
                                Ninguna conversación seleccionada
                            </h3>
                            <p className="text-gray-500 text-sm max-w-sm mt-1 mb-6">
                                Elige una conversación de la lista lateral para leer y responder, o inicia un nuevo mensaje directo.
                            </p>
                            <button
                                onClick={() => setIsNewModalOpen(true)}
                                className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-[#008f5b] transition shadow-md shadow-primary/10"
                            >
                                Iniciar nueva conversación
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Cabecera del Hilo */}
                            <div className="p-4 border-b border-gray-100 bg-white flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm flex-shrink-0">
                                            {activeConversation.userName
                                                ? activeConversation.userName.charAt(0).toUpperCase()
                                                : 'U'}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-gray-900 text-base leading-tight truncate">
                                                {activeConversation.userName}
                                            </h3>
                                            <p className="text-xs text-gray-500 truncate">
                                                {activeConversation.userEmail}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Selector de Estado */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-500 hidden sm:inline">
                                            Estado:
                                        </span>
                                        <select
                                            value={activeConversation.status}
                                            onChange={(e) =>
                                                handleStatusChange(e.target.value as ConversationStatus)
                                            }
                                            aria-label="Estado de la conversación"
                                            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                                        >
                                            <option value="open">Abierto</option>
                                            <option value="waiting_for_user">Esperando usuario</option>
                                            <option value="waiting_for_admin">Esperando admin</option>
                                            <option value="resolved">Resuelto</option>
                                            <option value="closed">Cerrado</option>
                                            <option value="archived">Archivado</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-gray-50">
                                    <span className="font-bold text-gray-900">
                                        Asunto: {activeConversation.subject}
                                    </span>
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-medium">
                                        {activeConversation.category}
                                    </span>
                                    {activeConversation.campaignTitle && activeConversation.campaignId && (
                                        <Link
                                            to={`/campaign/${activeConversation.campaignId}`}
                                            target="_blank"
                                            className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md font-medium transition truncate max-w-[250px]"
                                        >
                                            Campaña: {activeConversation.campaignTitle}
                                        </Link>
                                    )}
                                </div>
                            </div>

                            {/* Mensajes (Lista con scroll) */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/60">
                                {loadingMessages && (
                                    <div className="flex justify-center items-center py-20">
                                        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                                    </div>
                                )}

                                {!loadingMessages &&
                                    messages.map((m) => {
                                        const isAdmin = m.senderType === 'admin';
                                        return (
                                            <div
                                                key={m.id}
                                                className={`flex ${
                                                    isAdmin ? 'justify-end' : 'justify-start'
                                                }`}
                                            >
                                                <div
                                                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-sm ${
                                                        isAdmin
                                                            ? 'bg-slate-900 text-white rounded-br-sm'
                                                            : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-4 mb-1">
                                                        <span
                                                            className={`text-[10px] font-bold ${
                                                                isAdmin ? 'text-blue-300' : 'text-primary'
                                                            }`}
                                                        >
                                                            {isAdmin
                                                                ? 'Administración Unidos'
                                                                : m.senderName || 'Usuario'}
                                                        </span>
                                                        <span
                                                            className={`text-[10px] ${
                                                                isAdmin ? 'text-gray-400' : 'text-gray-400'
                                                            }`}
                                                        >
                                                            {m.createdAt?.seconds
                                                                ? new Date(
                                                                      m.createdAt.seconds * 1000
                                                                  ).toLocaleString('es-EC', {
                                                                      hour: '2-digit',
                                                                      minute: '2-digit',
                                                                      day: '2-digit',
                                                                      month: 'short',
                                                                  })
                                                                : 'Ahora'}
                                                        </span>
                                                    </div>

                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                        {m.message}
                                                    </p>

                                                    {isAdmin && (
                                                        <div className="text-right mt-1">
                                                            <span className="text-[10px] text-gray-400">
                                                                {m.isReadByUser
                                                                    ? '✓✓ Leído por el usuario'
                                                                    : '✓ Entregado'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>

                            {/* Caja de Respuesta */}
                            <div className="p-4 bg-white border-t border-gray-100">
                                <div className="flex gap-2">
                                    <textarea
                                        rows={2}
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendReply();
                                            }
                                        }}
                                        placeholder="Escribe una respuesta como administrador... (Presiona Enter para enviar)"
                                        className="flex-1 p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                    />
                                    <button
                                        onClick={handleSendReply}
                                        disabled={sendingReply || !replyText.trim()}
                                        className="px-5 bg-primary text-white rounded-xl font-bold hover:bg-[#008f5b] transition disabled:opacity-40 flex items-center justify-center flex-shrink-0"
                                    >
                                        {sendingReply ? (
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Send className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal Redactar Nueva Conversación */}
            {isNewModalOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={(e) => e.target === e.currentTarget && setIsNewModalOpen(false)}
                >
                    <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-center justify-between z-10">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-blue-600" />
                                Iniciar Nueva Conversación
                            </h2>
                            <button
                                onClick={() => setIsNewModalOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Selector de Usuario */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    Destinatario (Usuario Registrado) *
                                </label>
                                {selectedUser ? (
                                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">
                                                {selectedUser.displayName || 'Usuario'}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {selectedUser.email}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedUser(null)}
                                            className="text-xs text-red-600 font-bold hover:underline ml-3"
                                        >
                                            Cambiar
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Buscar usuario por nombre o correo..."
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary mb-2"
                                        />
                                        <div className="max-h-36 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                                            {allUsers
                                                .filter(
                                                    (u) =>
                                                        (u.displayName || '')
                                                            .toLowerCase()
                                                            .includes(userSearch.toLowerCase()) ||
                                                        (u.email || '')
                                                            .toLowerCase()
                                                            .includes(userSearch.toLowerCase())
                                                )
                                                .slice(0, 8)
                                                .map((u) => (
                                                    <div
                                                        key={u.uid}
                                                        onClick={() => {
                                                            setSelectedUser(u);
                                                            setUserSearch('');
                                                        }}
                                                        className="p-2.5 hover:bg-gray-50 cursor-pointer flex items-center justify-between text-sm transition"
                                                    >
                                                        <span className="font-medium text-gray-900 truncate">
                                                            {u.displayName || u.email}
                                                        </span>
                                                        <span className="text-xs text-gray-400 truncate ml-2">
                                                            {u.email}
                                                        </span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Campaña Asociada (Opcional) */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    Campaña Asociada (Opcional)
                                </label>
                                <select
                                    value={selectedCampaignId}
                                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="">-- Sin campaña asociada --</option>
                                    {allCampaigns.map((camp) => (
                                        <option key={camp.id} value={camp.id}>
                                            {camp.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Categoría */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    Categoría de Asunto *
                                </label>
                                <select
                                    value={newCategory}
                                    onChange={(e) =>
                                        setNewCategory(e.target.value as MessageCategory)
                                    }
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    {MESSAGE_CATEGORIES_LIST.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Asunto */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    Asunto *
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: Verificación médica requerida para tu campaña"
                                    value={newSubject}
                                    onChange={(e) => setNewSubject(e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            {/* Primer Mensaje */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    Mensaje *
                                </label>
                                <textarea
                                    rows={4}
                                    placeholder="Escribe el mensaje detallado para el usuario..."
                                    value={newBody}
                                    onChange={(e) => setNewBody(e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                />
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 flex gap-3 justify-end bg-gray-50 rounded-b-2xl">
                            <button
                                onClick={() => setIsNewModalOpen(false)}
                                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateConversation}
                                disabled={submittingNew}
                                className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-[#008f5b] transition disabled:opacity-40 flex items-center gap-2 shadow-md shadow-primary/10"
                            >
                                {submittingNew ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Enviar Mensaje
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;

