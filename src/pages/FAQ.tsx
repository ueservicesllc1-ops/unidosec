// import React from 'react';

const FAQ = () => {
    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">Preguntas Frecuentes</h1>

            <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">¿Cómo creo una campaña?</h3>
                    <p className="text-gray-600">Crear una campaña es fácil y rápido. Solo necesitas registrarte, hacer clic en "Iniciar Campaña", contar tu historia, subir una foto y establecer tu meta de recaudación.</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">¿Cuánto cuesta usar Unidos EC?</h3>
                    <p className="text-gray-600">Crear una campaña es gratis. Sin embargo, para mantener la plataforma operativa y segura, se retiene un 30% de cada donación recibida para cubrir costos de procesamiento, servidores y administración.</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">¿Cómo recibo los fondos?</h3>
                    <p className="text-gray-600">Los fondos se transfieren directamente a tu cuenta bancaria ecuatoriana (Banco Pichincha, Guayaquil, Pacífico, etc.). Puedes solicitar retiros en cualquier momento desde tu panel de control.</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">¿Es seguro donar?</h3>
                    <p className="text-gray-600">Absolutamente. Utilizamos procesadores de pago encriptados y verificamos la identidad de los organizadores para garantizar que tu ayuda llegue a quien realmente lo necesita.</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">¿Puedo donar desde el extranjero?</h3>
                    <p className="text-gray-600">Sí, aceptamos tarjetas de crédito y débito internacionales, así como PayPal, permitiendo que familiares y amigos en el extranjero puedan apoyar tu causa.</p>
                </div>
            </div>
        </div>
    );
};

export default FAQ;
