import { Route, Routes } from 'react-router-dom';
import Layout from '@/components/Layout';
import AboutPage from '@/pages/AboutPage/AboutPage';
import HomePage from '@/pages/HomePage/HomePage';
import ForumPage from '@/pages/ForumPage/ForumPage';
import PostDetailPage from '@/pages/PostDetailPage/PostDetailPage';
import ServicePage from '@/pages/ServicePage/ServicePage';
import UserProfilePage from '@/pages/UserProfilePage/UserProfilePage';
import AdminPage from '@/pages/AdminPage/AdminPage';
import LingPage from '@/pages/LingPage/LingPage';
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="forum" element={<ForumPage />} />
        <Route path="post/:id" element={<PostDetailPage />} />
        <Route path="service" element={<ServicePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="about-ling" element={<LingPage />} />
        <Route path="user/:id" element={<UserProfilePage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
