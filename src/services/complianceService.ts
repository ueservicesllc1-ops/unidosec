import { db } from '../firebase';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    getDoc,
    getDocs,
    serverTimestamp,
    query,
    orderBy,
    where
} from 'firebase/firestore';

export type ComplianceCaseStatus =
    | 'REPORTED'
    | 'UNDER_REVIEW'
    | 'EVIDENCE_COLLECTION'
    | 'USER_RESPONSE_REQUESTED'
    | 'USER_RESPONDED'
    | 'ADMIN_REVIEW'
    | 'RESOLVED_NO_ACTION'
    | 'RESOLVED_WARNING'
    | 'RESOLVED_RECTIFICATION'
    | 'RESOLVED_SUSPENSION'
    | 'RESOLVED_CANCELLATION';

export type ComplianceAction =
    | 'NO_ACTION'
    | 'FORMAL_WARNING'
    | 'RECTIFICATION_REQUEST'
    | 'TEMPORARY_SUSPENSION'
    | 'PERMANENT_CANCELLATION';

export type RefundStatus =
    | 'REFUND_PENDING'
    | 'REFUND_PROCESSING'
    | 'REFUND_COMPLETED'
    | 'REFUND_FAILED';

export interface DonorRefundItem {
    donationId: string;
    donorName: string;
    donorEmail?: string;
    amount: number;
    processingFee: number;
    refundableAmount: number;
    status: RefundStatus;
    updatedAt?: string;
    gatewayReference?: string;
}

export interface RefundSummary {
    totalCollected: number;
    totalGatewayFees: number;
    totalNetRefundable: number;
    donors: DonorRefundItem[];
    allRefundsCompleted: boolean;
}

export interface ReportedClaim {
    claimText: string;
    source: string; // e.g. "Actualización de campaña #2", "Descripción"
    evidenceComparison: string; // Official record comparison
    isProtectedCriticism: boolean;
}

export interface EvidenceSnapshot {
    campaignId: string;
    capturedAt: string;
    capturedBy: string;
    campaignTitle: string;
    campaignDescription: string;
    campaignCategory: string;
    campaignGoal: number;
    currentAmount: number;
    donorCount: number;
    campaignStatus: string;
    medicalVerificationStatus?: string;
    withdrawalStatus?: string;
    termsVersionAccepted?: string;
    termsAcceptedAt?: string;
    officialRecordsSummary: {
        donationsRegisteredAmount: number;
        verifiedDisbursedAmount: number;
        pendingWithdrawalAmount: number;
        officialPlatformNotes: string;
    };
    reportedClaims: ReportedClaim[];
}

export interface AuditLogEntry {
    timestamp: string;
    action: string;
    performedBy: string;
    details: string;
}

export interface FormalNotification {
    identificationOfSubject: string;
    descriptionOfFalseClaims: string;
    officialEvidenceContrast: string;
    infringedTermsClause: string;
    adoptedMeasure: string;
    defenseRightNotice: string;
    fundsAndRefundsDestination: string;
    legalReservation: string;
    generatedAt: string;
}

export interface ComplianceCase {
    id?: string;
    campaignId: string;
    campaignTitle: string;
    organizerId: string;
    organizerName: string;
    organizerEmail: string;
    reporterId?: string;
    reporterName?: string;
    reporterEmail?: string;
    reportReason: string;
    reportedCategory: 'FALSE_FUNDS' | 'FALSE_PROCESS' | 'FALSE_WITHDRAWAL' | 'MANIPULATED_INFO' | 'OTHER';
    reportedAt: any;
    status: ComplianceCaseStatus;
    evidenceSnapshot?: EvidenceSnapshot;
    userResponseDeadline?: string;
    userResponseText?: string;
    userRespondedAt?: string;
    decision?: {
        action: ComplianceAction;
        rationale: string;
        decidedBy: string;
        decidedAt: string;
        termsArticleApplied: string;
    };
    formalNotification?: FormalNotification;
    refundSummary?: RefundSummary;
    auditTrail: AuditLogEntry[];
}

