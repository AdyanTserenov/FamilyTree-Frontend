import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationService } from '../api/trees';
import { useNotificationStore } from '../store/notificationStore';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { formatDateTime } from '../utils/formatDate';
import type { Notification, NotificationType } from '../types';

const notificationTypeLabel: Record<NotificationType, string> = {
  INVITE: 'Приглашение',
  COMMENT: 'Комментарий',
  SYSTEM: 'Системное',
};

const notificationTypeVariant: Record<NotificationType, 'info' | 'success' | 'default'> = {
  INVITE: 'info',
  COMMENT: 'success',
  SYSTEM: 'default',
};

export const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const { notifications, markAsRead, markAllAsRead, removeNotification, unreadCount } =
    useNotificationStore();

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onSuccess: (_, id) => {
      markAsRead(id);
    },
    onError: () => toast.error('Ошибка'),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      markAllAsRead();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Все уведомления прочитаны');
    },
    onError: () => toast.error('Ошибка'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationService.deleteNotification(id),
    onSuccess: (_, id) => {
      removeNotification(id);
    },
    onError: () => toast.error('Ошибка удаления'),
  });

  const handleMarkRead = (notification: Notification) => {
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Уведомления</h1>
          {unreadCount > 0 && (
            <p className="text-gray-600 mt-1">{unreadCount} непрочитанных</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm transition-colors disabled:opacity-50"
          >
            {markAllReadMutation.isPending ? (
              <Spinner size="sm" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            Прочитать все
          </button>
        )}
      </div>

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Нет уведомлений</h2>
          <p className="text-gray-600">Здесь будут отображаться ваши уведомления</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification: Notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-xl border p-4 transition-colors ${
                notification.read
                  ? 'border-gray-200'
                  : 'border-blue-200 bg-blue-50/30'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Unread indicator */}
                <div className="flex-shrink-0 mt-1">
                  {!notification.read ? (
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                  ) : (
                    <div className="w-2.5 h-2.5 bg-transparent rounded-full" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant={notificationTypeVariant[notification.type]}>
                      {notificationTypeLabel[notification.type]}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {formatDateTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm">{notification.content}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!notification.read && (
                    <button
                      onClick={() => handleMarkRead(notification)}
                      disabled={markReadMutation.isPending}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Отметить как прочитанное"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(notification.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
