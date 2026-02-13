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
    Landmark,
    Clock,
    CheckCircle2
} from 'lucide-react';
import {
    getAllCampaigns,
    updateCampaignStatus,
    deleteCampaign,
    getAllDonations,
    getAllUsers,
    deleteUser,
    updateDonation,
    deleteDonation
} from '../services/adminService';
import { getAllWithdrawalRequests, type WithdrawalRequest } from '../services/withdrawalService';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
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

    const sidebarItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'donations', label: 'Donaciones', icon: HeartHandshake },
        { id: 'users', label: 'Usuarios', icon: Users },
        { id: 'withdrawals', label: 'Retiros', icon: Landmark },
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
                                        {isActive && <ChevronRight className="w-4 h-4" />}
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

    const handleStatus = async (id: string, status: any) => {
        if (!confirm(`¿Estás seguro de cambiar el estado a ${status}?`)) return;
        try {
            await updateCampaignStatus(id, status);
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

    if (loading) return <div className="flex justify-center items-center py-20"><RefreshCw className="animate-spin text-primary" /></div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex space-x-2">
                    <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform">
                        Todas ({campaigns.length})
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
                        {campaigns.map((camp) => (
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
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${camp.status === 'active' || camp.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {camp.status || 'active'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-bold text-sm">
                                    ${camp.currentAmount?.toLocaleString()} / ${camp.goal?.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end space-x-1">
                                        <Link to={`/campaign/${camp.id}`} target="_blank" className="p-2 text-gray-400 hover:text-primary transition-colors hover:bg-primary/5 rounded-lg" title="Ver"><Eye className="w-4 h-4" /></Link>
                                        <button onClick={() => handleStatus(camp.id, 'approved')} className="p-2 text-gray-400 hover:text-green-500 transition-colors hover:bg-green-50 rounded-lg" title="Aprobar"><CheckCircle className="w-4 h-4" /></button>
                                        <button onClick={() => handleStatus(camp.id, 'hidden')} className="p-2 text-gray-400 hover:text-amber-500 transition-colors hover:bg-amber-50 rounded-lg" title="Ocultar"><XCircle className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(camp.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-lg" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
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
                                    <button
                                        onClick={() => handleDelete(user.uid)}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-lg"
                                        title="Eliminar Usuario"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
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
                                    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                            req.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                'bg-gray-100 text-gray-600'
                                        }`}>
                                        {req.status === 'pending' ? <Clock className="w-3 h-3 mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                                        {req.status === 'pending' ? 'Pendiente' : 'Completado'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="p-2 text-primary hover:bg-primary/5 rounded-lg transition" title="Marcar como completado">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </button>
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

export default AdminDashboard;
