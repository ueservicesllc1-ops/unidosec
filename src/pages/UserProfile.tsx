import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  User,
  MessageSquare,
  Bell,
  Send,
  RefreshCw,
  ChevronLeft,
  Megaphone,
  Edit3,
  Check,
  X,
  Image as ImageIcon,
  Maximize2,
  Download,
  FileCheck,
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  UploadCloud,
  HelpCircle,
  Paperclip,
  Eye,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  uploadVerificationDocument,
  uploadUserVerificationDocument,
  getUserCampaignsForVerification,
  canWithdraw,
  isCampaignRequiringMedicalDoc,
  type VerificationDocType,
} from "../services/medicalVerificationService";
import {
  subscribeToUserConversations,
  subscribeToMessages,
  sendMessage,
  markConversationAsRead,
  editMessage,
  uploadMessageAttachment,
  type Conversation,
  type Message,
} from "../services/messagingService";
import {
  subscribeToUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  timeAgo,
  notificationIcon,
  type Notification,
} from "../services/notificationService";

type Tab = "account" | "messages" | "notifications" | "documents";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  open:               { label: "Abierto",           cls: "bg-blue-100 text-blue-700" },
  waiting_for_user:   { label: "Te esperamos",      cls: "bg-amber-100 text-amber-700" },
  waiting_for_admin:  { label: "En proceso",        cls: "bg-purple-100 text-purple-700" },
  resolved:           { label: "Resuelto",          cls: "bg-green-100 text-green-700" },
  closed:             { label: "Cerrado",            cls: "bg-gray-100 text-gray-500" },
  archived:           { label: "Archivado",         cls: "bg-gray-100 text-gray-400" },
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const UserProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (searchParams.get("tab") as Tab) ?? "account";
  const initialConv = searchParams.get("conv") ?? null;

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Adjuntos de fotos y documentos del usuario en mensajes
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedPreviews, setAttachedPreviews] = useState<string[]>([]);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);

  // Estados para pestaña de Documentos de Verificación
  const [userCampaigns, setUserCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [userDocData, setUserDocData] = useState<any>(null);
  const [selectedDocFiles, setSelectedDocFiles] = useState<Record<string, File | null>>({});
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [docViewModal, setDocViewModal] = useState<{ url: string; title: string } | null>(null);

  const fetchUserVerificationData = async () => {
    if (!user) return;
    setLoadingCampaigns(true);
    try {
      const [camps, userSnap] = await Promise.all([
        getUserCampaignsForVerification(user.uid, user.email || undefined),
        getDoc(doc(db, "users", user.uid))
      ]);
      setUserCampaigns(camps);
      setSelectedCampaignId(prev => (prev || (camps.length > 0 ? camps[0].id : "")));
      if (userSnap.exists()) {
        setUserDocData(userSnap.data());
      }
    } catch (e) {
      console.error("Error loading verification data:", e);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserVerificationData();
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    const validFiles = filesArray.filter((f) => f.type.startsWith("image/") || f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (validFiles.length === 0) {
      alert("Por favor selecciona archivos de imagen (JPEG, PNG, WebP) o documentos PDF.");
      return;
    }
    const previews = validFiles.map((f) => f.type.startsWith("image/") ? URL.createObjectURL(f) : "pdf");
    setAttachedFiles((prev) => [...prev, ...validFiles]);
    setAttachedPreviews((prev) => [...prev, ...previews]);
    e.target.value = "";
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
    setAttachedPreviews((prev) => {
      if (prev[index] && prev[index] !== "pdf") {
        URL.revokeObjectURL(prev[index]);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Edición de mensajes del usuario
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const handleStartEdit = (msg: Message) => {
    setEditingMessageId(msg.id || null);
    setEditingText(msg.message);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const handleSaveUserEdit = async (msgId: string, isLast: boolean) => {
    if (!editingText.trim() || !selectedConv?.id) return;
    setSavingEdit(true);
    try {
      await editMessage(selectedConv.id, msgId, editingText.trim(), isLast);
      setEditingMessageId(null);
      setEditingText("");
    } catch (err) {
      console.error("Error editing message:", err);
      alert("Error al guardar cambios");
    } finally {
      setSavingEdit(false);
    }
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  // Subscribe to conversations
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserConversations(user.uid, setConversations, user.email);
    return () => unsub();
  }, [user]);

  // Subscribe to notifications
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserNotifications(user.uid, setNotifications, user.email);
    return () => unsub();
  }, [user]);

  // Auto-open conversation from URL param
  useEffect(() => {
    if (initialConv && conversations.length > 0) {
      const conv = conversations.find(c => c.id === initialConv);
      if (conv) openConversation(conv);
    }
  }, [initialConv, conversations]);

  // Subscribe to messages of selected conversation
  useEffect(() => {
    if (!selectedConv?.id) { setMessages([]); return; }
    const unsub = subscribeToMessages(selectedConv.id, setMessages);
    return () => unsub();
  }, [selectedConv?.id]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setSelectedConv(null);
  };

  const openConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    setActiveTab("messages");
    setSearchParams({ tab: "messages", conv: conv.id! });
    // Marcar como leído
    if (conv.unreadByUser > 0 && conv.id) {
      await markConversationAsRead(conv.id, "user");
    }
  };

  const handleSendReply = async () => {
    if ((!replyText.trim() && attachedFiles.length === 0) || !selectedConv?.id || !user) return;
    setSending(true);
    try {
      let uploadedUrls: string[] = [];
      if (attachedFiles.length > 0) {
        uploadedUrls = await Promise.all(
          attachedFiles.map((file) => uploadMessageAttachment(file))
        );
      }

      await sendMessage(
        selectedConv.id,
        replyText.trim(),
        "user",
        user.uid,
        user.displayName ?? user.email ?? "Usuario",
        uploadedUrls
      );
      setReplyText("");
      attachedPreviews.forEach((url) => URL.revokeObjectURL(url));
      setAttachedFiles([]);
      setAttachedPreviews([]);
    } catch (e) {
      console.error(e);
      alert("Error al enviar. Intenta nuevamente.");
    } finally {
      setSending(false);
    }
  };

  const selectedCampaign = userCampaigns.find(c => c.id === selectedCampaignId) || userCampaigns[0] || null;

  const pendingDocsBadge = selectedCampaign ? (
    (selectedCampaign.idDocumentStatus === 'under_review' ||
     selectedCampaign.bankCertificateStatus === 'under_review' ||
     selectedCampaign.medicalDocumentStatus === 'under_review' ||
     selectedCampaign.authorizationLetterStatus === 'under_review') ? "Revisión" :
    (!selectedCampaign.idDocumentUrl || !selectedCampaign.bankCertificateUrl) ? "Pendiente" : undefined
  ) : (
    (!userDocData?.verification_id_card_url || !userDocData?.verification_bank_certificate_url) ? "Pendiente" : undefined
  );

  const handleUploadDoc = async (docType: VerificationDocType, label: string) => {
    const file = selectedDocFiles[docType];
    if (!file || !user) return;

    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > 20) {
      alert(`El archivo "${file.name}" supera el tamaño máximo permitido de 20MB (${sizeInMB.toFixed(1)}MB). Por favor comprímelo o elige uno más liviano.`);
      return;
    }

    setUploadingDocType(docType);
    try {
      if (selectedCampaign?.id) {
        await uploadVerificationDocument(selectedCampaign.id, file, docType, user.uid);
      } else {
        await uploadUserVerificationDocument(user.uid, file, docType, user.email || '', user.displayName || '');
      }

      setSelectedDocFiles(prev => ({ ...prev, [docType]: null }));
      await fetchUserVerificationData();
      alert(`✅ ${label} subido exitosamente (${sizeInMB.toFixed(2)} MB). Queda registrado en el sistema y el equipo de administración lo revisará a la brevedad.`);
    } catch (err: any) {
      console.error("Error subiendo documento:", err);
      alert(`❌ Error al subir documento: ${err?.message || "Intente nuevamente."}`);
    } finally {
      setUploadingDocType(null);
    }
  };

  const renderDocStatusBadge = (status?: string) => {
    switch (status) {
      case "approved":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3.5 h-3.5" /> Aprobado</span>;
      case "under_review":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 animate-pulse"><Clock className="w-3.5 h-3.5" /> En Revisión</span>;
      case "rejected":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700"><X className="w-3.5 h-3.5" /> Rechazado</span>;
      case "more_info_required":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700"><AlertTriangle className="w-3.5 h-3.5" /> Requiere Corrección</span>;
      case "not_required":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-400">No requerido</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800"><UploadCloud className="w-3.5 h-3.5" /> Pendiente</span>;
    }
  };

  if (!user) return null;

  const unreadMsgs = conversations.reduce((s, c) => s + (c.unreadByUser ?? 0), 0);
  const unreadNotifs = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto py-8 px-4">
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-6">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName ?? ""} className="w-14 h-14 rounded-full border-2 border-primary/20 shadow" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-7 h-7 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black text-gray-900">{user.displayName ?? "Mi Cuenta"}</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl p-1 mb-6 shadow-sm w-full sm:w-fit overflow-x-auto no-scrollbar">
          {([
            { id: "account" as Tab, label: "Mi Cuenta", icon: <User className="w-4 h-4" /> },
            { id: "documents" as Tab, label: "Subir Documentos", icon: <FileCheck className="w-4 h-4" />, badge: pendingDocsBadge },
            { id: "messages" as Tab, label: "Mensajes", icon: <MessageSquare className="w-4 h-4" />, badge: unreadMsgs },
            { id: "notifications" as Tab, label: "Notificaciones", icon: <Bell className="w-4 h-4" />, badge: unreadNotifs },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? "bg-white text-primary" : "bg-amber-500 text-white"
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── TAB: MI CUENTA ─── */}
        {activeTab === "account" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                <User className="w-5 h-5 mr-2 text-primary" />
                Información de la cuenta
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nombre</label>
                  <p className="mt-1 font-bold text-gray-900">{user.displayName ?? "—"}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</label>
                  <p className="mt-1 font-bold text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">ID de usuario</label>
                  <p className="mt-1 text-xs text-gray-400 font-mono">{user.uid}</p>
                </div>
              </div>

              {/* Banner de Verificación de Retiro */}
              <div className="mt-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Verificación Oficial para Retiro de Fondos</h4>
                    <p className="text-xs text-gray-600 mt-0.5 max-w-xl">
                      Para habilitar retiros por transferencia bancaria en Ecuador, debes adjuntar tu Cédula de Identidad y Certificado Bancario Oficial.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => switchTab("documents")}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2 whitespace-nowrap"
                >
                  <FileCheck className="w-4 h-4" /> Subir Documentos
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Accesos rápidos</h3>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => switchTab("documents")} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-800 rounded-xl text-sm font-bold hover:bg-emerald-100 transition">
                    <FileCheck className="w-4 h-4" />
                    Subir Documentos
                  </button>
                  <button onClick={() => switchTab("messages")} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition">
                    <MessageSquare className="w-4 h-4" />
                    Mensajes {unreadMsgs > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{unreadMsgs}</span>}
                  </button>
                  <button onClick={() => switchTab("notifications")} className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold hover:bg-amber-100 transition">
                    <Bell className="w-4 h-4" />
                    Notificaciones {unreadNotifs > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{unreadNotifs}</span>}
                  </button>
                  <Link to="/start-campaign" className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-bold hover:bg-primary/20 transition">
                    <Megaphone className="w-4 h-4" />
                    Crear campaña
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: MENSAJES ─── */}
        {activeTab === "messages" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px] flex flex-col">
            {!selectedConv ? (
              <>
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-primary" />
                    Mensajes
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Conversaciones con el equipo de Unidos EC</p>
                </div>

                {conversations.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-200 mb-3" />
                    <p className="text-gray-500 font-medium">No tienes mensajes aún</p>
                    <p className="text-sm text-gray-400 mt-1">Cuando la administración te envíe un mensaje aparecerá aquí.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {conversations.map(conv => (
                      <button
                        key={conv.id}
                        onClick={() => openConversation(conv)}
                        className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors flex items-center gap-4"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          conv.unreadByUser > 0 ? "bg-primary text-white" : "bg-gray-100 text-gray-500"
                        }`}>
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-bold truncate ${conv.unreadByUser > 0 ? "text-gray-900" : "text-gray-700"}`}>
                              {conv.subject}
                            </p>
                            <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(conv.lastMessageAt)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className="text-xs text-gray-500 truncate">{conv.lastMessagePreview}</p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {conv.campaignTitle && (
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold truncate max-w-[80px]">
                                  {conv.campaignTitle}
                                </span>
                              )}
                              {conv.unreadByUser > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                                  {conv.unreadByUser}
                                </span>
                              )}
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${STATUS_LABELS[conv.status]?.cls ?? "bg-gray-100 text-gray-500"}`}>
                                {STATUS_LABELS[conv.status]?.label ?? conv.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* VISTA DE CHAT */
              <div className="flex flex-col h-full min-h-[500px]">
                {/* Chat header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <button
                    onClick={() => { setSelectedConv(null); setSearchParams({ tab: "messages" }); }}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{selectedConv.subject}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500">{selectedConv.category}</p>
                      {selectedConv.campaignTitle && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">
                          {selectedConv.campaignTitle}
                        </span>
                      )}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${STATUS_LABELS[selectedConv.status]?.cls}`}>
                        {STATUS_LABELS[selectedConv.status]?.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Banner de Verificación Oficial si aplica */}
                {(selectedConv.category === "Verificación de identidad" ||
                  selectedConv.category === "Verificación bancaria" ||
                  selectedConv.category === "Documentación médica" ||
                  selectedConv.category === "Retiro de fondos" ||
                  selectedConv.category === "Verificación de campaña" ||
                  selectedConv.subject.toLowerCase().includes("verific") ||
                  selectedConv.subject.toLowerCase().includes("retiro") ||
                  selectedConv.subject.toLowerCase().includes("banc") ||
                  selectedConv.subject.toLowerCase().includes("cédula") ||
                  selectedConv.subject.toLowerCase().includes("cedula")) && (
                  <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-b border-blue-200 p-3 px-4 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5 text-xs text-blue-900 font-medium">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-blue-950">Sección Oficial de Verificación para Retiros</p>
                        <p className="text-[11px] text-blue-700">Puedes cargar tu Cédula, Certificado Bancario o Respaldos oficiales en tu pestaña de Verificación.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => switchTab("documents")}
                      className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow transition"
                    >
                      <FileCheck className="w-3.5 h-3.5" /> Subir Documentos
                    </button>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                  {messages.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">Cargando mensajes...</div>
                  )}
                  {messages.map((msg, index) => {
                    const isAdmin = msg.senderType === "admin";
                    const isLast = index === messages.length - 1;
                    const isEditing = editingMessageId === msg.id;

                    return (
                      <div key={msg.id} className={`flex ${isAdmin ? "justify-start" : "justify-end"} group`}>
                        <div className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-3 relative ${
                          isAdmin
                            ? "bg-white border border-gray-100 text-gray-900 rounded-tl-sm shadow-sm"
                            : "bg-primary text-white rounded-tr-sm"
                        }`}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className={`text-[10px] font-bold ${isAdmin ? "text-primary" : "text-primary-100"}`}>
                              {isAdmin ? "Administración Unidos EC" : (msg.senderName ?? "Tú")}
                            </p>
                            <div className="flex items-center gap-1.5">
                              {msg.edited && (
                                <span className={`text-[9px] italic font-normal ${isAdmin ? "text-gray-400" : "text-white/80"}`}>
                                  (editado)
                                </span>
                              )}
                              {!isAdmin && !isEditing && (
                                <button
                                  onClick={() => handleStartEdit(msg)}
                                  title="Editar mensaje"
                                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/20 rounded text-white/80 hover:text-white transition"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="mt-1 space-y-2">
                              <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                rows={3}
                                className="w-full p-2.5 bg-white text-gray-900 text-sm rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-primary/20 resize-none font-normal"
                                placeholder="Edita tu mensaje..."
                                autoFocus
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={handleCancelEdit}
                                  disabled={savingEdit}
                                  className="px-2.5 py-1 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => msg.id && handleSaveUserEdit(msg.id, isLast)}
                                  disabled={savingEdit || !editingText.trim()}
                                  className="px-3 py-1 bg-white text-primary text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-sm hover:bg-gray-100"
                                >
                                  {savingEdit ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {msg.message && (
                                <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">
                                  {msg.message.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                                    /^https?:\/\/[^\s]+$/.test(part) ? (
                                      <a
                                        key={i}
                                        href={part}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`underline font-bold break-all ${
                                          isAdmin ? "text-primary hover:text-[#008f5b]" : "text-white hover:text-emerald-100"
                                        }`}
                                      >
                                        {part}
                                      </a>
                                    ) : (
                                      part
                                    )
                                  )}
                                </p>
                              )}
                              {/* Archivos y fotos adjuntas */}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {/* Imágenes */}
                                  {msg.attachments.filter(url => !url.toLowerCase().includes('.pdf') && !url.match(/\.pdf(\?|$)/i)).length > 0 && (
                                    <div
                                      className={`grid gap-2 ${
                                        msg.attachments.filter(url => !url.toLowerCase().includes('.pdf') && !url.match(/\.pdf(\?|$)/i)).length === 1
                                          ? "grid-cols-1 max-w-[260px]"
                                          : "grid-cols-2 max-w-[320px]"
                                      }`}
                                    >
                                      {msg.attachments
                                        .filter(url => !url.toLowerCase().includes('.pdf') && !url.match(/\.pdf(\?|$)/i))
                                        .map((url, idx) => (
                                          <div
                                            key={idx}
                                            onClick={() => setPreviewModalImage(url)}
                                            className={`group/img relative rounded-xl overflow-hidden cursor-pointer aspect-video flex items-center justify-center hover:opacity-95 transition shadow-sm ${
                                              isAdmin
                                                ? "border border-gray-200 bg-gray-100"
                                                : "border border-white/20 bg-primary-600/30"
                                            }`}
                                          >
                                            <img
                                              src={url}
                                              alt={`Adjunto ${idx + 1}`}
                                              className="w-full h-full object-cover transition-transform duration-200 group-hover/img:scale-105"
                                              loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                                              <Maximize2 className="w-4 h-4 drop-shadow" />
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  )}

                                  {/* Documentos PDF */}
                                  {msg.attachments
                                    .filter(url => url.toLowerCase().includes('.pdf') || url.match(/\.pdf(\?|$)/i))
                                    .map((url, idx) => (
                                      <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold transition max-w-sm shadow-sm ${
                                          isAdmin
                                            ? "bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100"
                                            : "bg-white/15 border-white/25 text-white hover:bg-white/25"
                                        }`}
                                      >
                                        <div className="p-1.5 bg-red-100 text-red-600 rounded-lg">
                                          <FileText className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="truncate">Documento PDF Adjunto</p>
                                          <p className={`text-[10px] font-normal ${isAdmin ? "text-gray-500" : "text-white/80"}`}>Clic para ver o descargar</p>
                                        </div>
                                        <ExternalLink className="w-4 h-4 flex-shrink-0 opacity-70" />
                                      </a>
                                    ))}
                                </div>
                              )}
                            </>
                          )}

                          {!isEditing && (
                            <p className={`text-[10px] mt-1.5 ${isAdmin ? "text-gray-400" : "text-white/70"}`}>
                              {timeAgo(msg.createdAt)}
                              {!isAdmin && (
                                <span className="ml-1">
                                  {msg.isReadByAdmin ? " ✓✓" : " ✓"}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply box */}
                {selectedConv.status !== "closed" && selectedConv.status !== "archived" && (
                  <div className="border-t border-gray-100 bg-white">
                    {/* Previsualización de archivos adjuntos */}
                    {attachedPreviews.length > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-gray-100 overflow-x-auto">
                        {attachedPreviews.map((url, i) => {
                          const file = attachedFiles[i];
                          const isPdf = url === "pdf" || file?.type === "application/pdf" || file?.name?.toLowerCase().endsWith(".pdf");
                          return (
                            <div
                              key={i}
                              className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 group bg-white shadow-sm flex items-center justify-center p-1"
                            >
                              {isPdf ? (
                                <div className="flex flex-col items-center justify-center text-center p-1">
                                  <FileText className="w-6 h-6 text-red-500 mb-0.5" />
                                  <span className="text-[9px] text-gray-700 font-bold truncate max-w-[52px] leading-none">
                                    {file?.name || "PDF"}
                                  </span>
                                </div>
                              ) : (
                                <img src={url} alt="Adjunto" className="w-full h-full object-cover" />
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(i)}
                                className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-red-600 text-white p-0.5 rounded-full transition shadow"
                                title="Quitar archivo"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                        <span className="text-xs text-gray-500 ml-1 font-medium">
                          {attachedPreviews.length}{" "}
                          {attachedPreviews.length === 1 ? "archivo listo" : "archivos listos"}
                        </span>
                      </div>
                    )}

                    <div className="p-4 flex items-end gap-2">
                      <label
                        className={`p-3 border rounded-xl cursor-pointer transition flex items-center justify-center flex-shrink-0 ${
                          attachedPreviews.length > 0
                            ? "bg-blue-50 border-blue-200 text-blue-600"
                            : "bg-gray-50 border-gray-200 text-gray-500 hover:text-primary hover:bg-primary/5"
                        }`}
                        title="Adjuntar fotos o documentos PDF"
                      >
                        <Paperclip className="w-5 h-5" />
                        <input
                          type="file"
                          accept="image/*,.pdf,application/pdf"
                          multiple
                          className="hidden"
                          onChange={handleFileChange}
                          disabled={sending}
                        />
                      </label>

                      <textarea
                        rows={2}
                        className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-none"
                        placeholder="Escribe tu respuesta..."
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply(); }
                        }}
                      />
                      <button
                        onClick={handleSendReply}
                        disabled={sending || (!replyText.trim() && attachedFiles.length === 0)}
                        className="px-4 py-3 bg-primary text-white rounded-xl font-bold disabled:opacity-40 hover:bg-[#008f5b] transition flex items-center flex-shrink-0 gap-1.5 shadow-sm"
                      >
                        {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 px-4 pb-2 text-right">Enter para enviar · Shift+Enter para nueva línea</p>
                  </div>
                )}

                {(selectedConv.status === "closed" || selectedConv.status === "archived") && (
                  <div className="p-4 text-center text-sm text-gray-400 bg-gray-50 border-t border-gray-100">
                    Esta conversación está cerrada.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: NOTIFICACIONES ─── */}
        {activeTab === "notifications" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-primary" />
                Notificaciones
              </h2>
              {unreadNotifs > 0 && (
                <button
                  onClick={() => markAllNotificationsRead(user.uid, user.email)}
                  className="text-sm text-primary font-bold hover:underline"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Bell className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-gray-500 font-medium">Sin notificaciones</p>
                <p className="text-sm text-gray-400 mt-1">Las actualizaciones importantes aparecerán aquí.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={async () => {
                      if (!n.isRead && n.id) await markNotificationRead(n.id);
                      if (n.conversationId) {
                        switchTab("messages");
                        const conv = conversations.find(c => c.id === n.conversationId);
                        if (conv) openConversation(conv);
                      }
                    }}
                    className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors flex gap-4 ${!n.isRead ? "bg-blue-50/40" : ""}`}
                  >
                    <span className="text-2xl flex-shrink-0">{notificationIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-bold ${!n.isRead ? "text-gray-900" : "text-gray-700"}`}>{n.title}</p>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                    </div>
                    {!n.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: DOCUMENTOS DE VERIFICACIÓN ─── */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            {/* Header del centro de documentos */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                <div className="flex items-center space-x-3.5">
                  <div className="bg-emerald-100 text-emerald-800 p-3 rounded-2xl">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900">Centro de Documentos y Verificación</h2>
                    <p className="text-xs sm:text-sm text-gray-500">Expediente oficial para habilitar desembolsos y transferencias bancarias</p>
                  </div>
                </div>
                <button
                  onClick={fetchUserVerificationData}
                  disabled={loadingCampaigns}
                  className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition flex items-center gap-1.5 text-xs font-bold"
                  title="Actualizar estado"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingCampaigns ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Actualizar</span>
                </button>
              </div>

              {/* Selector de campaña si tiene más de una */}
              {userCampaigns.length > 1 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-2">
                    Selecciona la campaña a verificar:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {userCampaigns.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCampaignId(c.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          selectedCampaign?.id === c.id
                            ? "bg-slate-900 text-white shadow"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        <span className="truncate max-w-[220px]">{c.title}</span>
                        {(c.currentAmount ?? 0) > 0 && (
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-black">
                            ${c.currentAmount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Si no tiene campañas creadas */}
              {userCampaigns.length === 0 && !loadingCampaigns && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-amber-900">Aún no has creado campañas en tu cuenta</p>
                      <p className="text-xs text-amber-700">Puedes subir tu Cédula y Certificado Bancario para pre-validar tu cuenta de organizador, o crear tu primera campaña ahora.</p>
                    </div>
                  </div>
                  <Link
                    to="/start-campaign"
                    className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow hover:bg-[#008f5b] transition flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Megaphone className="w-4 h-4" /> Crear Campaña
                  </Link>
                </div>
              )}

              {/* Estado de Retiro de la campaña seleccionada */}
              {selectedCampaign && (() => {
                const auth = canWithdraw(selectedCampaign);
                return (
                  <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-sm border border-slate-700 flex items-center justify-between flex-wrap gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Campaña:</span>
                        <h3 className="text-sm font-black text-white truncate max-w-md">{selectedCampaign.title}</h3>
                      </div>
                      <p className="text-xs text-slate-300">
                        Recaudado: <strong className="text-emerald-400 font-black">${(selectedCampaign.currentAmount ?? 0).toLocaleString()} USD</strong> de meta ${(selectedCampaign.goal ?? 0).toLocaleString()} USD
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {auth.allowed ? (
                        <span className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black rounded-xl flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Habilitado para Retiro
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black rounded-xl flex items-center gap-1.5">
                          <Clock className="w-4 h-4" /> Documentación Requerida
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="mt-4 flex items-center justify-between flex-wrap gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span>📁 Formatos aceptados: <strong>PDF, JPG, JPEG, PNG, WebP</strong> (Máximo <strong>20 MB</strong> por archivo)</span>
                <Link to="/withdrawal-terms" target="_blank" className="text-primary font-bold hover:underline inline-flex items-center gap-1">
                  Normativa de Retiros <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Checklist de Documentos */}
            <div className="grid grid-cols-1 gap-5">
              {/* ── 1. CÉDULA DE IDENTIDAD O PASAPORTE ── */}
              {(() => {
                const status = selectedCampaign?.idDocumentStatus || userDocData?.verification_id_card_status || "pending_upload";
                const docUrl = selectedCampaign?.idDocumentUrl || userDocData?.verification_id_card_url;
                const adminNote = selectedCampaign?.id_cardAdminNote || selectedCampaign?.idAdminNote;
                const file = selectedDocFiles["id_card"];

                return (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 transition hover:border-blue-300">
                    <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-lg flex-shrink-0">
                          🪪
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-gray-900 uppercase">1. Cédula de Identidad o Pasaporte</h4>
                            <span className="text-[10px] bg-red-100 text-red-700 font-black px-2 py-0.5 rounded-full uppercase">Obligatorio</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            Copia nítida o fotografía por ambos lados (anverso y reverso) del titular de la cuenta bancaria de destino.
                          </p>
                        </div>
                      </div>
                      <div>{renderDocStatusBadge(status)}</div>
                    </div>

                    {/* Nota de auditoría si existe */}
                    {adminNote && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold">Observación de la Administración:</strong> {adminNote}
                        </div>
                      </div>
                    )}

                    {/* Controles de carga */}
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 w-full sm:w-auto">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="block w-full text-xs text-slate-600 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer border border-dashed border-gray-200 rounded-xl p-1.5 bg-gray-50/50"
                          onChange={e => setSelectedDocFiles(prev => ({ ...prev, id_card: e.target.files?.[0] ?? null }))}
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {file && (
                          <button
                            onClick={() => handleUploadDoc("id_card", "Cédula de Identidad")}
                            disabled={uploadingDocType === "id_card"}
                            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {uploadingDocType === "id_card" ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <UploadCloud className="w-4 h-4" />
                            )}
                            Subir Cédula
                          </button>
                        )}
                        {docUrl && (
                          <button
                            onClick={() => setDocViewModal({ url: docUrl, title: "Cédula de Identidad" })}
                            className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver Cédula Actual
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── 2. CERTIFICADO BANCARIO OFICIAL ── */}
              {(() => {
                const status = selectedCampaign?.bankCertificateStatus || userDocData?.verification_bank_certificate_status || "pending_upload";
                const docUrl = selectedCampaign?.bankCertificateUrl || userDocData?.verification_bank_certificate_url;
                const adminNote = selectedCampaign?.bank_certificateAdminNote || selectedCampaign?.bankAdminNote;
                const file = selectedDocFiles["bank_certificate"];

                return (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 transition hover:border-emerald-300">
                    <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg flex-shrink-0">
                          🏦
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-gray-900 uppercase">2. Certificado Bancario Oficial</h4>
                            <span className="text-[10px] bg-red-100 text-red-700 font-black px-2 py-0.5 rounded-full uppercase">Obligatorio</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            Emitido en los últimos 30 días por banco o cooperativa regulada en Ecuador (Pichincha, Guayaquil, Pacífico, Produbanco, JEP, etc.), con nombre completo y número de cuenta.
                          </p>
                        </div>
                      </div>
                      <div>{renderDocStatusBadge(status)}</div>
                    </div>

                    {adminNote && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold">Observación de la Administración:</strong> {adminNote}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 w-full sm:w-auto">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="block w-full text-xs text-slate-600 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer border border-dashed border-gray-200 rounded-xl p-1.5 bg-gray-50/50"
                          onChange={e => setSelectedDocFiles(prev => ({ ...prev, bank_certificate: e.target.files?.[0] ?? null }))}
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {file && (
                          <button
                            onClick={() => handleUploadDoc("bank_certificate", "Certificado Bancario")}
                            disabled={uploadingDocType === "bank_certificate"}
                            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {uploadingDocType === "bank_certificate" ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <UploadCloud className="w-4 h-4" />
                            )}
                            Subir Certificado
                          </button>
                        )}
                        {docUrl && (
                          <button
                            onClick={() => setDocViewModal({ url: docUrl, title: "Certificado Bancario" })}
                            className="px-3 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver Certificado Actual
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── 3. DOCUMENTACIÓN MÉDICA / EPICRISIS ── */}
              {(() => {
                const isMedRequired = isCampaignRequiringMedicalDoc(selectedCampaign);
                const status = selectedCampaign?.medicalDocumentStatus || (isMedRequired ? "pending_upload" : "not_required");
                const docUrl = selectedCampaign?.medicalDocumentUrl;
                const adminNote = selectedCampaign?.medicalAdminNote;
                const file = selectedDocFiles["medical"];

                return (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 transition hover:border-red-300">
                    <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-800 flex items-center justify-center font-bold text-lg flex-shrink-0">
                          ⚕️
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-gray-900 uppercase">3. Documentación Médica / Epicrisis</h4>
                            {isMedRequired ? (
                              <span className="text-[10px] bg-red-100 text-red-700 font-black px-2 py-0.5 rounded-full uppercase">Obligatorio en Salud</span>
                            ) : (
                              <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full">Opcional</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            Epicrisis médica, informe clínico firmado por médico tratante o presupuesto oficial de hospital/clínica para certificar la causa.
                          </p>
                        </div>
                      </div>
                      <div>{renderDocStatusBadge(status)}</div>
                    </div>

                    {adminNote && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold">Observación de la Administración:</strong> {adminNote}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 w-full sm:w-auto">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="block w-full text-xs text-slate-600 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-600 file:text-white hover:file:bg-red-700 cursor-pointer border border-dashed border-gray-200 rounded-xl p-1.5 bg-gray-50/50"
                          onChange={e => setSelectedDocFiles(prev => ({ ...prev, medical: e.target.files?.[0] ?? null }))}
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {file && (
                          <button
                            onClick={() => handleUploadDoc("medical", "Documento Médico")}
                            disabled={uploadingDocType === "medical"}
                            className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {uploadingDocType === "medical" ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <UploadCloud className="w-4 h-4" />
                            )}
                            Subir Doc. Médico
                          </button>
                        )}
                        {docUrl && (
                          <button
                            onClick={() => setDocViewModal({ url: docUrl, title: "Documento Médico" })}
                            className="px-3 py-2 bg-red-50 text-red-800 hover:bg-red-100 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver Documento Actual
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── 4. CARTA DE AUTORIZACIÓN O PODER ── */}
              {(() => {
                const isThirdParty = selectedCampaign?.beneficiary !== "myself";
                const status = selectedCampaign?.authorizationLetterStatus || "pending_upload";
                const docUrl = selectedCampaign?.authorizationLetterUrl;
                const adminNote = selectedCampaign?.authorizationLetterAdminNote;
                const file = selectedDocFiles["authorization_letter"];

                return (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 transition hover:border-amber-300">
                    <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg flex-shrink-0">
                          📜
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-gray-900 uppercase">4. Carta de Autorización o Poder</h4>
                            {isThirdParty ? (
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded-full uppercase">Requerido para Terceros</span>
                            ) : (
                              <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full">No aplica si eres el beneficiario</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            Si los fondos son para un familiar o tercero, adjunta una carta simple firmada por el beneficiario autorizándote a recaudar y retirar las donaciones.
                          </p>
                        </div>
                      </div>
                      <div>{renderDocStatusBadge(status)}</div>
                    </div>

                    {adminNote && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold">Observación de la Administración:</strong> {adminNote}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 w-full sm:w-auto">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="block w-full text-xs text-slate-600 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-600 file:text-white hover:file:bg-amber-700 cursor-pointer border border-dashed border-gray-200 rounded-xl p-1.5 bg-gray-50/50"
                          onChange={e => setSelectedDocFiles(prev => ({ ...prev, authorization_letter: e.target.files?.[0] ?? null }))}
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {file && (
                          <button
                            onClick={() => handleUploadDoc("authorization_letter", "Carta de Autorización")}
                            disabled={uploadingDocType === "authorization_letter"}
                            className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {uploadingDocType === "authorization_letter" ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <UploadCloud className="w-4 h-4" />
                            )}
                            Subir Carta
                          </button>
                        )}
                        {docUrl && (
                          <button
                            onClick={() => setDocViewModal({ url: docUrl, title: "Carta de Autorización" })}
                            className="px-3 py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver Carta Actual
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── 5. RESPALDOS ADICIONALES ── */}
              {(() => {
                const docUrl = selectedCampaign?.additionalVerificationDocUrl;
                const file = selectedDocFiles["additional"];

                return (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 transition hover:border-purple-300">
                    <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-lg flex-shrink-0">
                          📎
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-gray-900 uppercase">5. Respaldos Adicionales (Opcional)</h4>
                            <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">Soporte</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            Facturas proforma, cotizaciones, recibos de farmacia o cualquier documento adicional que respalde el uso de los fondos.
                          </p>
                        </div>
                      </div>
                      <div>
                        {docUrl ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Adjunto
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                            Opcional
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 w-full sm:w-auto">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="block w-full text-xs text-slate-600 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer border border-dashed border-gray-200 rounded-xl p-1.5 bg-gray-50/50"
                          onChange={e => setSelectedDocFiles(prev => ({ ...prev, additional: e.target.files?.[0] ?? null }))}
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {file && (
                          <button
                            onClick={() => handleUploadDoc("additional", "Respaldo Adicional")}
                            disabled={uploadingDocType === "additional"}
                            className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {uploadingDocType === "additional" ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <UploadCloud className="w-4 h-4" />
                            )}
                            Subir Respaldo
                          </button>
                        )}
                        {docUrl && (
                          <button
                            onClick={() => setDocViewModal({ url: docUrl, title: "Respaldo Adicional" })}
                            className="px-3 py-2 bg-purple-50 text-purple-800 hover:bg-purple-100 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver Respaldo Actual
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Modal Visor de Documentos (PDF / Imagen) */}
      {docViewModal && (
        <div
          className="fixed inset-0 z-[360] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDocViewModal(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between bg-slate-900 text-white">
              <h2 className="font-bold text-sm flex items-center truncate max-w-[80%]">
                <FileText className="w-4 h-4 mr-2 text-emerald-400 flex-shrink-0" />
                <span className="truncate">{docViewModal.title}</span>
              </h2>
              <div className="flex items-center gap-2">
                <a
                  href={docViewModal.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                  title="Abrir en pestaña nueva"
                >
                  <ExternalLink className="w-4 h-4" /> Abrir Original
                </a>
                <button onClick={() => setDocViewModal(null)} className="p-1.5 hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-auto flex-1 p-4 bg-slate-100 flex items-center justify-center min-h-[400px]">
              {docViewModal.url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i) ? (
                <img src={docViewModal.url} alt={docViewModal.title} className="max-w-full max-h-[75vh] object-contain rounded-xl shadow" />
              ) : (
                <iframe src={docViewModal.url} title={docViewModal.title} className="w-full h-[75vh] rounded-xl border bg-white shadow" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Visor de Imagen Ampliada */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-[350] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewModalImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewModalImage(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-1 rounded-full bg-black/50 hover:bg-black/70 transition"
              title="Cerrar imagen"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewModalImage}
              alt="Vista previa ampliada"
              className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-3 flex items-center gap-3">
              <a
                href={previewModalImage}
                target="_blank"
                rel="noreferrer"
                download
                onClick={(e) => e.stopPropagation()}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 backdrop-blur"
              >
                <Download className="w-4 h-4" />
                Abrir en pestaña nueva
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
