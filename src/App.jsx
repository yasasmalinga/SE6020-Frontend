import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import BookingFlow from './pages/BookingFlow';
import Availability from './pages/Availability';
import Submissions from './pages/Submissions';
import InterviewHistory from './pages/InterviewHistory';
import LiveSession from './pages/LiveSession';
import Messages from './pages/Messages';
import { AuthProvider, useAuth } from './hooks/useAuth';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="book" element={<BookingFlow />} />
            <Route path="availability" element={<Availability />} />
            <Route path="live" element={<LiveSession />} />
            <Route path="messages" element={<Messages />} />
            <Route path="submissions" element={<Submissions />} />
            <Route path="interviews" element={<InterviewHistory />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
