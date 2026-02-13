import { useEffect } from 'react';

const Terms = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="max-w-4xl mx-auto px-4 py-12 prose prose-green text-gray-700">
            <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">Términos y Condiciones de Uso</h1>

            <p className="text-sm text-gray-500 mb-8 text-center">Última actualización: {new Date().toLocaleDateString()}</p>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800">1. Aceptación de los Términos</h2>
                <p>
                    Bienvenido a Unidos EC ("la Plataforma", "nosotros", "nuestro"). Al acceder o utilizar nuestro sitio web, servicios y herramientas (colectivamente, los "Servicios"), usted acepta cumplir y estar legalmente obligado por los siguientes términos y condiciones ("Términos de Servicio" o "Términos"). Estos Términos se aplican a todos los visitantes, usuarios y otras personas que accedan o utilicen los Servicios.
                </p>
                <p>
                    Si no está de acuerdo con alguna parte de estos Términos, no podrá acceder a los Servicios. Lea atentamente estos Términos antes de utilizar nuestra Plataforma.
                </p>
            </section>

            <section className="space-y-4 mt-8">
                <h2 className="text-2xl font-bold text-gray-800">2. Descripción del Servicio</h2>
                <p>
                    Unidos EC es una plataforma de recaudación de fondos que permite a individuos y organizaciones ("Organizadores") publicar campañas de recaudación de fondos ("Campañas") para aceptar donaciones monetarias ("Donaciones") de donantes ("Donantes") para causas específicas.
                </p>
                <p>
                    La Plataforma actúa únicamente como un facilitador para permitir a los Organizadores recaudar fondos. No somos un corredor, institución financiera, acreedor o caridad. No garantizamos que una Campaña obtenga una cierta cantidad de Donaciones o cualquier Donación en absoluto.
                </p>
            </section>

            <section className="space-y-4 mt-8">
                <h2 className="text-2xl font-bold text-gray-800">3. Tarifas y Cargos de Operación</h2>
                <p>
                    Crear una cuenta y publicar una Campaña en Unidos EC es gratuito. Sin embargo, para mantener la operación, seguridad, desarrollo y mejora continua de la Plataforma, se aplican ciertas tarifas sobre las donaciones recibidas.
                </p>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 my-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Comisión de Plataforma y Operación</h3>
                    <p className="font-semibold text-gray-800">
                        Unidos EC retendrá automáticamente el treinta por ciento (30%) del total de cada donación realizada a través de la Plataforma en concepto de gastos de operación, administración, procesamiento de pagos y mantenimiento tecnológico.
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                        Al utilizar nuestros Servicios, los Organizadores reconocen y aceptan incondicionalmente esta deducción del 30% antes de la transferencia de los fondos recaudados. Este porcentaje es necesario para cubrir los costos de servidores, seguridad, soporte al cliente, verificación de campañas y tarifas de pasarelas de pago internacionales.
                    </p>
                </div>
                <p>
                    Los Donantes reconocen que el 100% de su donación no llegará al beneficiario final debido a esta tarifa operativa necesaria para la existencia de la Plataforma.
                </p>
            </section>

            <section className="space-y-4 mt-8">
                <h2 className="text-2xl font-bold text-gray-800">4. Registro y Seguridad de la Cuenta</h2>
                <p>
                    Para acceder a ciertas funciones de los Servicios, deberá registrarse para obtener una cuenta. Usted acepta proporcionar información precisa, actual y completa durante el proceso de registro y actualizar dicha información para mantenerla precisa, actual y completa.
                </p>
                <p>
                    Usted es responsable de salvaguardar su contraseña. Acepta no revelar su contraseña a ningún tercero y asumir la responsabilidad de cualquier actividad o acción bajo su cuenta, ya sea que haya autorizado o no dichas actividades o acciones. Notificará inmediatamente a Unidos EC sobre cualquier uso no autorizado de su cuenta.
                </p>
            </section>

            <section className="space-y-4 mt-8">
                <h2 className="text-2xl font-bold text-gray-800">5. Conducta del Usuario y Campañas Prohibidas</h2>
                <p>
                    Usted garantiza que toda la información proporcionada en relación con una Campaña es precisa, completa y no es probable que engañe a los Usuarios. Está estrictamente prohibido utilizar los Servicios para:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Violar cualquier ley, estatuto, ordenanza o regulación.</li>
                    <li>Promover el odio, la violencia, la discriminación racial, sexual, religiosa o de otro tipo.</li>
                    <li>Ofrecer recompensas financieras, retornos de inversión o venta de acciones.</li>
                    <li>Recaudar fondos para procedimientos legales o defensa de delitos violentos o financieros graves.</li>
                    <li>Publicar contenido sexualmente explícito o pornográfico.</li>
                    <li>Juegos de azar, apuestas, loterías o sorteos.</li>
                </ul>
                <p>
                    Unidos EC se reserva el derecho de eliminar cualquier Campaña y suspender cualquier cuenta que viole estos términos, a nuestra entera discreción y sin previo aviso.
                </p>
            </section>

            <section className="space-y-4 mt-8">
                <h2 className="text-2xl font-bold text-gray-800">6. Retención de Fondos y Pagos</h2>
                <p>
                    Los fondos recaudados (menos la tarifa del 30%) se transferirán al Organizador o Beneficiario designado según el método de pago seleccionado. Unidos EC puede retener fondos si existe sospecha de fraude, disputas de contracargos o violación de estos Términos.
                </p>
                <p>
                    Es responsabilidad exclusiva del Organizador proporcionar información bancaria correcta. Unidos EC no se hace responsable de fondos transferidos a cuentas incorrectas debido a errores en la información proporcionada por el Organizador.
                </p>
            </section>

            <section className="space-y-4 mt-8">
                <h2 className="text-2xl font-bold text-gray-800">7. Reembolsos y Contracargos</h2>
                <p>
                    Las donaciones generalmente no son reembolsables. Sin embargo, si un Donante cree que una Campaña es fraudulenta, debe contactarnos inmediatamente. Unidos EC evaluará la situación a su discreción. Si se determina que una Campaña es fraudulenta, intentaremos reembolsar a los Donantes, sujeto a la disponibilidad de los fondos.
                </p>
            </section>

            <section className="space-y-4 mt-8">
                <h2 className="text-2xl font-bold text-gray-800">8. Exención de Responsabilidad</h2>
                <p>
                    SU USO DEL SERVICIO ES BAJO SU PROPIO RIESGO. EL SERVICIO SE PROPORCIONA "TAL CUAL" Y "SEGÚN DISPONIBILIDAD". UNIDOS EC RENUNCIA EXPRESAMENTE A TODAS LAS GARANTÍAS DE CUALQUIER TIPO, YA SEAN EXPRESAS O IMPLÍCITAS.
                </p>
                <p>
                    No garantizamos que: (i) el Servicio cumplirá con sus requisitos específicos; (ii) el Servicio será ininterrumpido, oportuno, seguro o libre de errores; (iii) los resultados que puedan obtenerse del uso del Servicio serán precisos o confiables.
                </p>
            </section>

            <section className="space-y-4 mt-8">
                <h2 className="text-2xl font-bold text-gray-800">9. Modificaciones a los Términos</h2>
                <p>
                    Nos reservamos el derecho, a nuestra entera discreción, de modificar o reemplazar estos Términos en cualquier momento. Si una revisión es importante, intentaremos proporcionar un aviso de al menos 30 días antes de que entren en vigor los nuevos términos. Lo que constituye un cambio material se determinará a nuestra entera discreción.
                </p>
                <p>
                    Al continuar accediendo o utilizando nuestro Servicio después de que esas revisiones entren en vigor, usted acepta estar obligado por los términos revisados.
                </p>
            </section>

            <section className="space-y-4 mt-8 mb-12">
                <h2 className="text-2xl font-bold text-gray-800">10. Contacto</h2>
                <p>
                    Si tiene alguna pregunta sobre estos Términos, por favor contáctenos a través de nuestro formulario de soporte o mediante correo electrónico a legal@unidosec.com.
                </p>
            </section>
        </div>
    );
};

export default Terms;
