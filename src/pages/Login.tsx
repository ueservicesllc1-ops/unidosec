import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart } from 'lucide-react';

const Login = () => {
    const { signInWithGoogle, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Get the page the user was trying to access, or default to home
    const from = location.state?.from?.pathname || "/";

    React.useEffect(() => {
        if (user) {
            navigate(from, { replace: true });
        }
    }, [user, navigate, from]);

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle();
            // Navigation happens in useEffect
        } catch (error) {
            console.error("Login failed", error);
            alert("Error al iniciar sesión");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Heart className="h-8 w-8 text-primary" fill="currentColor" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">Bienvenido a EcuFund</h1>
                <p className="text-gray-600 mb-8">
                    Inicia sesión para crear campañas o guardar tu historial de donaciones.
                </p>

                <button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center bg-white border border-gray-300 transform hover:-translate-y-0.5 transition shadow-sm hover:shadow text-gray-700 font-medium py-3 px-4 rounded-xl"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 mr-3" alt="Google" />
                    Continuar con Google
                </button>

                <div className="mt-6 text-xs text-gray-500">
                    Al continuar, aceptas nuestros <a href="#" className="underline">Términos de servicio</a> y <a href="#" className="underline">Política de privacidad</a>.
                </div>
            </div>
        </div>
    );
};

export default Login;
