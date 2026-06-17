import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { I18nProvider } from './contexts/I18nContext'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { hasScrimAccess, isFounder } from './lib/roles'

import Home        from './pages/Home'
import Esport      from './pages/esport/Esport'
import LoL         from './pages/esport/LoL'
import WildRift    from './pages/esport/WildRift'
import Valorant    from './pages/esport/Valorant'
import Visual      from './pages/visual/Visual'
import Event       from './pages/event/Event'
import Scrims      from './pages/scrims/Scrims'
import RoleManager from './pages/admin/RoleManager'
import Profile     from './pages/profile/Profile'
import News        from './pages/news/News'
import Boutique    from './pages/boutique/Boutique'
import Partenaires from './pages/partenaires/Partenaires'

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/"                element={<Home />} />
              <Route path="/esport"          element={<Esport />} />
              <Route path="/esport/lol"      element={<LoL />} />
              <Route path="/esport/wildrift" element={<WildRift />} />
              <Route path="/esport/valorant" element={<Valorant />} />
              <Route path="/visual"          element={<Visual />} />
              <Route path="/event"           element={<Event />} />
              <Route path="/actualites"      element={<News />} />
              <Route path="/boutique"        element={<Boutique />} />
              <Route path="/partenaires"     element={<Partenaires />} />
              <Route path="/scrims" element={
                <ProtectedRoute roleGuard={(p) => hasScrimAccess(p?.role)}>
                  <Scrims />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute roleGuard={(p) => isFounder(p?.role)}>
                  <RoleManager />
                </ProtectedRoute>
              } />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </I18nProvider>
  )
}
