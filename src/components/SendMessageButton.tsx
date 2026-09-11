import { useState } from "react";
import { MessageSquare, X, Send, RefreshCw } from "lucide-react";
import {
  createConversation,
  type MessageCategory,
} from "../services/messagingService";
import { sendSystemNotification } from "../services/notificationService";

const MESSAGE_CATEGORIES: MessageCategory[] = [
  "Verificación de identidad",
  "Verificación bancaria",
  "Verificación de campaña",
  "Documentación médica",
  "Retiro de fondos",
  "Seguridad",
  "Donaciones",
  "Campaña",
  "Soporte",
  "Otro",
];

interface SendMessageButtonProps {
  userId: string;
  userEmail: string;
  userName: string;
  campaignId?: string;
  campaignTitle?: string;
  preselectedCategory?: MessageCategory;
  buttonLabel?: string;
  buttonClass?: string;
  onSent?: (conversationId: string) => void;
}

const SendMessageButton = ({
  userId,
  userEmail,
  userName,
  campaignId,
  campaignTitle,
  preselectedCategory,
  buttonLabel = "Enviar mensaje",
  buttonClass = "",
  onSent,
}: SendMessageButtonProps) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    category: (preselectedCategory ?? "Soporte") as MessageCategory,
    message: "",
  });
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!form.subject.trim() || !form.message.trim()) {
      alert("Por favor completa el asunto y el mensaje.");
      return;
    }
    setSending(true);
    try {
      const convId = await createConversation({
        userId,
        userEmail,
        userName,
        campaignId,
        campaignTitle,
        subject: form.subject,
        category: form.category,
        firstMessage: form.message,
        adminId: "admin",
        adminName: "Administración Unidos EC",
      });

      await sendSystemNotification.newAdminMessage(userId, convId, form.subject);

      setOpen(false);
      setForm({ subject: "", category: "Soporte", message: "" });
      onSent?.(convId);
      alert("✅ Mensaje enviado correctamente al usuario.");
    } catch (e) {
      console.error(e);
      alert("Error al enviar el mensaje. Intenta nuevamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-lg transition ${
          buttonClass ||
          "bg-blue-50 text-blue-700 hover:bg-blue-100"
        }`}
        title={`Enviar mensaje a ${userName}`}
      >
        <MessageSquare className="w-4 h-4" />
        {buttonLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                  Nuevo Mensaje
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Para: <strong>{userName}</strong> ({userEmail})
                  {campaignTitle && (
                    <span className="text-blue-600"> · {campaignTitle}</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">
                    Categoría
                  </label>
                  <select
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value as MessageCategory })
                    }
                  >
                    {MESSAGE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">
                    Asunto
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    placeholder="Ej: Requisitos para retirar fondos"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700">Mensaje</label>
                <textarea
                  rows={8}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-none"
                  placeholder="Escribe el mensaje para el usuario..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !form.subject.trim() || !form.message.trim()}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
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
        </div>
      )}
    </>
  );
};

export default SendMessageButton;
