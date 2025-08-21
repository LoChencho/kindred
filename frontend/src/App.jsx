import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Navigation from './components/Navigation';
import ThemeToggle from './components/ThemeToggle';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import TimelineView from './pages/TimlineView';
import PersonView from './pages/PersonView';
import LocationView from './pages/LocationView';
import FamilyTreeView from './pages/FamilyTreeView';
import Record from './pages/Record';
import Default from './pages/Default';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <ThemeToggle />
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              
              {/* Protected routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Navigation />
                  <Default />
                </ProtectedRoute>
              } />
              <Route path="/timeline" element={
                <ProtectedRoute>
                  <Navigation />
                  <TimelineView />
                </ProtectedRoute>
              } />
              <Route path="/people" element={
                <ProtectedRoute>
                  <Navigation />
                  <PersonView />
                </ProtectedRoute>
              } />
              <Route path="/location" element={
                <ProtectedRoute>
                  <Navigation />
                  <LocationView />
                </ProtectedRoute>
              } />
              <Route path="/family-tree" element={
                <ProtectedRoute>
                  <Navigation />
                  <FamilyTreeView />
                </ProtectedRoute>
              } />
              <Route path="/record" element={
                <ProtectedRoute>
                  <Navigation />
                  <Record />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
