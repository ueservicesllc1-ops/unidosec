// import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import StartCampaign from './pages/StartCampaign';
import Login from './pages/Login';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import CampaignDetails from './pages/CampaignDetails';
import Explore from './pages/Explore';
import HowItWorks from './pages/HowItWorks';
import Terms from './pages/Terms';
import FAQ from './pages/FAQ';
import TrustSafety from './pages/TrustSafety';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
          <Navbar />
          {/* Main Content Area - Full width by default, specific pages constrain themselves */}
          <main className="flex-grow w-full">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/trust" element={<TrustSafety />} />
              <Route path="/campaign/:id" element={<CampaignDetails />} />
              <Route
                path="/start-campaign"
                element={
                  <ProtectedRoute>
                    <StartCampaign />
                  </ProtectedRoute>
                }
              />
              {/* Add more routes here as we build them */}
            </Routes>
          </main>
          <footer className="bg-gray-900 text-gray-400 py-12">
            <div className="container mx-auto px-4 grid md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-white font-bold text-lg mb-4">Unidos EC</h3>
                <p className="text-sm">La plataforma de ayuda social del Ecuador. Conectamos corazones solidarios con necesidades reales.</p>
              </div>
              <div>
                <h4 className="text-white font-bold mb-4">Recaudar fondos para</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link to="/explore?category=Salud" className="hover:text-white">Emergencias médicas</Link></li>
                  <li><Link to="/explore?category=Educación" className="hover:text-white">Educación</Link></li>
                  <li><Link to="/explore?category=Animales" className="hover:text-white">Animales</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-bold mb-4">Aprende más</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link to="/how-it-works" className="hover:text-white">Cómo funciona</Link></li>
                  <li><Link to="/terms" className="hover:text-white">Términos y Condiciones</Link></li>
                  <li><Link to="/faq" className="hover:text-white">Preguntas frecuentes</Link></li>
                  <li><Link to="/trust" className="hover:text-white">Seguridad y confianza</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-bold mb-4">Contáctanos</h4>
                <div className="flex space-x-4">
                  {/* Social icons placeholder */}
                </div>
              </div>
            </div>
            <div className="container mx-auto px-4 mt-12 pt-8 border-t border-gray-800 text-center text-sm">
              &copy; {new Date().getFullYear()} Unidos EC. Hecho con ❤️ en Ecuador.
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
