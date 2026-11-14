import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, Scale, Clock, CheckCircle2, History, FileText } from 'lucide-react';
import { CURRENT_TERMS_VERSION, TERMS_HISTORY, getCurrentTermsInfo } from '../services/termsService';

const Terms = () => {
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const termsInfo = getCurrentTermsInfo();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="max-w-4xl mx-auto px-4 py-12 text-gray-700">
            {/* Cabecera */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3 border border-emerald-200">
                    <ShieldCheck className="w-4 h-4" /> Versión Oficial {CURRENT_TERMS_VERSION}
                </div>
                <h1 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">Términos y Condiciones de Uso</h1>
                <p className="text-sm text-gray-500">
                    Fecha de publicación y entrada en vigor: <strong>{termsInfo.effectiveDate}</strong> · Versión vigente {CURRENT_TERMS_VERSION}
                </p>
                <div className="mt-3 flex justify-center">
                    <button
                        onClick={() => setShowVersionHistory(!showVersionHistory)}
                        className="text-xs text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                        <History className="w-3.5 h-3.5" />
                        {showVersionHistory ? 'Ocultar historial de versiones' : 'Ver historial de versiones y cambios'}
                    </button>
                </div>
            </div>

            {/* Historial de Versiones Plegable */}
            {showVersionHistory && (
                <div className="mb-10 p-6 bg-slate-50 rounded-2xl border border-slate-200 text-sm space-y-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
                        <FileText className="w-4 h-4 text-blue-600" />
                        Historial de Versiones de los Términos y Condiciones
                    </h3>
                    <div className="space-y-4">
                        {TERMS_HISTORY.map((v) => (
                            <div key={v.version} className="bg-white p-4 rounded-xl border border-gray-200">
                                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                    <span className="font-bold text-gray-900">
                                        Versión {v.version} — {v.title}
                                    </span>
                                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                                        Vigente desde: {v.effectiveDate}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 mb-2">{v.summary}</p>
                                <ul className="list-disc pl-5 text-xs text-gray-500 space-y-1">
                                    {v.changes.map((c, i) => (
                                        <li key={i}>{c}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SECCIÓN 1 */}
            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">1. Aceptación de los Términos</h2>
                <p>
                    Bienvenido a Unidos EC ("la Plataforma", "nosotros", "nuestro"). Al acceder o utilizar nuestro sitio web, servicios y herramientas (colectivamente, los "Servicios"), usted acepta cumplir y estar legalmente obligado por los siguientes términos y condiciones ("Términos de Servicio" o "Términos"). Estos Términos se aplican de manera general a todos los visitantes, usuarios, donantes y organizadores que accedan o utilicen la Plataforma.
                </p>
                <p>
                    Si no está de acuerdo con alguna parte de estos Términos, no podrá acceder ni utilizar los Servicios. Cada campaña publicada en Unidos EC queda vinculada a la versión de los Términos aceptada de forma explícita al momento de su creación.
                </p>
            </section>

            {/* SECCIÓN 2 */}
            <section className="space-y-4 mt-8">
                <h2 className="text-2xl font-bold text-gray-900">2. Descripción del Servicio</h2>
                <p>
                    Unidos EC es una plataforma de recaudación solidaria que permite a individuos y organizaciones ("Organizadores") publicar campañas de recaudación de fondos ("Campañas") para recibir aportaciones voluntarias ("Donaciones") de terceros ("Donantes") destinadas a causas médicas, humanitarias o sociales legítimas.
                </p>
                <p>
                    La Plataforma actúa exclusivamente como intermediario tecnológico e infraestructura de verificación y recaudación. No somos una entidad bancaria, casa de valores, aseguradora ni institución financiera prestamista.
                </p>
            </section>

            {/* SECCIÓN 3 */}
            <section className="space-y-4 mt-8">
                <h2 className="text-2xl font-bold text-gray-900">3. Tarifas y Cargos de Operación</h2>
                <p>
                    Crear una cuenta y publicar una Campaña en Unidos EC es gratuito. Para cubrir los costos operativos, licencias de servidores, pasarelas de pago internacionales y auditoría documental antifraude, se aplica la siguiente estructura:
                </p>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 my-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Comisión de Plataforma y Operación</h3>
                    <p className="font-semibold text-gray-800">
                        Unidos EC retiene el treinta por ciento (30%) del total de cada donación recibida a través de la Plataforma en concepto de costos de pasarelas de pago, administración, infraestructura tecnológica y procesos de verificación.
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                        Al publicar una campaña, los Organizadores reconocen y aceptan formalmente dicha deducción previa a la acreditación o liquidación de desembolsos.
                    </p>
                </div>
            </section>

            {/* SECCIÓN 4 */}
            <section className="space-y-4 mt-8">
                <h2 className="text-2xl font-bold text-gray-900">4. Registro y Seguridad de la Cuenta</h2>
                <p>
                    Para organizar campañas o solicitar retiros, es obligatorio registrarse con datos verdaderos y actualizados. Usted es responsable de la confidencialidad de sus credenciales y de toda actividad realizada desde su cuenta.
                </p>
            </section>

            {/* SECCIÓN 5 */}
            <section className="space-y-4 mt-8">
                <h2 className="text-2xl font-bold text-gray-900">5. Conducta General del Usuario y Campañas Prohibidas</h2>
                <p>
                    Está estrictamente prohibido utilizar la Plataforma para fines ilícitos, incitación al odio, apuestas, esquemas piramidales o campañas que carezcan de veracidad documental verificable.
                </p>
            </section>

            {/* SECCIÓN 6 — POLÍTICA DE INTEGRIDAD */}
            <section className="space-y-6 mt-10 p-8 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-3xl border border-blue-100 shadow-sm">
                <div className="flex items-center gap-3 text-blue-700">
                    <Scale className="w-7 h-7 flex-shrink-0" />
                    <h2 className="text-2xl font-black tracking-tight text-gray-900">
                        6. Política de Integridad, Conducta y Uso Responsable de las Campañas
                    </h2>
                </div>

                <div className="space-y-4 text-sm leading-relaxed text-gray-800">
                    <p>
                        El uso de Unidos EC exige actuar en todo momento bajo el principio de <strong>buena fe, lealtad y veracidad</strong>. La confianza de los donantes y la transparencia de las causas benéficas son el pilar de la Plataforma.
                    </p>
                    <p>
                        El organizador asume plena responsabilidad civil, legal y contractual sobre la totalidad del contenido que publique en:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 font-medium text-gray-700">
                        <li>El título y la descripción de la campaña;</li>
                        <li>Las actualizaciones y comunicados de avance;</li>
                        <li>Las publicaciones, fotografías, imágenes y documentos adjuntos;</li>
                        <li>Los comentarios y mensajes cursados a través de la Plataforma;</li>
                        <li>Campañas posteriores o secundarias vinculadas directa o indirectamente a los mismos hechos o beneficiario.</li>
                    </ul>

                    {/* 6.1 Conductas que pueden provocar suspensión o cancelación */}
                    <div className="mt-6 pt-4 border-t border-blue-100 space-y-3">
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                            6.1 Conductas Prohibidas que Pueden Provocar Suspensión o Cancelación
                        </h3>
                        <p>
                            Unidos EC cuenta con facultad contractual expresa para suspender, inhabilitar donaciones o cancelar de forma definitiva una campaña cuando, tras el debido proceso de revisión y mediando evidencia objetiva suficiente, se determine que el organizador ha incurrido en cualquiera de las siguientes conductas:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-800">
                            <li>Publicar deliberadamente información falsa o materialmente engañosa sobre la causa o el uso de los fondos;</li>
                            <li>Engañar deliberadamente a los donantes respecto a la urgencia, destino o beneficiario real de los recursos;</li>
                            <li>Manipular hechos o circunstancias relacionados con el avance o estado de la campaña;</li>
                            <li>Falsificar, alterar, editar o adulterar certificados médicos, documentos de identidad o certificados bancarios;</li>
                            <li><strong>Presentar deliberadamente como robo, confiscación o apropiación indebida de fondos una situación que los registros oficiales de la Plataforma demuestran que corresponde a un proceso legítimo de verificación documental, auditoría médica o trámite bancario de desembolso;</strong></li>
                            <li><strong>Afirmar deliberadamente que Unidos EC se ha negado a pagar o desembolsar fondos cuando la solicitud de desembolso aún no cumplía los requisitos contractuales de verificación previa exigidos en los Términos;</strong></li>
                            <li><strong>Afirmar deliberadamente que Unidos EC se apropió de fondos cuando los mismos permanecen bajo resguardo fiduciario sujetos al proceso de verificación o liquidación;</strong></li>
                            <li><strong>Crear una nueva campaña para captar donaciones utilizando como justificación o argumento afirmaciones falsas sobre una campaña anterior o sobre el tratamiento de fondos por parte de Unidos EC;</strong></li>
                            <li>Utilizar afirmaciones objetivamente falsas para generar presión mediática o social indebida sobre Unidos EC o sobre los donantes;</li>
                            <li>Intentar evadir bloqueos, suspensiones cautelares o requisitos de auditoría de la Plataforma mediante la creación reiterada de nuevas cuentas o campañas espejo.</li>
                        </ul>
                    </div>

                    {/* 6.2 Crítica Legítima vs Información Falsa */}
                    <div className="mt-6 p-5 bg-white rounded-2xl border border-emerald-200 space-y-3">
                        <h3 className="text-base font-bold text-emerald-900 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            6.2 Distinción Fundamental: Protección Irrestricta de la Crítica vs. Información Falsa
                        </h3>
                        <p className="text-gray-700">
                            Esta política <strong>NO prohíbe ni sanciona las críticas, quejas ni expresiones de desacuerdo</strong>. Unidos EC reconoce y ampara el derecho de los organizadores y donantes a:
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-gray-700 pt-1">
                            <li className="bg-gray-50 p-2 rounded-lg border border-gray-100">✓ Reclamar sobre tiempos de respuesta;</li>
                            <li className="bg-gray-50 p-2 rounded-lg border border-gray-100">✓ Cuestionar decisiones administrativas;</li>
                            <li className="bg-gray-50 p-2 rounded-lg border border-gray-100">✓ Expresar inconformidad o descontento;</li>
                            <li className="bg-gray-50 p-2 rounded-lg border border-gray-100">✓ Considerar injusto o riguroso un proceso;</li>
                            <li className="bg-gray-50 p-2 rounded-lg border border-gray-100">✓ Solicitar aclaraciones y explicaciones;</li>
                            <li className="bg-gray-50 p-2 rounded-lg border border-gray-100">✓ Informar honestamente sobre su experiencia;</li>
                            <li className="bg-gray-50 p-2 rounded-lg border border-gray-100">✓ Presentar reclamaciones formales;</li>
                            <li className="bg-gray-50 p-2 rounded-lg border border-gray-100">✓ Expresar opiniones negativas o desfavorables.</li>
                        </ul>
                        <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 mt-2 space-y-1">
                            <p className="font-bold">Criterio de distinción:</p>
                            <p>
                                Expresiones como <em>"Estoy inconforme porque mi retiro sigue pendiente de revisión"</em> constituyen opiniones o quejas amparadas que jamás serán motivo de sanción.
                            </p>
                            <p>
                                Por el contrario, afirmaciones fácticas como <em>"Unidos EC se robó mi dinero"</em> constituyen aserciones objetivas sujetas a verificación. Si los registros oficiales prueban que el usuario no entregó los certificados bancarios requeridos y que los fondos están intactos en auditoría, la conducta califica como desinformación deliberada sujeta a revisión.
                            </p>
                        </div>
                    </div>

                    {/* 6.3 Campañas Nuevas para Conseguir Donaciones Mediante Falsedades */}
                    <div className="mt-6 pt-4 border-t border-blue-100 space-y-2">
                        <h3 className="text-base font-bold text-gray-900">
                            6.3 Campañas Secundarias Basadas en Hechos Falsos
                        </h3>
                        <p>
                            Si un usuario cuya campaña previa se encuentra sujeta a verificación o auditoría crea una nueva campaña e induce a los donantes a realizar aportes bajo el argumento falso de que Unidos EC confiscó o negó indebidamente los fondos anteriores, dicha nueva campaña será suspendida de forma inmediata y sometida a investigación por uso abusivo de la plataforma.
                        </p>
                    </div>

                    {/* 6.4 Procedimiento de Revisión Humana Obligatoria */}
                    <div className="mt-6 pt-4 border-t border-blue-100 space-y-3">
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-600" />
                            6.4 Procedimiento de Revisión Humana Obligatoria (Debido Proceso)
                        </h3>
                        <p>
                            <strong>Ninguna campaña será eliminada ni sancionada de forma automática</strong> por el simple hecho de recibir reportes ciudadanos, contener palabras clave o criticar a la Plataforma.
                        </p>
                        <p>El procedimiento administrativo reglado contempla las siguientes etapas sucesivas:</p>
                        <div className="flex items-center gap-2 overflow-x-auto py-2 text-xs font-bold text-slate-700">
                            <span className="px-2.5 py-1 bg-slate-200 rounded-lg">1. REPORT (Reporte)</span>
                            <span>→</span>
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg">2. UNDER_REVIEW (Revisión)</span>
                            <span>→</span>
                            <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg">3. EVIDENCE (Evidencias)</span>
                            <span>→</span>
                            <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg">4. USER_RESPONSE (Descargo)</span>
                            <span>→</span>
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg">5. ADMIN_REVIEW</span>
                            <span>→</span>
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg">6. DECISION / ACTION</span>
                        </div>
                        <p>Las decisiones posibles son:</p>
                        <ul className="list-disc pl-6 space-y-1 text-xs">
                            <li><strong>NO_VIOLATION (Sin Infracción):</strong> Se desestima el caso y la campaña continúa normalmente.</li>
                            <li><strong>WARNING (Advertencia):</strong> Notificación formal de corrección sin afectación de la campaña.</li>
                            <li><strong>CONTENT_REMOVAL (Retiro de Contenido):</strong> Retiro exclusivo de la publicación o actualización infractora.</li>
                            <li><strong>CAMPAIGN_SUSPENDED (Suspensión Cautelar):</strong> Pausa temporal de donaciones mientras se complementa la auditoría.</li>
                            <li><strong>CAMPAIGN_CANCELLED (Cancelación Definitiva):</strong> Cierre irrevocable de la campaña con inicio de reembolso a donantes.</li>
                            <li><strong>ACCOUNT_SUSPENDED (Suspensión de Cuenta):</strong> Inhabilitación del usuario ante dolo o falsificación documental grave.</li>
                        </ul>
                    </div>

                    {/* 6.5 Preservación de Evidencia y Auditoría */}
                    <div className="mt-6 pt-4 border-t border-blue-100 space-y-2">
                        <h3 className="text-base font-bold text-gray-900">
                            6.5 Preservación Inmutable de Evidencia y Registro Histórico
                        </h3>
                        <p>
                            Antes de aplicar cualquier modificación o medida administrativa, el sistema genera automáticamente un <strong>snapshot inmutable de auditoría</strong> que preserva el contenido íntegro original (título, descripción, multimedia, fecha, hora, recaudación, estados de verificación y versión de Términos aceptada).
                        </p>
                        <p>
                            Si el organizador altera o elimina la publicación posteriormente, la evidencia original permanece resguardada en el registro de auditoría (`compliance_audit_logs`), el cual no puede ser eliminado por ningún administrador.
                        </p>
                    </div>

                    {/* 6.6 Régimen de Fondos y Reembolsos en Campañas Canceladas */}
                    <div className="mt-6 p-5 bg-slate-900 text-white rounded-2xl space-y-3">
                        <h3 className="text-base font-bold text-emerald-400">
                            6.6 Tratamiento de Fondos y Devolución Estricta a Donantes
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Cuando una campaña sea cancelada por infracción grave a esta política y proceda la restitución de donaciones, Unidos EC ejecutará el proceso de reembolso conforme a la siguiente fórmula legal estricta:
                        </p>
                        <div className="p-3 bg-slate-800 rounded-xl font-mono text-xs text-emerald-300 border border-slate-700 text-center">
                            MONTO RECAUDADO - COMISIONES DE PROCESAMIENTO NO RECUPERABLES = MONTO DISPONIBLE PARA DEVOLUCIÓN
                        </div>
                        <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-5">
                            <li><strong>No se aplicarán deducciones operativas ni porcentajes arbitrarios no contemplados en el contrato.</strong></li>
                            <li><strong>No se aplicarán cobros por gastos legales no ordenados por autoridad judicial competente.</strong></li>
                            <li>El sistema identificará nominalmente a cada donante con su importe respectivo y el estado individual del reembolso: <code>REFUND_PENDING</code>, <code>REFUND_PROCESSING</code>, <code>REFUND_COMPLETED</code>, <code>REFUND_FAILED</code>.</li>
                        </ul>
                    </div>

                    {/* 6.7 Comunicación Formal y Motivada */}
                    <div className="mt-6 pt-4 border-t border-blue-100 space-y-2">
                        <h3 className="text-base font-bold text-gray-900">
                            6.7 Comunicación Formal Obligatoria al Organizador
                        </h3>
                        <p>
                            Toda medida de suspensión o cancelación será notificada formalmente al organizador indicando expresamente: (1) Regla infringida; (2) Contenido objeto de revisión; (3) Hechos verificados con registros oficiales; (4) Evidencia considerada; (5) Decisión adoptada; (6) Efectos sobre la campaña; (7) Tratamiento de los fondos; y (8) Canal de apelación o descargo disponible.
                        </p>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 7 */}
            <section className="space-y-4 mt-10">
                <h2 className="text-2xl font-bold text-gray-900">7. Retención de Fondos, Auditoría y Desembolsos</h2>
                <p>
                    Los fondos recaudados permanecerán bajo custodia hasta que el organizador complete íntegramente los protocolos de <Link to="/terminos-retiros" className="text-primary underline font-bold" title="Términos de Verificación y Retiro">verificación de identidad, cuenta bancaria oficial y auditoría documental</Link>.
                </p>
                <p>
                    Unidos EC no transferirá fondos a cuentas de terceros ni autorizará desembolsos sin la previa conformidad técnica y legal del equipo de auditoría.
                </p>
            </section>

            {/* SECCIÓN 8 */}
            <section className="space-y-4 mt-8">
                <h2 className="text-2xl font-bold text-gray-900">8. Exención de Responsabilidad</h2>
                <p>
                    El servicio se proporciona "tal cual". Unidos EC no garantiza montos mínimos de recaudación ni se responsabiliza de perjuicios derivados del mal uso de la plataforma por parte de organizadores infractores.
                </p>
            </section>

            {/* SECCIÓN 9 */}
            <section className="space-y-4 mt-8">
                <h2 className="text-2xl font-bold text-gray-900">9. Modificaciones y Control de Versiones</h2>
                <p>
                    Nos reservamos el derecho de actualizar estos Términos periódicamente. Cada modificación se registrará en el historial con fecha de publicación y vigencia. Las campañas creadas previamente mantendrán la vinculación documental a la versión aceptada al momento de su inicio.
                </p>
            </section>

            {/* SECCIÓN 10 */}
            <section className="space-y-4 mt-8 mb-12">
                <h2 className="text-2xl font-bold text-gray-900">10. Contacto y Departamento Legal</h2>
                <p>
                    Para consultas legales, notificaciones de cumplimiento o apelaciones, comuníquese con nuestra división legal a <strong>legal@unidosec.com</strong> o mediante la sección de soporte de la Plataforma.
                </p>
            </section>
        </div>
    );
};

export default Terms;
