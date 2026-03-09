import { Appointment, AppointmentStage } from '../types';

export interface RecordMatch {
    appointment: Appointment;
    matchType: 'name' | 'phone' | 'email';
    confidence: 'high' | 'medium' | 'low';
}

export interface ActivationHistory {
    originalAgent: string;
    originalStage: AppointmentStage;
    originalDate: string;
    transferAgent?: string;
    transferDate?: string;
    transferToAE?: string;
    daysSinceOriginal: number;
    daysToActivation?: number;
    isCompetitiveActivation: boolean;
    fullTimeline: string;
}

/**
 * Search for existing appointment records by name, phone, or email
 * Returns matches with confidence levels and full history
 */
export const searchRecordMatches = (
    query: string,
    appointments: Appointment[],
    currentUserId: string
): RecordMatch[] => {
    if (!query || query.trim().length < 2) return [];

    const lowerQuery = query.toLowerCase().trim();
    const matches: RecordMatch[] = [];

    appointments.forEach(appt => {
        // Search by name
        if (appt.name.toLowerCase().includes(lowerQuery)) {
            matches.push({
                appointment: appt,
                matchType: 'name',
                confidence: appt.name.toLowerCase() === lowerQuery ? 'high' : 'medium'
            });
            return;
        }

        // Search by phone
        const cleanPhone = appt.phone?.replace(/\D/g, '') || '';
        const cleanQuery = lowerQuery.replace(/\D/g, '');
        if (cleanPhone && cleanQuery && cleanPhone.includes(cleanQuery)) {
            matches.push({
                appointment: appt,
                matchType: 'phone',
                confidence: cleanPhone === cleanQuery ? 'high' : 'medium'
            });
            return;
        }

        // Search by email
        if (appt.email?.toLowerCase().includes(lowerQuery)) {
            matches.push({
                appointment: appt,
                matchType: 'email',
                confidence: appt.email?.toLowerCase() === lowerQuery ? 'high' : 'medium'
            });
        }
    });

    // Sort by confidence and recency
    return matches.sort((a, b) => {
        if (a.confidence !== b.confidence) {
            return a.confidence === 'high' ? -1 : 1;
        }
        return new Date(b.appointment.createdAt || '').getTime() - 
               new Date(a.appointment.createdAt || '').getTime();
    });
};

/**
 * Build activation history for an appointment
 * Shows the full journey from initial onboard/transfer to potential activation
 */
export const buildActivationHistory = (
    appointment: Appointment,
    activatingUserId: string,
    allAppointments: Appointment[],
    allUsers?: any[]
): ActivationHistory | null => {
    // Check if this is being activated by someone other than who originally onboarded
    const originalUserId = appointment.originalUserId || appointment.userId;
    const isCompetitiveActivation = originalUserId !== activatingUserId;
    
    if (!isCompetitiveActivation) {
        // Same user, not competitive
        return null;
    }

    const now = Date.now();
    const createdTime = new Date(appointment.createdAt || new Date()).getTime();
    const daysSinceOriginal = Math.floor((now - createdTime) / (1000 * 60 * 60 * 24));

    let fullTimeline = '';
    let transferAgent: string | undefined;
    let transferDate: string | undefined;
    let transferToAE: string | undefined;
    let daysToActivation: number | undefined;

    // Find the original user's name
    const originalUserName = allUsers?.find(u => u.id === originalUserId)?.name || 'Unknown Agent';

    // Check if this was transferred
    if (appointment.stage === AppointmentStage.TRANSFERRED || appointment.originalOnboardType === 'transfer') {
        transferToAE = appointment.aeName || appointment.originalAeName;
        transferDate = appointment.nurtureDate;
        
        if (transferDate) {
            const transferTime = new Date(transferDate).getTime();
            daysToActivation = Math.floor((now - transferTime) / (1000 * 60 * 60 * 24));
            fullTimeline = `Originally onboarded by ${originalUserName} on ${new Date(createdTime).toLocaleDateString()} → Transferred to ${transferToAE} on ${new Date(transferTime).toLocaleDateString()} (${daysToActivation} days ago)`;
        } else {
            fullTimeline = `Originally onboarded by ${originalUserName} on ${new Date(createdTime).toLocaleDateString()} → Transferred to ${transferToAE} (pending details)`;
        }
    } else if (appointment.stage === AppointmentStage.ONBOARDED) {
        fullTimeline = `Onboarded by ${originalUserName} on ${new Date(createdTime).toLocaleDateString()} (${daysSinceOriginal} days ago)`;
    }

    return {
        originalAgent: originalUserName,
        originalStage: appointment.stage,
        originalDate: new Date(createdTime).toLocaleDateString(),
        transferAgent,
        transferDate,
        transferToAE,
        daysSinceOriginal,
        daysToActivation,
        isCompetitiveActivation: true,
        fullTimeline
    };
};

/**
 * Format activation history into a display-friendly string
 */
export const formatActivationHistory = (history: ActivationHistory): string => {
    if (!history.isCompetitiveActivation) {
        return '';
    }

    const lines: string[] = [
        '🎯 RECORD MATCH FOUND',
        history.fullTimeline,
        `📊 Days elapsed: ${history.daysSinceOriginal}`
    ];

    if (history.daysToActivation !== undefined) {
        lines.push(`⚡ Days from transfer to your activation: ${history.daysToActivation}`);
    }

    return lines.join('\n');
};

/**
 * Get activation statistics for competitive insights
 * Shows which partners YOU activated that were originally onboarded by others
 */
export const getActivationStats = (
    appointments: Appointment[],
    currentUserId: string,
    allUsers?: any[]
) => {
    const activated = appointments.filter(a => 
        a.stage === AppointmentStage.ACTIVATED && 
        (a.originalUserId || a.userId) !== currentUserId
    );

    const stats = {
        totalDominatedActivations: activated.length,
        avgDaysToDomination: 0,
        originatingAgents: {} as Record<string, number>,
        sameDay: 0,
        withinWeek: 0,
        withinMonth: 0,
    };

    if (activated.length === 0) return stats;

    let totalDays = 0;

    activated.forEach(appt => {
        const originalUserId = appt.originalUserId || appt.userId;
        const originalAgent = allUsers?.find(u => u.id === originalUserId)?.name || 'Unknown Agent';
        stats.originatingAgents[originalAgent] = (stats.originatingAgents[originalAgent] || 0) + 1;

        const createdTime = new Date(appt.createdAt || new Date()).getTime();
        const activatedTime = new Date(appt.activatedAt || new Date()).getTime();
        const daysDiff = Math.floor((activatedTime - createdTime) / (1000 * 60 * 60 * 24));

        totalDays += daysDiff;

        if (daysDiff === 0) stats.sameDay++;
        else if (daysDiff <= 7) stats.withinWeek++;
        else if (daysDiff <= 30) stats.withinMonth++;
    });

    stats.avgDaysToDomination = Math.round(totalDays / activated.length);

    return stats;
};
