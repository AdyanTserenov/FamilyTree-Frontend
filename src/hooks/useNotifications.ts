import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../api/trees';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';

export const useNotifications = () => {
  const { isAuthenticated } = useAuthStore();
  const { setUnreadCount, setNotifications } = useNotificationStore();

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications(),
    enabled: isAuthenticated,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  useEffect(() => {
    if (notificationsData?.data) {
      const notifications = notificationsData.data;
      setNotifications(notifications);
      // Derive unread count from the list — no separate API call needed
      setUnreadCount(notifications.filter((n) => !n.read).length);
    }
  }, [notificationsData, setNotifications, setUnreadCount]);
};