/**
 * Evaluates whether a statement is protected criticism vs actionable false factual assertion.
 * General rule:
 * - Dissatisfaction, delays complaints, opinion on customer support, expression of frustration = PROTECTED.
 * - Asserting false amounts, claiming non-existent withholding of non-collected funds, falsifying bank transfers = ACTIONABLE.
 */
export const evaluateClaimType = (claimText: string): { isProtected: boolean; category: 'CRITICISM' | 'FACTUAL_ASSERTION'; rationale: string } => {
    const textLower = claimText.toLowerCase();

    // Subjective criticism / dissatisfaction keywords
    const criticismKeywords = [
        'lento', 'demoran', 'no me gusta', 'mala atención', 'pesimo', 'pésimo',
        'burocracia', 'molesto', 'frustrado', 'inconformidad', 'queja', 'servicio al cliente',
        'no responden rápido', 'complicado el proceso'
    ];

    // Explicit false factual claims indicators (funds theft, fabricated balance, non-existent transfers)
    const falseFactKeywords = [
        'se quedaron con mi dinero', 'robaron', 'desaparecieron los fondos',
        'tienen $', 'no quieren entregar los $', 'el dinero ya llegó al banco y no lo dan',
        'unidos ec cobra comisiones ocultas', 'desembolsaron a otra persona'
    ];

    const isFactualAccusation = falseFactKeywords.some(kw => textLower.includes(kw));
    const isSubjectiveCritique = criticismKeywords.some(kw => textLower.includes(kw));

    if (isFactualAccusation) {
        return {
            isProtected: false,
            category: 'FACTUAL_ASSERTION',
            rationale: 'Aseveración de hecho susceptible de contrastación objetiva contra los registros bancarios y de auditoría de la plataforma.'
        };
    }

    if (isSubjectiveCritique) {
        return {
            isProtected: true,
            category: 'CRITICISM',
            rationale: 'Crítica subjetiva, queja legítima o manifestación de disconformidad protegida por la Sección 6.2 de los Términos.'
        };
    }

    return {
        isProtected: false,
        category: 'FACTUAL_ASSERTION',
        rationale: 'Declaración que requiere cotejo probatorio individual con los registros del sistema.'
    };
};

/**
 * Strict mathematical refund calculation:
 * Monto Disponible Devolución = Monto Recaudado - Comisiones Pasarela No Recuperables.
 * No arbitrary platform fines or legal fees deducted.
 */
export const calculateCampaignRefunds = (
    donations: Array<{ id: string; donorName: string; donorEmail?: string; amount: number }>,
    gatewayFeePercentage: number = 0.05 // Standard gateway commission (e.g. 5%)
): RefundSummary => {
    let totalCollected = 0;
    let totalGatewayFees = 0;
    let totalNetRefundable = 0;

    const donors: DonorRefundItem[] = donations.map((d) => {
        const amt = Number(d.amount) || 0;
        const fee = Math.round(amt * gatewayFeePercentage * 100) / 100;
        const net = Math.max(0, Math.round((amt - fee) * 100) / 100);

        totalCollected += amt;
        totalGatewayFees += fee;
        totalNetRefundable += net;

        return {
            donationId: d.id,
            donorName: d.donorName || 'Donante Anónimo',
            donorEmail: d.donorEmail || '',
            amount: amt,
            processingFee: fee,
            refundableAmount: net,
            status: 'REFUND_PENDING',
            updatedAt: new Date().toISOString()
        };
    });

    return {
        totalCollected: Math.round(totalCollected * 100) / 100,
        totalGatewayFees: Math.round(totalGatewayFees * 100) / 100,
        totalNetRefundable: Math.round(totalNetRefundable * 100) / 100,
        donors,
        allRefundsCompleted: donors.length === 0
    };
};

/**
 * Generates formal 8-point notification required for due process.
 */
