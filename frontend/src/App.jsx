import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import './i18n';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminRoute from './components/common/AdminRoute';
import AppShell from './components/common/AppShell';
import Login from './pages/Login';
import Home from './pages/Home';
import Members from './pages/Members';
import Posts from './pages/Posts';
import Polls from './pages/Polls';
import Payments from './pages/Payments';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Dashboard from './pages/admin/Dashboard';
import ManageUsers from './pages/admin/ManageUsers';
import ManageRoles from './pages/admin/ManageRoles';
import AdminTransfer from './pages/admin/AdminTransfer';
import AdminConfig from './pages/admin/AdminConfig';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/members" element={<Members />} />
              <Route path="/posts" element={<Posts />} />
              <Route path="/polls" element={<Polls />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/admin" element={<AdminRoute><Dashboard /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute requiredPermission="MANAGE_USERS"><ManageUsers /></AdminRoute>} />
              <Route path="/admin/roles" element={<AdminRoute requiredPermission="MANAGE_ROLES"><ManageRoles /></AdminRoute>} />
              <Route path="/admin/transfer" element={<AdminRoute requiredPermission="TRANSFER_ADMIN"><AdminTransfer /></AdminRoute>} />
              <Route path="/admin/config" element={<AdminRoute requiredPermission="MANAGE_CONFIG"><AdminConfig /></AdminRoute>} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

