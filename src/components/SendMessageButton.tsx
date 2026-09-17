import { useState } from "react";
import { MessageSquare, X, Send, RefreshCw, FileText } from "lucide-react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  createConversation,
  type MessageCategory,
} from "../services/messagingService";
import { sendSystemNotification } from "../services/notificationService";

export const MESSAGE_TEMPLATES: Record<string, { subject: string; message: string }> = {
  "Documentación médica": {
    subject: "Requerimiento de documentación médica oficial",
    message: "Estimado/a usuario,\n\nPara continuar con el proceso de verificación de su campaña, solicitamos que adjunte certificados médicos actualizados, epicrisis o presupuestos emitidos por una casa de salud autorizada.\n\nPuede responder a este mensaje directamente.\n\nAtentamente,\nEquipo de Auditoría Unidos EC",
  },
  "Verificación bancaria": {
    subject: "Validación de cuenta bancaria",
    message: "Estimado/a usuario,\n\nPara validar su cuenta bancaria de destino, requerimos un certificado bancario emitido en los últimos 30 días donde conste el titular y número de cuenta.\n\nQuedamos a su disposición para cualquier duda.\n\nAtentamente,\nAdministración Unidos EC",
  },
  "Verificación de identidad": {
    subject: "Verificación de documento de identidad",
    message: "Estimado/a usuario,\n\nPara garantizar la seguridad de la plataforma, necesitamos una fotografía clara y legible de su documento de identidad (cédula o pasaporte) por ambos lados.\n\nAtentamente,\nEquipo de Seguridad Unidos EC",
  },
  "Retiro de fondos": {
    subject: "Actualización de su solicitud de retiro",
    message: "Estimado/a organizador/a,\n\nSu solicitud de retiro ha ingresado a la fase de liquidación y auditoría. Por favor confirme si sus datos bancarios se encuentran activos y a nombre del titular registrado.\n\nAtentamente,\nAdministración Unidos EC",
  },
  "Campaña": {
    subject: "Sugerencias de mejora para su campaña",
    message: "Estimado/a organizador/a,\n\nLe sugerimos ampliar la descripción y añadir fotografías o respaldos sobre el destino de los fondos solicitados para generar mayor transparencia e impulsar el apoyo de los donantes.\n\nAtentamente,\nEquipo de Campañas Unidos EC",
  },
  "Soporte": {
    subject: "Atención a su solicitud de soporte",
    message: "Hola,\n\nNos ponemos en contacto contigo para asistirte con tu cuenta o campaña en Unidos EC. Por favor indícanos más detalles sobre tu inquietud para resolverla a la brevedad.\n\nSaludos cordiales,\nSoporte Unidos EC",
  },
};

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
  const initialCategory = (preselectedCategory ?? "Soporte") as MessageCategory;
  const initialTemplate = MESSAGE_TEMPLATES[initialCategory];
  const [form, setForm] = useState({
    subject: initialTemplate?.subject || "",
    category: initialCategory,
    message: initialTemplate?.message || "",
  });
  const [sending, setSending] = useState(false);

  const applyTemplate = (cat: string) => {
    const tpl = MESSAGE_TEMPLATES[cat];
    if (tpl) {
      setForm((prev) => ({
        ...prev,
        category: cat as MessageCategory,
        subject: tpl.subject,
        message: tpl.message,
      }));
    }
  };

  const handleSend = async () => {
    if (!form.subject.trim() || !form.message.trim()) {
      alert("Por favor completa el asunto y el mensaje.");
      return;
    }
    setSending(true);
    try {
      let targetUserId = userId;
      // Si no tenemos UID o es igual al email, intentamos resolver el UID real del usuario registrado
      if ((!targetUserId || targetUserId === userEmail) && userEmail) {
        try {
          const uq = query(
            collection(db, "users"),
            where("email", "==", userEmail.trim().toLowerCase())
          );
          const uSnap = await getDocs(uq);
          if (!uSnap.empty) {
            targetUserId = uSnap.docs[0].data().uid || uSnap.docs[0].id;
          }
        } catch (e) {
          console.warn("No se pudo obtener el UID del usuario por email:", e);
        }
      }
      if (!targetUserId) {
        targetUserId = userEmail || "usuario_anonimo";
      }

      const convId = await createConversation({
        userId: targetUserId,
        userEmail: userEmail || "",
        userName: userName || "Usuario",
        campaignId,
        campaignTitle,
        subject: form.subject,
        category: form.category,
        firstMessage: form.message,
        adminId: "admin",
        adminName: "Administración Unidos EC",
      });

      await sendSystemNotification.newAdminMessage(
        targetUserId,
        convId,
        form.subject,
        userEmail
      );

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
                    onChange={(e) => {
                      const newCat = e.target.value as MessageCategory;
                      setForm(prev => {
                        const tpl = MESSAGE_TEMPLATES[newCat];
                        return {
                          ...prev,
                          category: newCat,
                          subject: (!prev.subject.trim() && tpl) ? tpl.subject : prev.subject,
                          message: (!prev.message.trim() && tpl) ? tpl.message : prev.message,
                        };
                      });
                    }}
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

              {/* Plantillas sugeridas editables */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Cargar plantilla editable para redactar:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(MESSAGE_TEMPLATES).map((catName) => (
                    <button
                      key={catName}
                      type="button"
                      onClick={() => applyTemplate(catName)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                        form.category === catName
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-white text-slate-700 hover:bg-blue-50 border border-slate-200"
                      }`}
                    >
                      {catName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-700">Mensaje</label>
                  <span className="text-[11px] text-gray-400">Puedes editar este texto libremente</span>
                </div>
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
