import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from './Navbar';
import { useNotifications } from '../hooks/useNotifications';
import { authService } from '../api/auth';
import { useAuthStore } from '../store/authStore';

export const Layout = () => {
  useNotifications();

  const { isAuthenticated, setUser } = useAuthStore();

  // Fetch full profile once per session — silently updates user in store.
  // Using authApi (not treeApi) so the 401 interceptor on treeApi won't fire.
  // retry: false — don't hammer the server; staleTime: Infinity — fetch once per mount.
  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: () => authService.getProfile(),
    enabled: isAuthenticated,
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (profileData?.status === 'success' && profileData.data) {
      setUser(profileData.data);
    }
  }, [profileData, setUser]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};
