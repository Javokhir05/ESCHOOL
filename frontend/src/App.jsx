import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import Home from './pages/public/Home';
import DesignSystem from './pages/public/DesignSystem';
import StudentOverview from './pages/student/Overview';
import TeacherOverview from './pages/teacher/Overview';
import AdminOverview from './pages/admin/Overview';
import Placeholder from './pages/Placeholder';
import Courses from './pages/public/Courses';
import CourseDetail from './pages/public/CourseDetail';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="design-system" element={<DesignSystem />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:id" element={<CourseDetail />} />
        <Route path="teachers" element={<Placeholder />} />
        <Route path="about" element={<Placeholder />} />
        <Route path="contact" element={<Placeholder />} />
        <Route path="login" element={<Placeholder />} />
        <Route path="register" element={<Placeholder />} />
      </Route>

      {/* Login guards are added together with authentication later. */}
      <Route path="student" element={<DashboardLayout role="student" />}>
        <Route index element={<StudentOverview />} />
        <Route path="*" element={<Placeholder />} />
      </Route>
      <Route path="teacher" element={<DashboardLayout role="teacher" />}>
        <Route index element={<TeacherOverview />} />
        <Route path="*" element={<Placeholder />} />
      </Route>
      <Route path="admin" element={<DashboardLayout role="admin" />}>
        <Route index element={<AdminOverview />} />
        <Route path="*" element={<Placeholder />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}