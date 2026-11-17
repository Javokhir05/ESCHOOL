import {
  LayoutDashboard, BookOpen, FileText, ClipboardList, GraduationCap, MessageSquare, UserRound,
  Award, Settings, PlusCircle, Layers, Users, UserCheck, Library, ListChecks, BarChart3,
} from 'lucide-react';

// `label` is a translation key. Each role gets its own sidebar.
export const publicNav = [
  { to: '/', label: 'nav.home', end: true },
  { to: '/courses', label: 'nav.courses' },
  { to: '/teachers', label: 'nav.teachers' },
  { to: '/about', label: 'nav.about' },
  { to: '/contact', label: 'nav.contact' },
];

export const roleNav = {
  student: [
    { to: '/student', label: 'dash.overview', icon: LayoutDashboard, end: true },
    { to: '/student/courses', label: 'dash.myCourses', icon: BookOpen },
    { to: '/student/materials', label: 'dash.materials', icon: FileText },
    { to: '/student/assignments', label: 'dash.assignments', icon: ClipboardList },
    { to: '/student/tests', label: 'dash.tests', icon: GraduationCap },
    { to: '/student/messages', label: 'dash.messages', icon: MessageSquare },
    { to: '/student/profile', label: 'dash.profile', icon: UserRound },
    { to: '/student/achievements', label: 'dash.achievements', icon: Award },
    { to: '/student/settings', label: 'dash.settings', icon: Settings },
  ],
  teacher: [
    { to: '/teacher', label: 'dash.overview', icon: LayoutDashboard, end: true },
    { to: '/teacher/courses', label: 'dash.myCourses', icon: BookOpen, end: true },
    { to: '/teacher/courses/new', label: 'dash.createCourse', icon: PlusCircle },
    { to: '/teacher/lessons', label: 'dash.lessons', icon: Layers },
    { to: '/teacher/students', label: 'dash.students', icon: Users },
    { to: '/teacher/assignments', label: 'dash.assignments', icon: ClipboardList },
    { to: '/teacher/tests', label: 'dash.tests', icon: GraduationCap },
    { to: '/teacher/messages', label: 'dash.messages', icon: MessageSquare },
    { to: '/teacher/profile', label: 'dash.profile', icon: UserRound },
    { to: '/teacher/settings', label: 'dash.settings', icon: Settings },
  ],
  admin: [
    { to: '/admin', label: 'dash.overview', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'dash.users', icon: Users },
    { to: '/admin/teachers', label: 'dash.teachers', icon: UserCheck },
    { to: '/admin/students', label: 'dash.students', icon: GraduationCap },
    { to: '/admin/courses', label: 'dash.courses', icon: Library },
    { to: '/admin/enrollments', label: 'dash.enrollments', icon: ListChecks },
    { to: '/admin/reports', label: 'dash.reports', icon: BarChart3 },
    { to: '/admin/settings', label: 'dash.settings', icon: Settings },
  ],
};