import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../api/trees';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';

export const useNotifications = () => {
  const { isAuthenticated } = useAuthStore();
  const { setUnreadCount, setNotifications } = useNotificationStore();

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications(),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (unreadData?.data !== undefined) {
      setUnreadCount(unreadData.data.unreadCount);
    }
  }, [unreadData, setUnreadCount]);

  useEffect(() => {
    if (notificationsData?.data) {
      setNotifications(notificationsData.data);
    }
  }, [notificationsData, setNotifications]);
};
