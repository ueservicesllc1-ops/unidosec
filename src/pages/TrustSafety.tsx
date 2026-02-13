// import React from 'react';
import { ShieldCheck, Lock, UserCheck, AlertTriangle } from 'lucide-react';

const TrustSafety = () => {
    return (
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold text-gray-900">Seguridad y Confianza</h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">Tu tranquilidad es nuestra prioridad número uno.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Garantía de Donación</h3>
                    <p className="text-gray-600">Si los fondos no llegan al beneficiario indicado o se descubre que una campaña es fraudulenta, te devolvemos tu dinero. Protegemos cada centavo de tu generosidad.</p>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Lock className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Pagos Seguros</h3>
                    <p className="text-gray-600">Utilizamos tecnología de encriptación SSL de grado bancario para procesar todas las transacciones. Nunca almacenamos los datos completos de tu tarjeta.</p>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <UserCheck className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Verificación de Identidad</h3>
                    <p className="text-gray-600">Exigimos documentación oficial (Cédula de identidad, RUC, cuentas bancarias verificadas) a todos los organizadores antes de que puedan retirar fondos.</p>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-orange-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Monitoreo 24/7</h3>
                    <p className="text-gray-600">Nuestro equipo y sistemas automatizados monitorean constantemente la plataforma para detectar actividades sospechosas y prevenir fraudes antes de que ocurran.</p>
                </div>
            </div>

            <div className="bg-primary/5 rounded-3xl p-8 text-center space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">¿Tienes dudas sobre una campaña?</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">Si ves algo que no parece correcto, repórtalo inmediatamente. Nuestro equipo de seguridad investigará cada reporte.</p>
                <button className="bg-primary text-white px-6 py-3 rounded-full font-bold hover:bg-green-600 transition">
                    Reportar una campaña
                </button>
            </div>
        </div>
    );
};

export default TrustSafety;
