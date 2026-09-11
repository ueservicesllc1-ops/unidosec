import { useState, useEffect, useRef } from "react";
import { Bell, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  subscribeToUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  timeAgo,
  notificationIcon,
  type Notification,
} from "../services/notificationService";

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserNotifications(user.uid, setNotifications);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const unread = notifications.filter((n) => !n.isRead);
  const unreadCount = unread.length;

  const handleClick = async (n: Notification) => {
    if (!n.isRead && n.id) await markNotificationRead(n.id);
    setOpen(false);
    if (n.actionUrl) navigate(n.actionUrl);
    else if (n.conversationId) navigate(`/profile?tab=messages&conv=${n.conversationId}`);
    else navigate("/profile?tab=notifications");
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead(user.uid);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        title="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[200] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-900 flex items-center text-sm">
              <Bell className="w-4 h-4 mr-2 text-primary" />
              Notificaciones
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-[10px] text-primary font-bold hover:underline"
                >
                  Marcar todo leído
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 hover:bg-gray-200 rounded-full"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Sin notificaciones</p>
              </div>
            )}
            {notifications.slice(0, 8).map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3 ${
                  !n.isRead ? "bg-blue-50/60" : ""
                }`}
              >
                <span className="text-lg flex-shrink-0 mt-0.5">{notificationIcon(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold leading-tight ${!n.isRead ? "text-gray-900" : "text-gray-600"}`}>
                    {n.title}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                )}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-100 bg-gray-50">
            <Link
              to="/profile?tab=notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-bold text-primary hover:underline"
            >
              Ver todas las notificaciones
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
