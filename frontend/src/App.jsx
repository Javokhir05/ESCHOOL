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
import TeacherCourses from './pages/teacher/Courses';
import CourseForm from './pages/teacher/CourseForm';
import CourseStudents from './pages/teacher/CourseStudents';
import LessonsIndex from './pages/teacher/LessonsIndex';
import Lessons from './pages/teacher/Lessons';
import LessonForm from './pages/teacher/LessonForm';
import StudentCourses from './pages/student/Courses';
import StudentCourseView from './pages/student/CourseView';
import StudentLesson from './pages/student/Lesson';
import TeacherAssignments from './pages/teacher/Assignments';
import AssignmentForm from './pages/teacher/AssignmentForm';
import AssignmentSubmissions from './pages/teacher/AssignmentSubmissions';
import SubmissionReview from './pages/teacher/SubmissionReview';
import StudentAssignments from './pages/student/Assignments';
import StudentAssignment from './pages/student/AssignmentDetail';
import TeacherTests from './pages/teacher/Tests';
import TestForm from './pages/teacher/TestForm';
import TestResults from './pages/teacher/TestResults';
import StudentTests from './pages/student/Tests';
import StudentTest from './pages/student/TestDetail';
import StudentAttempt from './pages/student/Attempt';
import StudentAchievements from './pages/student/Achievements';
import AchievementForm from './pages/student/AchievementForm';
import AdminAchievements from './pages/admin/Achievements';
import Messages from './pages/Messages';
import Conversation from './pages/Conversation';
import Settings from './pages/Settings';
import StudentMaterials from './pages/student/Materials';
import TeacherStudents from './pages/teacher/Students';
import TeacherProfile from './pages/teacher/Profile';
import AdminUsers from './pages/admin/Users';
import AdminStudents from './pages/admin/Students';
import AdminCourses from './pages/admin/Courses';
import AdminReports from './pages/admin/Reports';
import Calendar from './pages/Calendar';
import SessionForm from './pages/teacher/SessionForm';
import Teachers from './pages/public/Teachers';
import About from './pages/public/About';
import Contact from './pages/public/Contact';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="design-system" element={<DesignSystem />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:id" element={<CourseDetail />} />
        <Route path="teachers" element={<Teachers />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
      </Route>

      {/* Each dashboard only opens for its own role */}
      <Route element={<ProtectedRoute roles={['STUDENT']} />}>
        <Route path="student" element={<DashboardLayout role="student" />}>
          <Route index element={<StudentOverview />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="courses" element={<StudentCourses />} />
          <Route path="courses/:slug" element={<StudentCourseView />} />
          <Route path="lessons/:lessonId" element={<StudentLesson />} />
          <Route path="assignments" element={<StudentAssignments />} />
          <Route path="assignments/:assignmentId" element={<StudentAssignment />} />
          <Route path="tests" element={<StudentTests />} />
          <Route path="tests/:testId" element={<StudentTest />} />
          <Route path="attempts/:attemptId" element={<StudentAttempt />} />
          <Route path="achievements" element={<StudentAchievements />} />
          <Route path="achievements/new" element={<AchievementForm />} />
          <Route path="achievements/:id/edit" element={<AchievementForm />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:id" element={<Conversation />} />
          <Route path="settings" element={<Settings />} />
          <Route path="materials" element={<StudentMaterials />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="*" element={<Placeholder />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['TEACHER']} />}>
        <Route path="teacher" element={<DashboardLayout role="teacher" />}>
          <Route index element={<TeacherOverview />} />
          <Route path="courses" element={<TeacherCourses />} />
          <Route path="courses/new" element={<CourseForm />} />
          <Route path="courses/:id/edit" element={<CourseForm />} />
          <Route path="courses/:id/students" element={<CourseStudents />} />
          <Route path="lessons" element={<LessonsIndex />} />
          <Route path="courses/:id/lessons" element={<Lessons />} />
          <Route path="courses/:id/lessons/new" element={<LessonForm />} />
          <Route path="courses/:id/lessons/:lessonId/edit" element={<LessonForm />} />
          <Route path="assignments" element={<TeacherAssignments />} />
          <Route path="assignments/new" element={<AssignmentForm />} />
          <Route path="assignments/:assignmentId/edit" element={<AssignmentForm />} />
          <Route path="assignments/:assignmentId/submissions" element={<AssignmentSubmissions />} />
          <Route path="submissions/:submissionId" element={<SubmissionReview />} />
          <Route path="tests" element={<TeacherTests />} />
          <Route path="tests/new" element={<TestForm />} />
          <Route path="tests/:testId/edit" element={<TestForm />} />
          <Route path="tests/:testId/results" element={<TestResults />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:id" element={<Conversation />} />
          <Route path="settings" element={<Settings />} />
          <Route path="students" element={<TeacherStudents />} />
          <Route path="profile" element={<TeacherProfile />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="calendar/new" element={<SessionForm />} />
          <Route path="calendar/:sessionId/edit" element={<SessionForm />} />
          <Route path="*" element={<Placeholder />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['ADMIN']} />}>
        <Route path="admin" element={<DashboardLayout role="admin" />}>
          <Route index element={<AdminOverview />} />
          <Route path="teachers" element={<AdminTeachers />} />
          <Route path="enrollments" element={<AdminEnrollments />} />
          <Route path="achievements" element={<AdminAchievements />} />
          <Route path="settings" element={<Settings />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="*" element={<Placeholder />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}