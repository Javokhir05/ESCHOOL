import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './auth/ProtectedRoute';
import Home from './pages/public/Home';
import DesignSystem from './pages/public/DesignSystem';
import Courses from './pages/public/Courses';
import CourseDetail from './pages/public/CourseDetail';
import Register from './pages/public/Register';
import Login from './pages/public/Login';
import StudentOverview from './pages/student/Overview';
import TeacherOverview from './pages/teacher/Overview';
import AdminOverview from './pages/admin/Overview';
import Placeholder from './pages/Placeholder';
import StudentProfile from './pages/student/Profile';
import AdminTeachers from './pages/admin/Teachers';
import AdminEnrollments from './pages/admin/Enrollments';

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
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
      </Route>

      {/* Each dashboard only opens for its own role */}
      <Route element={<ProtectedRoute roles={['STUDENT']} />}>
        <Route path="student" element={<DashboardLayout role="student" />}>
          <Route index element={<StudentOverview />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="*" element={<Placeholder />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['TEACHER']} />}>
        <Route path="teacher" element={<DashboardLayout role="teacher" />}>
          <Route index element={<TeacherOverview />} />
          <Route path="*" element={<Placeholder />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['ADMIN']} />}>
        <Route path="admin" element={<DashboardLayout role="admin" />}>
          <Route index element={<AdminOverview />} />
          <Route path="teachers" element={<AdminTeachers />} />
          <Route path="enrollments" element={<AdminEnrollments />} />
          <Route path="*" element={<Placeholder />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}