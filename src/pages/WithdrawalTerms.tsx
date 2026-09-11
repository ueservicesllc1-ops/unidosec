import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, CheckCircle2, Lock, Landmark, Stethoscope, AlertTriangle, ArrowLeft } from 'lucide-react';

const WithdrawalTerms = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="max-w-4xl mx-auto px-4 py-12 text-gray-700">
            {/* Botón Volver */}
            <div className="mb-6">
                <Link
                    to="/terms"
                    className="inline-flex items-center text-sm font-semibold text-primary hover:underline gap-1.5"
                >
                    <ArrowLeft className="w-4 h-4" /> Volver a Términos Generales
                </Link>
            </div>

            {/* Cabecera */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-8 md:p-10 mb-10 shadow-xl border border-slate-700">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider mb-4">
                    <ShieldAlert className="w-4 h-4" /> Política Oficial de Desembolso
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
                    Términos y Condiciones de Retiro de Fondos y Verificación de Cuentas
                </h1>
                <p className="text-slate-300 text-sm md:text-base max-w-2xl leading-relaxed">
                    Normativa legal, operativa y de seguridad aplicable a todas las solicitudes de liquidación y desembolso de donaciones en la plataforma Unidos EC.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-700/60 text-xs text-slate-400">
                    Última actualización y entrada en vigor: {new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
            </div>

            <div className="space-y-8 text-sm md:text-base leading-relaxed">

                {/* Cláusula 1: Regla de Meta Completa */}
                <section className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 font-bold">
                            1
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Regla de Cumplimiento de Meta (No Retiros Parciales)
                        </h2>
                    </div>
                    <p>
                        El desembolso de los fondos recaudados en Unidos EC está sujeto a la regla inquebrantable de <strong>cumplimiento del monto total estipulado</strong> como objetivo o meta de la campaña.
                    </p>
                    <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 text-amber-900 text-sm space-y-2">
                        <p className="font-semibold flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            Condición estricta de retiro único:
                        </p>
                        <p>
                            Bajo ninguna circunstancia se admiten ni autorizan retiros parciales, anticipados, fragmentados o por cuotas. La solicitud de retiro solo se habilita técnicamente y administrativamente cuando la campaña ha alcanzado el 100% de su monto meta y todos los requisitos de verificación han sido validados favorablemente.
                        </p>
                    </div>
                </section>

                {/* Cláusula 2: Verificación de Identidad */}
                <section className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold">
                            2
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Verificación de Identidad Obligatoria (Cédula de Ciudadanía)
                        </h2>
                    </div>
                    <p>
                        Antes de cualquier desembolso, tanto el creador/organizador como el beneficiario designado deben completar el proceso de comprobación de identidad oficial ante el equipo de seguridad de Unidos EC:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-gray-600 text-sm">
                        <li>
                            <strong>Documento de Identidad Oficial:</strong> Presentación de copia o fotografía nítida, a color y por ambos lados de la Cédula de Ciudadanía o Identidad ecuatoriana (o pasaporte vigente en caso de extranjeros legalmente residentes).
                        </li>
                        <li>
                            <strong>Correspondencia Biométrica y Registral:</strong> El número de identificación debe coincidir de manera exacta e inequívoca con los registros del usuario en la plataforma.
                        </li>
                        <li>
                            <strong>Legitimidad de Beneficiario:</strong> Si el beneficiario es un tercero (familiar, persona vulnerable u organización), se exigirá acreditación fehaciente del vínculo, representación legal o autorización notariada según corresponda.
                        </li>
                    </ul>
                </section>

                {/* Cláusula 3: Verificación Bancaria */}
                <section className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 font-bold">
                            3
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Verificación de Cuenta Bancaria y Certificado Oficial
                        </h2>
                    </div>
                    <p>
                        Para garantizar que los donativos lleguen exclusivamente a su destino legítimo y prevenir cualquier maniobra de desvío o suplantación, el solicitante debe anexar un <strong>Certificado Bancario Oficial</strong>:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-1">
                                <Landmark className="w-4 h-4 text-emerald-600" /> Institución Financiera
                            </h3>
                            <p className="text-xs text-gray-600">
                                La cuenta bancaria debe pertenecer a un Banco o Cooperativa de Ahorro y Crédito legalmente supervisada por la Superintendencia de Bancos o SEPS de la República del Ecuador.
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Titularidad Estricta
                            </h3>
                            <p className="text-xs text-gray-600">
                                El titular de la cuenta debe coincidir exactamente con el organizador o beneficiario verificado. Queda terminantemente prohibido transferir fondos a cuentas de terceros, intermediarios o personas no identificadas.
                            </p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">
                        * El certificado bancario no debe tener una antigüedad superior a treinta (30) días calendario al momento de la solicitud de retiro.
                    </p>
                </section>

                {/* Cláusula 4: Verificación Médica Obligatoria */}
                <section className="bg-white rounded-2xl p-6 md:p-8 border border-red-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 font-bold">
                            4
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Stethoscope className="w-5 h-5 text-red-600" />
                            Protocolo Obligatorio de Verificación de Documentación Médica
                        </h2>
                    </div>
                    <p>
                        Para toda campaña cuya causa u objetivo involucre <strong>salud, accidentes, enfermedades, intervenciones quirúrgicas, hospitalización, tratamientos oncológicos, adquisición de fármacos o prótesis, y rehabilitación</strong>:
                    </p>
                    <div className="p-5 bg-red-50/80 rounded-2xl border border-red-200 space-y-3">
                        <p className="text-red-950 font-bold text-sm md:text-base flex items-center gap-2">
                            <Lock className="w-4 h-4 text-red-600 flex-shrink-0" />
                            BLOQUEO DE RETIRO HASTA APROBACIÓN HUMANA DE ADMINISTRACIÓN
                        </p>
                        <p className="text-red-900 text-xs md:text-sm leading-relaxed">
                            No se permitirá ningún retiro de fondos hasta que un administrador de Unidos EC haya recibido, revisado minuciosamente y aprobado de forma explícita el informe o certificación médica aportada. Esta restricción está blindada en la arquitectura del backend y no puede ser eludida por ninguna vía técnica o manual.
                        </p>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                        <p className="font-semibold text-gray-800">Requisitos indispensables del documento médico:</p>
                        <ul className="list-disc pl-6 space-y-1 text-xs md:text-sm">
                            <li>Emitido por un hospital, clínica, centro de salud o médico colegiado con número de registro profesional verificable.</li>
                            <li>Debe constar nombre completo del paciente, diagnóstico clínico, fecha de emisión y firma con sello de responsabilidad del facultativo.</li>
                            <li>En caso de documentos borrosos, alterados, incompletos o de origen dudoso, la solicitud será rechazada y el usuario notificado vía mensajería interna para subsanar.</li>
                        </ul>
                    </div>
                </section>

                {/* Cláusula 5: Auditoría, Trazabilidad y Prevención de Fraude */}
                <section className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 font-bold">
                            5
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Auditoría Permanente y Prevención de Fraude
                        </h2>
                    </div>
                    <p>
                        Todas las solicitudes de retiro quedan asentadas en una bitácora inmutable de auditoría (logs de trazabilidad) que registra la fecha, hora, estado, identificación del administrador actuante y notas oficiales de revisión.
                    </p>
                    <p className="text-sm text-gray-600">
                        Unidos EC se reserva el derecho irrestricto de pausar, congelar o rechazar desembolsos si se detectan patrones sospechosos de transacciones, sospechas de lavado de activos, contracargos fraudulentos o simulación de causas benéficas, notificando a las autoridades judiciales pertinentes si fuere necesario.
                    </p>
                </section>

                {/* Cláusula 6: Canales Oficiales de Notificación y Subsanación */}
                <section className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0 font-bold">
                            6
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Comunicaciones Oficiales y Subsanación
                        </h2>
                    </div>
                    <p>
                        Cualquier requerimiento de documentación adicional, informe de subsanación o resolución sobre el estado de su retiro será canalizado exclusivamente a través del <strong>Sistema de Mensajería Interna</strong> y la bandeja de <strong>Notificaciones</strong> del perfil de usuario dentro de Unidos EC.
                    </p>
                    <p className="text-sm text-gray-600">
                        Ningún empleado o representante de la plataforma solicitará contraseñas, pagos externos ni claves de acceso bancario bajo ninguna circunstancia.
                    </p>
                </section>

                {/* Pie de página y enlace a soporte */}
                <div className="text-center py-6 text-xs text-gray-400">
                    <p>
                        Para dudas o consultas respecto a un proceso de verificación, diríjase a su{' '}
                        <Link to="/profile?tab=messages" className="text-primary hover:underline font-bold">
                            Bandeja de Mensajes de Soporte
                        </Link>{' '}
                        o revise los{' '}
                        <Link to="/terms" className="text-primary hover:underline font-bold">
                            Términos y Condiciones Generales
                        </Link>.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WithdrawalTerms;
