import React, { useState, useEffect } from 'react';
import {
    collection,
    query,
    orderBy,
    getDocs,
    doc,
    getDoc,
    where
} from 'firebase/firestore';
import { db } from '../firebase';
import {
    ShieldAlert,
    ShieldCheck,
    AlertTriangle,
    Clock,
    FileText,
    CheckCircle2,
    XCircle,
    User,
    RefreshCw,
    Search,
    ExternalLink,
    Camera,
    DollarSign,
    Scale,
    Send,
    Eye,
    CornerDownRight
} from 'lucide-react';
import {
    type ComplianceCase,
    type ComplianceAction,
    type ComplianceCaseStatus,
    type RefundStatus,
    type ReportedClaim,
    captureAndSaveEvidenceSnapshot,
    advanceCaseStage,
    resolveComplianceCase,
    updateDonorRefundStatus,
    evaluateClaimType
} from '../services/complianceService';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export const ComplianceManagementView: React.FC = () => {
    const { user } = useAuth();
    const [cases, setCases] = useState<ComplianceCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');
    const [selectedCase, setSelectedCase] = useState<ComplianceCase | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'snapshot' | 'defense' | 'resolution' | 'refunds' | 'audit'>('details');

    // Snapshot form state
    const [claimInput, setClaimInput] = useState('');
    const [claimSourceInput, setClaimSourceInput] = useState('Actualización de campaña');
    const [officialContrastInput, setOfficialContrastInput] = useState('');
    const [claimsList, setClaimsList] = useState<ReportedClaim[]>([]);
    const [officialPlatformNotes, setOfficialPlatformNotes] = useState('');
    const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);

    // Defense form state
    const [defenseText, setDefenseText] = useState('');
    const [isSubmittingDefense, setIsSubmittingDefense] = useState(false);

    // Resolution form state
    const [selectedAction, setSelectedAction] = useState<ComplianceAction>('FORMAL_WARNING');
    const [resolutionRationale, setResolutionRationale] = useState('');
    const [isResolving, setIsResolving] = useState(false);

    const fetchCases = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'compliance_cases'), orderBy('reportedAt', 'desc'));
            const snap = await getDocs(q);
            const list: ComplianceCase[] = [];
            snap.forEach(d => {
                list.push({ id: d.id, ...d.data() } as ComplianceCase);
            });
            setCases(list);
            if (selectedCase) {
                const refreshed = list.find(c => c.id === selectedCase.id);
                if (refreshed) setSelectedCase(refreshed);
            }
        } catch (error) {
            console.error('Error cargando casos de cumplimiento:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCases();
    }, []);

    const handleAddClaim = () => {
        if (!claimInput.trim()) return;
        const evaluation = evaluateClaimType(claimInput);
        const newClaim: ReportedClaim = {
            claimText: claimInput,
            source: claimSourceInput,
            evidenceComparison: officialContrastInput || 'En contraste con registros contables oficiales.',
            isProtectedCriticism: evaluation.isProtected
        };
        setClaimsList([...claimsList, newClaim]);
        setClaimInput('');
        setOfficialContrastInput('');
    };

    const handleRemoveClaim = (idx: number) => {
        setClaimsList(claimsList.filter((_, i) => i !== idx));
    };

    const handleSaveSnapshot = async () => {
        if (!selectedCase?.id) return;
        setIsSavingSnapshot(true);
        try {
            const adminEmail = user?.email || 'admin@unidos.ec';
            await captureAndSaveEvidenceSnapshot(
                selectedCase.id,
                selectedCase.campaignId,
                adminEmail,
                claimsList,
                officialPlatformNotes
            );
            alert('✅ Snapshot inmutable guardado y vinculado al caso con éxito.');
            await fetchCases();
            setActiveTab('snapshot');
        } catch (err: any) {
            console.error('Error guardando snapshot:', err);
            alert('Error: ' + (err?.message || 'No se pudo guardar'));
        } finally {
            setIsSavingSnapshot(false);
        }
    };

    const handleAdvanceStage = async (nextStatus: ComplianceCaseStatus, notes: string) => {
        if (!selectedCase?.id) return;
        try {
            const adminEmail = user?.email || 'admin@unidos.ec';
            await advanceCaseStage(selectedCase.id, nextStatus, adminEmail, notes);
            alert(`✅ Etapa actualizada a: ${nextStatus}`);
            await fetchCases();
        } catch (err: any) {
            console.error('Error actualizando etapa:', err);
            alert('Error al actualizar etapa: ' + err.message);
        }
    };

    const handleRecordDefense = async () => {
        if (!selectedCase?.id || !defenseText.trim()) return;
        setIsSubmittingDefense(true);
        try {
            const adminEmail = user?.email || 'admin@unidos.ec';
            await advanceCaseStage(
                selectedCase.id,
                'USER_RESPONDED',
                adminEmail,
                `Descargo formal registrado: "${defenseText.substring(0, 80)}..."`,
                {
                    userResponseText: defenseText,
                    userRespondedAt: new Date().toISOString()
                }
            );
            alert('✅ Descargo de la parte interesada registrado correctamente.');
            setDefenseText('');
            await fetchCases();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setIsSubmittingDefense(false);
        }
    };

    const handleResolve = async () => {
        if (!selectedCase?.id) return;
        if (!resolutionRationale.trim()) {
            alert('Debes ingresar la motivación jurídica y fáctica de la resolución.');
            return;
        }

        const confirmMsg = selectedAction === 'PERMANENT_CANCELLATION'
            ? '⚠️ ATENCIÓN: La cancelación definitiva dará de baja la campaña y habilitará el proceso de devolución de fondos a donantes. ¿Confirmar resolución?'
            : selectedAction === 'TEMPORARY_SUSPENSION'
                ? '⚠️ Se suspenderá preventivamente la campaña pausando donaciones. ¿Confirmar?'
                : `¿Confirmar adopción de la medida: ${selectedAction}?`;

        if (!confirm(confirmMsg)) return;

        setIsResolving(true);
        try {
            const adminEmail = user?.email || 'admin@unidos.ec';
            await resolveComplianceCase(
                selectedCase.id,
                selectedAction,
                resolutionRationale,
                adminEmail
            );
            alert('✅ Resolución adoptada y formalizada en el sistema. Notificación de 8 puntos emitida.');
            await fetchCases();
            setActiveTab('resolution');
        } catch (err: any) {
            console.error('Error resolviendo caso:', err);
            alert('Error al resolver caso: ' + err.message);
        } finally {
            setIsResolving(false);
        }
    };

    const handleUpdateDonorStatus = async (donationId: string, newStatus: RefundStatus, gatewayRef?: string) => {
        if (!selectedCase?.id) return;
        try {
            await updateDonorRefundStatus(selectedCase.id, selectedCase.campaignId, donationId, newStatus, gatewayRef);
            await fetchCases();
        } catch (err: any) {
            alert('Error actualizando donante: ' + err.message);
        }
    };

    // Filter logic
    const filteredCases = cases.filter(c => {
        const matchesSearch =
            c.campaignTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.organizerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.reportReason.toLowerCase().includes(searchTerm.toLowerCase());

        const isResolved = c.status.startsWith('RESOLVED_');
        if (statusFilter === 'pending') return matchesSearch && !isResolved;
        if (statusFilter === 'resolved') return matchesSearch && isResolved;
        return matchesSearch;
    });

    const getStatusBadge = (status: ComplianceCaseStatus) => {
        switch (status) {
            case 'REPORTED':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-100 text-red-800">Reportado</span>;
            case 'UNDER_REVIEW':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-800">En Evaluación</span>;
            case 'EVIDENCE_COLLECTION':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-800">Recolección de Evidencia</span>;
            case 'USER_RESPONSE_REQUESTED':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-100 text-purple-800">Descargos Solicitados</span>;
            case 'USER_RESPONDED':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-100 text-indigo-800">Descargos Recibidos</span>;
            case 'ADMIN_REVIEW':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-orange-100 text-orange-800">Revisión Final Admin</span>;
            case 'RESOLVED_NO_ACTION':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-100 text-gray-700">Archivado sin sanción</span>;
            case 'RESOLVED_WARNING':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-900 border border-amber-300">Amonestación</span>;
            case 'RESOLVED_RECTIFICATION':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-100 text-purple-900 border border-purple-300">Rectificación requerida</span>;
            case 'RESOLVED_SUSPENSION':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500 text-white font-black">Suspendida</span>;
            case 'RESOLVED_CANCELLATION':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-600 text-white font-black">Cancelada Definitivamente</span>;
            default:
                return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100">
                            <Scale className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900">
                            Cumplimiento, Integridad y Conducta
                        </h2>
                    </div>
                    <p className="text-xs text-gray-500 max-w-2xl">
                        Módulo de debida diligencia de conformidad con la <strong>Sección 6 de los Términos y Condiciones</strong>. Gestión de reportes, custodia de snapshots probatorios inmutables, distinción de críticas protegidas vs aseveraciones falsas y restitución rigurosa de fondos a donantes.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchCases}
                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs flex items-center gap-2 transition"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Buscar por campaña, organizador o motivo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </div>

                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
                    {(['all', 'pending', 'resolved'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${statusFilter === f ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {f === 'all' ? `Todos (${cases.length})` : f === 'pending' ? 'En Trámite' : 'Resueltos'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Layout: List & Case Detail Modal/Drawer */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                                <th className="p-4">Campaña / Organizador</th>
                                <th className="p-4">Categoría del Reporte</th>
                                <th className="p-4">Motivo / Hecho Señalado</th>
                                <th className="p-4">Estado del Trámite</th>
                                <th className="p-4">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                            {filteredCases.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400 italic">
                                        No hay casos de cumplimiento en esta categoría.
                                    </td>
                                </tr>
                            ) : (
                                filteredCases.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-50/70 transition">
                                        <td className="p-4">
                                            <p className="font-bold text-gray-900">{c.campaignTitle}</p>
                                            <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                                <User className="w-3 h-3" /> {c.organizerName} ({c.organizerEmail || 'Sin email'})
                                            </p>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                                {c.reportedCategory}
                                            </span>
                                        </td>
                                        <td className="p-4 max-w-xs">
                                            <p className="truncate text-gray-700">{c.reportReason}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                                Denunciante: {c.reporterName || 'Anónimo'}
                                            </p>
                                        </td>
                                        <td className="p-4">
                                            {getStatusBadge(c.status)}
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => {
                                                    setSelectedCase(c);
                                                    setActiveTab('details');
                                                }}
                                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                Gestionar Expediente
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CASE DOSSIER MODAL */}
            {selectedCase && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 bg-slate-900 text-white flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                                        Expediente #{selectedCase.id?.substring(0, 8)}
                                    </span>
                                    {getStatusBadge(selectedCase.status)}
                                </div>
                                <h3 className="text-xl font-black text-white">
                                    {selectedCase.campaignTitle}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Organizador: {selectedCase.organizerName} • ID Campaña: {selectedCase.campaignId}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedCase(null)}
                                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex border-b border-gray-200 bg-gray-50 px-6 gap-1 overflow-x-auto">
                            {[
                                { id: 'details', label: '1. Denuncia y Hechos', icon: FileText },
                                { id: 'snapshot', label: '2. Evidencia Congelada', icon: Camera },
                                { id: 'defense', label: '3. Descargos de Parte', icon: User },
                                { id: 'resolution', label: '4. Resolución y Notificación', icon: Scale },
                                { id: 'refunds', label: '5. Devoluciones a Donantes', icon: DollarSign },
                                { id: 'audit', label: '6. Pista de Auditoría', icon: Clock },
                            ].map(t => {
                                const Icon = t.icon;
                                const isActive = activeTab === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => setActiveTab(t.id as any)}
                                        className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${isActive
                                            ? 'border-primary text-primary bg-white'
                                            : 'border-transparent text-gray-500 hover:text-gray-800'
                                            }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Body Content */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {/* TAB 1: DETAILS */}
                            {activeTab === 'details' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                                Datos de la Denuncia
                                            </h4>
                                            <p className="text-sm"><strong>Categoría:</strong> {selectedCase.reportedCategory}</p>
                                            <p className="text-sm"><strong>Denunciante:</strong> {selectedCase.reporterName || 'Anónimo'} ({selectedCase.reporterEmail || 'Sin email'})</p>
                                            <p className="text-sm mt-2 text-gray-700 bg-white p-3 rounded-xl border border-gray-200">
                                                "{selectedCase.reportReason}"
                                            </p>
                                        </div>

                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                                Criterio de Evaluación Objetiva (Sección 6.2)
                                            </h4>
                                            {(() => {
                                                const evalResult = evaluateClaimType(selectedCase.reportReason);
                                                return evalResult.isProtected ? (
                                                    <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl text-emerald-900 text-xs space-y-1">
                                                        <p className="font-bold flex items-center gap-1">
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                            CRÍTICA U OPINIÓN PROTEGIDA (NO SANCIONABLE)
                                                        </p>
                                                        <p>{evalResult.rationale}</p>
                                                        <p className="text-[11px] text-emerald-700">
                                                            La expresión de quejas por tiempos, insatisfacción o crítica al servicio no constituye causal de sanción contractual.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl text-amber-900 text-xs space-y-1">
                                                        <p className="font-bold flex items-center gap-1">
                                                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                                                            ASEVERACIÓN DE HECHO CONTRASTABLE
                                                        </p>
                                                        <p>{evalResult.rationale}</p>
                                                        <p className="text-[11px] text-amber-800">
                                                            Proceder a cotejo probatorio objetivo con registros de pasarela bancaria y auditoría contable.
                                                        </p>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Action bar for advancing stage */}
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                                            Avanzar Etapa del Procedimiento de Debida Diligencia
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => handleAdvanceStage('UNDER_REVIEW', 'Apertura de expediente formal bajo revisión de auditoría')}
                                                className="px-3 py-1.5 bg-amber-100 text-amber-800 hover:bg-amber-200 font-bold rounded-xl text-xs transition"
                                            >
                                                Poner En Evaluación
                                            </button>
                                            <button
                                                onClick={() => handleAdvanceStage('EVIDENCE_COLLECTION', 'Iniciada recolección y aseguramiento de evidencia')}
                                                className="px-3 py-1.5 bg-blue-100 text-blue-800 hover:bg-blue-200 font-bold rounded-xl text-xs transition"
                                            >
                                                Recolección de Evidencia
                                            </button>
                                            <button
                                                onClick={() => handleAdvanceStage('USER_RESPONSE_REQUESTED', 'Requerimiento de descargos remitido al organizador')}
                                                className="px-3 py-1.5 bg-purple-100 text-purple-800 hover:bg-purple-200 font-bold rounded-xl text-xs transition"
                                            >
                                                Solicitar Descargos (48h)
                                            </button>
                                            <button
                                                onClick={() => handleAdvanceStage('ADMIN_REVIEW', 'Revisión final de administración convocada para resolver')}
                                                className="px-3 py-1.5 bg-orange-100 text-orange-800 hover:bg-orange-200 font-bold rounded-xl text-xs transition"
                                            >
                                                Llevar a Revisión Final
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: EVIDENCE SNAPSHOT */}
                            {activeTab === 'snapshot' && (
                                <div className="space-y-6">
                                    {selectedCase.evidenceSnapshot ? (
                                        <div className="space-y-4">
                                            <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                        Snapshot Inmutable Congelado y Asegurado
                                                    </h4>
                                                    <p className="text-xs text-emerald-700 mt-0.5">
                                                        Capturado el: {new Date(selectedCase.evidenceSnapshot.capturedAt).toLocaleString()} por {selectedCase.evidenceSnapshot.capturedBy}
                                                    </p>
                                                </div>
                                                <span className="font-mono text-xs font-bold bg-white text-emerald-800 px-3 py-1 rounded-lg border border-emerald-200">
                                                    Versión T&C: {selectedCase.evidenceSnapshot.termsVersionAccepted}
                                                </span>
                                            </div>

                                            {/* Frozen campaign indicators */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Total Donado Registrado</p>
                                                    <p className="text-base font-black text-gray-900">${selectedCase.evidenceSnapshot.currentAmount}</p>
                                                </div>
                                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Meta Original</p>
                                                    <p className="text-base font-black text-gray-900">${selectedCase.evidenceSnapshot.campaignGoal}</p>
                                                </div>
                                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Donantes Registrados</p>
                                                    <p className="text-base font-black text-gray-900">{selectedCase.evidenceSnapshot.donorCount}</p>
                                                </div>
                                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Desembolsado Real</p>
                                                    <p className="text-base font-black text-gray-900">${selectedCase.evidenceSnapshot.officialRecordsSummary.verifiedDisbursedAmount}</p>
                                                </div>
                                            </div>

                                            {/* Contrast claims table */}
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                                    Declaraciones Analizadas y Contrastadas Objetivamente
                                                </h4>
                                                <div className="space-y-2">
                                                    {selectedCase.evidenceSnapshot.reportedClaims.map((cl, i) => (
                                                        <div key={i} className="p-3 bg-white border border-gray-200 rounded-xl text-xs space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-bold text-gray-800">"{cl.claimText}"</span>
                                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                                                                    {cl.source}
                                                                </span>
                                                            </div>
                                                            <p className="text-gray-600 flex items-center gap-1 text-[11px]">
                                                                <CornerDownRight className="w-3 h-3 text-primary shrink-0" />
                                                                <strong>Cotejo oficial:</strong> {cl.evidenceComparison}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-300 space-y-4">
                                            <div className="flex items-start gap-3">
                                                <Camera className="w-6 h-6 text-slate-600 shrink-0" />
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900">
                                                        Capturar Snapshot de Evidencia Inmutable
                                                    </h4>
                                                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                                                        Congela el estado exacto de la campaña (recaudación real, donaciones, textos, versión de términos aceptados) para que cualquier alteración posterior no impida la evaluación rigurosa.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Add claim line */}
                                            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                                                <h5 className="text-xs font-bold text-gray-700 uppercase">
                                                    Agregar Declaraciones a Contrastar
                                                </h5>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Declaración textual..."
                                                        value={claimInput}
                                                        onChange={(e) => setClaimInput(e.target.value)}
                                                        className="sm:col-span-2 px-3 py-2 text-xs border rounded-xl"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Fuente (ej. Actualización #1)"
                                                        value={claimSourceInput}
                                                        onChange={(e) => setClaimSourceInput(e.target.value)}
                                                        className="px-3 py-2 text-xs border rounded-xl"
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Contraste con registros del sistema..."
                                                    value={officialContrastInput}
                                                    onChange={(e) => setOfficialContrastInput(e.target.value)}
                                                    className="w-full px-3 py-2 text-xs border rounded-xl"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddClaim}
                                                    className="px-3 py-1.5 bg-slate-900 text-white font-bold rounded-lg text-xs"
                                                >
                                                    + Añadir Declaración
                                                </button>

                                                {claimsList.length > 0 && (
                                                    <div className="space-y-1.5 pt-2">
                                                        {claimsList.map((c, idx) => (
                                                            <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                                                                <span>"{c.claimText}"</span>
                                                                <button
                                                                    onClick={() => handleRemoveClaim(idx)}
                                                                    className="text-red-500 font-bold"
                                                                >
                                                                    Eliminar
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                                    Notas de Auditoría Oficial de la Plataforma
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    value={officialPlatformNotes}
                                                    onChange={(e) => setOfficialPlatformNotes(e.target.value)}
                                                    placeholder="Observaciones de auditoría..."
                                                    className="w-full px-3 py-2 text-xs border rounded-xl"
                                                />
                                            </div>

                                            <button
                                                onClick={handleSaveSnapshot}
                                                disabled={isSavingSnapshot}
                                                className="w-full py-3 bg-primary text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md hover:bg-[#008f5b] transition"
                                            >
                                                <Camera className="w-4 h-4" />
                                                {isSavingSnapshot ? 'Congelando...' : 'Congelar Snapshot de Evidencia'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 3: DEFENSE */}
                            {activeTab === 'defense' && (
                                <div className="space-y-4">
                                    <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl">
                                        <h4 className="text-sm font-bold text-purple-900">
                                            Garantía de Audiencia y Descargos (Sección 6.3)
                                        </h4>
                                        <p className="text-xs text-purple-800 mt-0.5">
                                            Antes de adoptar sanciones definitivas, el usuario tiene derecho a exponer su versión, presentar comprobantes o retractarse.
                                        </p>
                                    </div>

                                    {selectedCase.userResponseText ? (
                                        <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-2">
                                            <p className="text-xs text-gray-500">
                                                Respuesta registrada el: {selectedCase.userRespondedAt ? new Date(selectedCase.userRespondedAt).toLocaleString() : 'Fecha no especificada'}
                                            </p>
                                            <p className="text-sm text-gray-800 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                                "{selectedCase.userResponseText}"
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                                            <label className="block text-xs font-bold text-gray-700 uppercase">
                                                Registrar Descargo del Organizador / Usuario
                                            </label>
                                            <textarea
                                                rows={4}
                                                value={defenseText}
                                                onChange={(e) => setDefenseText(e.target.value)}
                                                placeholder="Transcribe o pega aquí el descargo, comprobantes o aclaraciones presentadas por el organizador..."
                                                className="w-full px-3 py-2.5 text-xs border rounded-xl focus:bg-white"
                                            />
                                            <button
                                                onClick={handleRecordDefense}
                                                disabled={isSubmittingDefense || !defenseText.trim()}
                                                className="px-4 py-2.5 bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 hover:bg-purple-800 transition disabled:opacity-60"
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                                {isSubmittingDefense ? 'Guardando...' : 'Registrar Descargo Oficial'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 4: RESOLUTION */}
                            {activeTab === 'resolution' && (
                                <div className="space-y-6">
                                    {selectedCase.decision ? (
                                        <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4">
                                            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                                <div>
                                                    <span className="text-[10px] text-gray-400 uppercase font-bold">Resolución Adoptada</span>
                                                    <h4 className="text-lg font-black text-gray-900">{selectedCase.decision.action}</h4>
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                    Resuelto por: {selectedCase.decision.decidedBy}
                                                </p>
                                            </div>
                                            <p className="text-xs text-gray-700">
                                                <strong>Motivación:</strong> {selectedCase.decision.rationale}
                                            </p>

                                            {selectedCase.formalNotification && (
                                                <div className="bg-slate-900 text-white p-4 rounded-xl text-xs space-y-2">
                                                    <p className="text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                                                        Notificación Formal Emitida (8 Puntos de Ley)
                                                    </p>
                                                    <p>1. Sujeto: {selectedCase.formalNotification.identificationOfSubject}</p>
                                                    <p>2. Hechos: {selectedCase.formalNotification.descriptionOfFalseClaims}</p>
                                                    <p>3. Contraste probatorio: {selectedCase.formalNotification.officialEvidenceContrast}</p>
                                                    <p>4. Cláusula infringida: {selectedCase.formalNotification.infringedTermsClause}</p>
                                                    <p>5. Medida: {selectedCase.formalNotification.adoptedMeasure}</p>
                                                    <p>6. Derecho a la defensa: {selectedCase.formalNotification.defenseRightNotice}</p>
                                                    <p>7. Fondos: {selectedCase.formalNotification.fundsAndRefundsDestination}</p>
                                                    <p>8. Reserva legal: {selectedCase.formalNotification.legalReservation}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                                                Formular Resolución Administrativa
                                            </h4>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                                                    Medida Contractual a Aplicar
                                                </label>
                                                <select
                                                    value={selectedAction}
                                                    onChange={(e) => setSelectedAction(e.target.value as ComplianceAction)}
                                                    className="w-full px-3 py-2 text-xs border rounded-xl bg-white font-bold"
                                                >
                                                    <option value="NO_ACTION">1. Archivo del expediente sin sanción (Crítica protegida o falta de mérito)</option>
                                                    <option value="FORMAL_WARNING">2. Amonestación formal con requerimiento de cese</option>
                                                    <option value="RECTIFICATION_REQUEST">3. Requerimiento de rectificación pública en 48 horas</option>
                                                    <option value="TEMPORARY_SUSPENSION">4. Suspensión temporal cautelar (Congela donaciones)</option>
                                                    <option value="PERMANENT_CANCELLATION">5. Cancelación definitiva y restitución de fondos a donantes</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                                                    Motivación Fáctica y Jurídica de la Resolución *
                                                </label>
                                                <textarea
                                                    rows={4}
                                                    value={resolutionRationale}
                                                    onChange={(e) => setResolutionRationale(e.target.value)}
                                                    placeholder="Detalla con claridad los hechos contrastados, cláusula contractual aplicada y motivo de la sanción..."
                                                    className="w-full px-3 py-2 text-xs border rounded-xl bg-white"
                                                />
                                            </div>

                                            <button
                                                onClick={handleResolve}
                                                disabled={isResolving || !resolutionRationale.trim()}
                                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50"
                                            >
                                                {isResolving ? 'Resolviendo...' : 'Adoptar y Notificar Resolución'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 5: REFUNDS */}
                            {activeTab === 'refunds' && (
                                <div className="space-y-4">
                                    {selectedCase.refundSummary ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Total Recaudado Bruto</p>
                                                    <p className="text-xl font-black text-gray-900">${selectedCase.refundSummary.totalCollected}</p>
                                                </div>
                                                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Comisiones de Pasarela (5%)</p>
                                                    <p className="text-xl font-black text-red-600">-${selectedCase.refundSummary.totalGatewayFees}</p>
                                                </div>
                                                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
                                                    <p className="text-[10px] text-emerald-700 uppercase font-bold">Total Neto Reintegrable</p>
                                                    <p className="text-xl font-black text-emerald-800">${selectedCase.refundSummary.totalNetRefundable}</p>
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
                                                <strong>Fórmula legal aplicada:</strong> <code>Monto Recaudado - Comisiones de Pasarela No Recuperables = Monto a Devolver</code>. No se aplican penalidades operativas arbitrarias.
                                            </div>

                                            <div className="border border-gray-200 rounded-2xl overflow-hidden">
                                                <table className="w-full text-left text-xs">
                                                    <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold">
                                                        <tr>
                                                            <th className="p-3">Donante</th>
                                                            <th className="p-3">Monto Donado</th>
                                                            <th className="p-3">Comisión Pasarela</th>
                                                            <th className="p-3">Neto a Devolver</th>
                                                            <th className="p-3">Estado</th>
                                                            <th className="p-3">Acción</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {selectedCase.refundSummary.donors.map(d => (
                                                            <tr key={d.donationId} className="hover:bg-slate-50">
                                                                <td className="p-3 font-semibold text-gray-900">
                                                                    {d.donorName}
                                                                </td>
                                                                <td className="p-3">${d.amount}</td>
                                                                <td className="p-3 text-red-600">-${d.processingFee}</td>
                                                                <td className="p-3 font-bold text-emerald-700">${d.refundableAmount}</td>
                                                                <td className="p-3">
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${d.status === 'REFUND_COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                                                                        d.status === 'REFUND_PROCESSING' ? 'bg-blue-100 text-blue-800' :
                                                                            d.status === 'REFUND_FAILED' ? 'bg-red-100 text-red-800' :
                                                                                'bg-amber-100 text-amber-800'
                                                                        }`}>
                                                                        {d.status}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3">
                                                                    <select
                                                                        value={d.status}
                                                                        onChange={(e) => handleUpdateDonorStatus(d.donationId, e.target.value as RefundStatus)}
                                                                        className="text-xs p-1 border rounded bg-white"
                                                                    >
                                                                        <option value="REFUND_PENDING">PENDING</option>
                                                                        <option value="REFUND_PROCESSING">PROCESSING</option>
                                                                        <option value="REFUND_COMPLETED">COMPLETED</option>
                                                                        <option value="REFUND_FAILED">FAILED</option>
                                                                    </select>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500 italic p-6 text-center">
                                            No aplica devolución para este caso, o la campaña no ha sido resuelta con cancelación definitiva.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* TAB 6: AUDIT TRAIL */}
                            {activeTab === 'audit' && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                        Pista de Auditoría Inmutable del Caso
                                    </h4>
                                    <div className="space-y-2">
                                        {(selectedCase.auditTrail || []).map((entry, idx) => (
                                            <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                                                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                                                    <span className="font-mono">{new Date(entry.timestamp).toLocaleString()}</span>
                                                    <span className="font-bold text-gray-600">{entry.performedBy}</span>
                                                </div>
                                                <p className="font-bold text-gray-800">{entry.action}</p>
                                                <p className="text-gray-600 mt-0.5">{entry.details}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
