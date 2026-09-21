import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Layout from '@/components/Layout';

// 页面级懒加载：每个页面独立 chunk，首屏只加载当前页
const AboutPage = lazy(() => import('@/pages/AboutPage/AboutPage'));
const HomePage = lazy(() => import('@/pages/HomePage/HomePage'));
const NoticePage = lazy(() => import('@/pages/NoticePage/NoticePage'));
const ServicePage = lazy(() => import('@/pages/ServicePage/ServicePage'));
const UserProfilePage = lazy(() => import('@/pages/UserProfilePage/UserProfilePage'));
const AdminPage = lazy(() => import('@/pages/AdminPage/AdminPage'));
const LingPage = lazy(() => import('@/pages/LingPage/LingPage'));
const DevelopersListPage = lazy(() => import('@/pages/DevelopersListPage/DevelopersListPage'));
const DeveloperCardManagePage = lazy(() => import('@/pages/DeveloperCardManagePage/DeveloperCardManagePage'));
const HotelPage = lazy(() => import('@/pages/HotelPage/HotelPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage/NotFoundPage'));

/** 页面加载中的过渡占位 */
function PageFallback() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        <p className="text-sm text-slate-500">页面加载中…</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="hotel" element={<HotelPage />} />
          <Route path="notice" element={<NoticePage />} />
          <Route path="service" element={<ServicePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="about-ling" element={<DevelopersListPage />} />
          <Route path="developer/me" element={<DeveloperCardManagePage />} />
          <Route path="developer/:username" element={<LingPage />} />
          <Route path="user/:id" element={<UserProfilePage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