export const generate8PointNotification = (
    organizerName: string,
    campaignTitle: string,
    falseClaimsSummary: string,
    officialRecordsComparison: string,
    action: ComplianceAction,
    termsClause: string = 'Sección 6 (Integridad, Conducta y Uso Responsable)',
    fundsDestination: string
): FormalNotification => {
    const actionSpanish = {
        'NO_ACTION': 'Archivo del caso sin sanción',
        'FORMAL_WARNING': 'Amonestación formal y solicitud de cese de conducta',
        'RECTIFICATION_REQUEST': 'Requerimiento de rectificación pública en plazo de 48 horas',
        'TEMPORARY_SUSPENSION': 'Suspensión preventiva cautelar de la campaña',
        'PERMANENT_CANCELLATION': 'Cancelación y cierre definitivo de la campaña con restitución de fondos'
    }[action] || action;

    return {
        identificationOfSubject: `Organizador responsable: ${organizerName} | Campaña: "${campaignTitle}"`,
        descriptionOfFalseClaims: falseClaimsSummary,
        officialEvidenceContrast: officialRecordsComparison,
        infringedTermsClause: `${termsClause} de los Términos y Condiciones vigentes aceptados contractualmente al crear la campaña.`,
        adoptedMeasure: actionSpanish,
        defenseRightNotice: `El organizador dispone de un plazo de cuarenta y ocho (48) horas hábiles para presentar sus descargos, rectificaciones o comprobantes a través del canal oficial de soporte de Unidos EC antes de la firmeza administrativa.`,
        fundsAndRefundsDestination: fundsDestination,
        legalReservation: `Unidos EC se reserva expresamente el ejercicio de todas las acciones civiles, comerciales o penales que en derecho correspondan por los daños reputacionales o materiales derivados de declaraciones calumniosas o fraudulentas.`,
        generatedAt: new Date().toISOString()
    };
};

/**
 * Create a new compliance report (from user or internal audit)
 */
export const createComplianceReport = async (
    data: {
        campaignId: string;
        campaignTitle: string;
        organizerId: string;
        organizerName: string;
        organizerEmail: string;
        reporterId?: string;
        reporterName?: string;
        reporterEmail?: string;
        reportReason: string;
        reportedCategory: 'FALSE_FUNDS' | 'FALSE_PROCESS' | 'FALSE_WITHDRAWAL' | 'MANIPULATED_INFO' | 'OTHER';
    }
): Promise<string> => {
    const docRef = await addDoc(collection(db, 'compliance_cases'), {
        ...data,
        reportedAt: serverTimestamp(),
        status: 'REPORTED',
        auditTrail: [
            {
                timestamp: new Date().toISOString(),
                action: 'CASE_REPORTED',
                performedBy: data.reporterEmail || 'Usuario de plataforma',
                details: `Reporte registrado bajo la categoría ${data.reportedCategory}. Razón: ${data.reportReason}`
            }
        ]
    });

    // Also register in global compliance audit log
    await addDoc(collection(db, 'compliance_audit_logs'), {
        caseId: docRef.id,
        campaignId: data.campaignId,
        action: 'REPORT_CREATED',
        timestamp: serverTimestamp(),
        details: `Nuevo caso de cumplimiento creado para la campaña ${data.campaignTitle}`
    });

    return docRef.id;
};

/**
 * Captures an immutable snapshot of campaign data & evidence
 */
