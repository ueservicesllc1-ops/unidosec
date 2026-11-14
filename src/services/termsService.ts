// ─────────────────────────────────────────────────────────────
// CONTROL DE VERSIONES: TÉRMINOS Y CONDICIONES DE UNIDOS EC
// ─────────────────────────────────────────────────────────────

export interface TermsVersion {
    version: string;
    publishDate: string;
    effectiveDate: string;
    title: string;
    summary: string;
    changes: string[];
}

export const CURRENT_TERMS_VERSION = '2.1';

export const TERMS_ACCEPTANCE_DECLARATION =
    "Al publicar esta campaña acepto los Términos y Condiciones de Unidos EC, incluyendo la Política de Integridad, Conducta y Uso Responsable de la Plataforma.";

export const TERMS_HISTORY: TermsVersion[] = [
    {
        version: '1.0',
        publishDate: '2025-01-15',
        effectiveDate: '2025-01-15',
        title: 'Términos y Condiciones Iniciales de Unidos EC',
        summary: 'Marco fundacional de uso de la plataforma de recaudación solidaria en Ecuador.',
        changes: [
            'Definición de servicios de recaudación de fondos y donaciones.',
            'Comisión operativa de la plataforma.',
            'Normas iniciales de conducta y registro de usuarios.',
        ],
    },
    {
        version: '2.0',
        publishDate: '2026-03-01',
        effectiveDate: '2026-03-01',
        title: 'Actualización Integral de Seguridad, Auditoría Médica y Verificación de Retiros',
        summary: 'Requisitos obligatorios de verificación de identidad, certificados bancarios y respaldo médico.',
        changes: [
            'Protocolo de verificación documental médica obligatoria para campañas de salud.',
            'Proceso estricto de auditoría para retiro y desembolso de fondos.',
            'Mecanismo de trazabilidad bancaria para prevención de fraude.',
        ],
    },
    {
        version: '2.1',
        publishDate: '2026-09-17',
        effectiveDate: '2026-09-17',
        title: 'Política de Integridad, Conducta y Uso Responsable de las Campañas',
        summary: 'Facultad contractual y técnica de suspensión o cancelación ante desinformación fáctica deliberada, con protección irrestricta de la crítica legítima, debido proceso de revisión humana y régimen estricto de reembolsos.',
        changes: [
            'Adición de la Política de Integridad, Conducta y Uso Responsable de las Campañas.',
            'Tipificación de conductas prohibidas sobre falseamiento de fondos, retiros o verificaciones.',
            'Garantía explícita de libre expresión, quejas, críticas e inconformidades legítimas.',
            'Flujo obligatorio de revisión humana y preservación inmutable de evidencia antes de cualquier sanción.',
            'Regla de protección contra campañas posteriores basadas en hechos falsos de campañas previas.',
            'Fórmula legal de cálculo de devolución a donantes sin comisiones operativas o legales arbitrarias.',
            'Control de versiones y vinculación explícita de cada campaña a la versión aceptada.',
        ],
    },
];

export const getCurrentTermsInfo = (): TermsVersion => {
    const current = TERMS_HISTORY.find((t) => t.version === CURRENT_TERMS_VERSION);
    return current || TERMS_HISTORY[TERMS_HISTORY.length - 1];
};

export const getTermsByVersion = (version?: string): TermsVersion => {
    if (!version) return getCurrentTermsInfo();
    const match = TERMS_HISTORY.find((t) => t.version === version);
    return match || getCurrentTermsInfo();
};
