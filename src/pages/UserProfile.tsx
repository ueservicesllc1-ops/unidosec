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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
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

type Tab = "account" | "messages" | "notifications";

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

  // Adjuntos de fotos del usuario
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedPreviews, setAttachedPreviews] = useState<string[]>([]);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    const validImages = filesArray.filter((f) => f.type.startsWith("image/"));
    if (validImages.length === 0) {
      alert("Por favor selecciona únicamente archivos de imagen (JPEG, PNG, WebP).");
      return;
    }
    const previews = validImages.map((f) => URL.createObjectURL(f));
    setAttachedFiles((prev) => [...prev, ...validImages]);
    setAttachedPreviews((prev) => [...prev, ...previews]);
    e.target.value = "";
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
    setAttachedPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
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
              {(tab.badge ?? 0) > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? "bg-white text-primary" : "bg-red-500 text-white"
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── TAB: MI CUENTA ─── */}
        {activeTab === "account" && (
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
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Accesos rápidos</h3>
              <div className="flex flex-wrap gap-3">
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
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                              )}
                              {/* Imágenes adjuntas */}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div
                                  className={`mt-2 grid gap-2 ${
                                    msg.attachments.length === 1
                                      ? "grid-cols-1 max-w-[260px]"
                                      : "grid-cols-2 max-w-[320px]"
                                  }`}
                                >
                                  {msg.attachments.map((url, idx) => (
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
                    {/* Previsualización de imágenes adjuntas */}
                    {attachedPreviews.length > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-gray-100 overflow-x-auto">
                        {attachedPreviews.map((url, i) => (
                          <div
                            key={i}
                            className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 group"
                          >
                            <img src={url} alt="Adjunto" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(i)}
                              className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-red-600 text-white p-0.5 rounded-full transition shadow"
                              title="Quitar foto"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <span className="text-xs text-gray-500 ml-1 font-medium">
                          {attachedPreviews.length}{" "}
                          {attachedPreviews.length === 1 ? "foto seleccionada" : "fotos seleccionadas"}
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
                        title="Adjuntar fotos o comprobantes"
                      >
                        <ImageIcon className="w-5 h-5" />
                        <input
                          type="file"
                          accept="image/*"
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
      </div>

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