export const captureAndSaveEvidenceSnapshot = async (
    caseId: string,
    campaignId: string,
    performedBy: string,
    reportedClaims: ReportedClaim[],
    officialNotes: string = ''
): Promise<EvidenceSnapshot> => {
    const campRef = doc(db, 'campaigns', campaignId);
    const campSnap = await getDoc(campRef);

    if (!campSnap.exists()) {
        throw new Error('Campaña no encontrada para captura de evidencia');
    }

    const c = campSnap.data();

    // Fetch actual donations count and total
    const donationsRef = collection(db, 'campaigns', campaignId, 'donations');
    const donSnap = await getDocs(donationsRef);
    let totalDonated = 0;
    donSnap.forEach((doc) => {
        totalDonated += Number(doc.data().amount) || 0;
    });

    const snapshot: EvidenceSnapshot = {
        campaignId,
        capturedAt: new Date().toISOString(),
        capturedBy: performedBy,
        campaignTitle: c.title || '',
        campaignDescription: c.description || '',
        campaignCategory: c.category || '',
        campaignGoal: c.goal || 0,
        currentAmount: totalDonated || c.currentAmount || 0,
        donorCount: donSnap.size || c.donorCount || 0,
        campaignStatus: c.status || 'active',
        medicalVerificationStatus: c.medicalDocumentStatus || 'N/A',
        withdrawalStatus: c.withdrawalStatus || 'Sin solicitud activa',
        termsVersionAccepted: c.termsVersion || 'v1.0',
        termsAcceptedAt: c.termsAcceptedAt || 'Fecha no registrada',
        officialRecordsSummary: {
            donationsRegisteredAmount: totalDonated,
            verifiedDisbursedAmount: c.disbursedAmount || 0,
            pendingWithdrawalAmount: c.pendingWithdrawalAmount || 0,
            officialPlatformNotes: officialNotes || 'Verificación en base a pasarela de pagos y balance contable oficial.'
        },
        reportedClaims
    };

    const caseRef = doc(db, 'compliance_cases', caseId);
    await updateDoc(caseRef, {
        evidenceSnapshot: snapshot,
        status: 'EVIDENCE_COLLECTION',
        auditTrail: [
            ...(await (async () => {
                const current = (await getDoc(caseRef)).data()?.auditTrail || [];
                return current;
            })()),
            {
                timestamp: new Date().toISOString(),
                action: 'EVIDENCE_SNAPSHOT_CAPTURED',
                performedBy,
                details: `Snapshot inmutable guardado con ${reportedClaims.length} declaraciones contrastadas y balance de $${totalDonated}.`
            }
        ]
    });

    return snapshot;
};

/**
 * Updates stage in the due process flow
 */
export const advanceCaseStage = async (
    caseId: string,
    nextStatus: ComplianceCaseStatus,
    performedBy: string,
    notes: string,
    extraFields: Record<string, any> = {}
): Promise<void> => {
    const caseRef = doc(db, 'compliance_cases', caseId);
    const snap = await getDoc(caseRef);
    if (!snap.exists()) throw new Error('Caso no existe');

    const currentAudit = snap.data().auditTrail || [];

    await updateDoc(caseRef, {
        status: nextStatus,
        ...extraFields,
        auditTrail: [
            ...currentAudit,
            {
                timestamp: new Date().toISOString(),
                action: `STAGE_CHANGED_TO_${nextStatus}`,
                performedBy,
                details: notes
            }
        ]
    });

    await addDoc(collection(db, 'compliance_audit_logs'), {
        caseId,
        action: `STAGE_CHANGED_TO_${nextStatus}`,
        timestamp: serverTimestamp(),
        performedBy,
        notes
    });
};

/**
 * Resolves a compliance case with a formal sanction or dismissal.
 * Directly enforces campaign state:
 * - TEMPORARY_SUSPENSION: updates campaign.status = 'suspended'
 * - PERMANENT_CANCELLATION: updates campaign.status = 'cancelled', runs donor refund calculation.
 */
