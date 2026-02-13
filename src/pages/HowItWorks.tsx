// import React from 'react';
import { Link } from 'react-router-dom';
import { PenSquare, Share2, Heart, Banknote, ShieldCheck } from 'lucide-react';

const HowItWorks = () => {
    return (
        <div className="max-w-4xl mx-auto space-y-20 py-12">

            {/* Hero */}
            <section className="text-center space-y-6">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Ayuda al alcance de todos</h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Unidos EC es la forma más fácil y segura de pedir ayuda o apoyar a quienes lo necesitan en Ecuador.
                </p>
            </section>

            {/* Steps */}
            <section className="grid md:grid-cols-4 gap-8 text-center relative">
                {/* Connector Line (Desktop) */}
                <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gray-200 -z-10"></div>

                <div className="space-y-4 bg-gray-50 md:bg-transparent p-6 md:p-0 rounded-2xl">
                    <div className="w-24 h-24 bg-white border-4 border-primary rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <PenSquare className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold">1. Crea tu campaña</h3>
                    <p className="text-gray-600 text-sm">Cuéntanos tu historia, define una meta y sube fotos. Es gratis y te toma solo unos minutos.</p>
                </div>

                <div className="space-y-4 bg-gray-50 md:bg-transparent p-6 md:p-0 rounded-2xl">
                    <div className="w-24 h-24 bg-white border-4 border-primary rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <Share2 className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold">2. Comparte</h3>
                    <p className="text-gray-600 text-sm">Envía el link a amigos y familia por WhatsApp y redes sociales. La difusión es clave.</p>
                </div>

                <div className="space-y-4 bg-gray-50 md:bg-transparent p-6 md:p-0 rounded-2xl">
                    <div className="w-24 h-24 bg-white border-4 border-primary rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <Heart className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold">3. Recibe apoyo</h3>
                    <p className="text-gray-600 text-sm">Aceptamos tarjetas de crédito, débito y transferencias locales de forma segura.</p>
                </div>

                <div className="space-y-4 bg-gray-50 md:bg-transparent p-6 md:p-0 rounded-2xl">
                    <div className="w-24 h-24 bg-white border-4 border-primary rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <Banknote className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold">4. Retira los fondos</h3>
                    <p className="text-gray-600 text-sm">El dinero se transfiere directamente a tu cuenta bancaria en Ecuador.</p>
                </div>
            </section>

            {/* Trust & Safety */}
            <section className="bg-primary/5 rounded-3xl p-8 md:p-12 text-center space-y-6">
                <ShieldCheck className="h-16 w-16 text-primary mx-auto" />
                <h2 className="text-3xl font-bold text-gray-900">Tu seguridad es nuestra prioridad</h2>
                <div className="grid md:grid-cols-2 gap-8 text-left max-w-3xl mx-auto pt-6">
                    <div>
                        <h4 className="font-bold text-lg mb-2">Para Donantes</h4>
                        <ul className="space-y-2 text-gray-600 text-sm list-disc pl-5">
                            <li>Garantía antifraude: Si los fondos no llegan al destino prometido, te devolvemos el dinero.</li>
                            <li>Pagos encriptados con seguridad bancaria.</li>
                            <li>Transparencia total sobre quién recibe el dinero.</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-lg mb-2">Para Organizadores</h4>
                        <ul className="space-y-2 text-gray-600 text-sm list-disc pl-5">
                            <li>Verificación de identidad para generar confianza.</li>
                            <li>Retiros directos a cuentas de Banco Pichincha, Guayaquil, Pacífico y más.</li>
                            <li>Soporte local en español.</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="text-center py-8">
                <h2 className="text-2xl font-bold mb-6">¿Listo para empezar?</h2>
                <Link
                    to="/start-campaign"
                    className="bg-primary text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-green-600 transition shadow-lg transform hover:-translate-y-1 inline-flex items-center"
                >
                    Iniciar mi campaña ahora
                </Link>
            </section>

        </div>
    );
};

export default HowItWorks;