export const resolveComplianceCase = async (
    caseId: string,
    action: ComplianceAction,
    rationale: string,
    performedBy: string,
    falseClaimsSummary: string = '',
    officialRecordsComparison: string = ''
): Promise<void> => {
    const caseRef = doc(db, 'compliance_cases', caseId);
    const caseSnap = await getDoc(caseRef);
    if (!caseSnap.exists()) throw new Error('Caso no existe');

    const caseData = caseSnap.data() as ComplianceCase;
    const campaignRef = doc(db, 'campaigns', caseData.campaignId);

    let refundSummary: RefundSummary | undefined = undefined;
    let nextCaseStatus: ComplianceCaseStatus = 'RESOLVED_NO_ACTION';
    let fundsDestinationText = 'No aplica cambio en los fondos de la campaña.';

    if (action === 'TEMPORARY_SUSPENSION') {
        nextCaseStatus = 'RESOLVED_SUSPENSION';
        fundsDestinationText = 'Fondos retenidos preventivamente en custodia transitoria hasta resolución definitiva o rectificación.';
        await updateDoc(campaignRef, {
            status: 'suspended',
            suspendedAt: serverTimestamp(),
            suspensionReason: rationale
        });
    } else if (action === 'PERMANENT_CANCELLATION') {
        nextCaseStatus = 'RESOLVED_CANCELLATION';

        // Retrieve all donations to calculate refunds strictly
        const donationsRef = collection(db, 'campaigns', caseData.campaignId, 'donations');
        const donSnap = await getDocs(donationsRef);
        const donationsList: Array<{ id: string; donorName: string; donorEmail?: string; amount: number }> = [];
        donSnap.forEach((doc) => {
            const d = doc.data();
            donationsList.push({
                id: doc.id,
                donorName: d.donorName || 'Anónimo',
                donorEmail: d.donorEmail,
                amount: Number(d.amount) || 0
            });
        });

        refundSummary = calculateCampaignRefunds(donationsList, 0.05);
        fundsDestinationText = `Campaña cancelada. Fondos en proceso de devolución a donantes según Sección 6.4: Total recaudado $${refundSummary.totalCollected}, comisiones pasarela descontadas $${refundSummary.totalGatewayFees}, monto neto a reintegrar $${refundSummary.totalNetRefundable} a ${refundSummary.donors.length} donantes.`;

        await updateDoc(campaignRef, {
            status: 'cancelled',
            cancelledAt: serverTimestamp(),
            cancellationReason: rationale,
            refundSummary
        });
    } else if (action === 'FORMAL_WARNING') {
        nextCaseStatus = 'RESOLVED_WARNING';
    } else if (action === 'RECTIFICATION_REQUEST') {
        nextCaseStatus = 'RESOLVED_RECTIFICATION';
    }

    const formalNotification = generate8PointNotification(
        caseData.organizerName,
        caseData.campaignTitle,
        falseClaimsSummary || rationale,
        officialRecordsComparison || 'Contrastado con los registros bancarios y de pasarela de Unidos EC.',
        action,
        'Sección 6 (Integridad, Conducta y Uso Responsable)',
        fundsDestinationText
    );

    const currentAudit = caseData.auditTrail || [];
    const decisionData = {
        action,
        rationale,
        decidedBy: performedBy,
        decidedAt: new Date().toISOString(),
        termsArticleApplied: 'Sección 6.3 y 6.4 de Términos y Condiciones'
    };

    await updateDoc(caseRef, {
        status: nextCaseStatus,
        decision: decisionData,
        formalNotification,
        ...(refundSummary ? { refundSummary } : {}),
        auditTrail: [
            ...currentAudit,
            {
                timestamp: new Date().toISOString(),
                action: `CASE_RESOLVED_AS_${action}`,
                performedBy,
                details: `Resolución final adoptada: ${action}. Motivo: ${rationale}`
            }
        ]
    });

    await addDoc(collection(db, 'compliance_audit_logs'), {
        caseId,
        campaignId: caseData.campaignId,
        action: `DECISION_${action}`,
        timestamp: serverTimestamp(),
        performedBy,
        rationale
    });
};

/**
 * Updates individual donor refund status
 */
export const updateDonorRefundStatus = async (
    caseId: string,
    campaignId: string,
    donationId: string,
    status: RefundStatus,
    gatewayRef?: string
): Promise<void> => {
    const caseRef = doc(db, 'compliance_cases', caseId);
    const caseSnap = await getDoc(caseRef);
    if (!caseSnap.exists()) return;

    const caseData = caseSnap.data() as ComplianceCase;
    if (!caseData.refundSummary) return;

    const updatedDonors = caseData.refundSummary.donors.map(d => {
        if (d.donationId === donationId) {
            return {
                ...d,
                status,
                gatewayReference: gatewayRef || d.gatewayReference,
                updatedAt: new Date().toISOString()
            };
        }
        return d;
    });

    const allCompleted = updatedDonors.every(d => d.status === 'REFUND_COMPLETED');

    const newSummary: RefundSummary = {
        ...caseData.refundSummary,
        donors: updatedDonors,
        allRefundsCompleted: allCompleted
    };

    await updateDoc(caseRef, {
        refundSummary: newSummary
    });

    // Also sync to campaign document
    const campRef = doc(db, 'campaigns', campaignId);
    await updateDoc(campRef, {
        refundSummary: newSummary
    });
};
