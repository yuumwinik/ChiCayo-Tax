import { Appointment, AppointmentStage } from '../types';

/**
 * Analyzes appointment frequency by hour to determine the "Power Hour" 🚀
 */
export function calculatePeakTime(appointments: Appointment[]): { hour: number; count: number; label: string } {
    const onboarded = appointments.filter(a => a.stage === AppointmentStage.ONBOARDED);
    const hourCounts: Record<number, number> = {};

    onboarded.forEach(a => {
        const date = new Date(a.onboardedAt || a.scheduledAt);
        const hour = date.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    let peakHour = 9;
    let maxCount = 0;

    Object.entries(hourCounts).forEach(([hour, count]) => {
        if (count > maxCount) {
            maxCount = count;
            peakHour = parseInt(hour);
        }
    });

    const ampm = peakHour >= 12 ? 'PM' : 'AM';
    const hourText = peakHour % 12 || 12;

    return {
        hour: peakHour,
        count: maxCount,
        label: `${hourText}:00 ${ampm}`
    };
}

/**
 * Detects statistical anomalies in agent performance
 */
export function detectAnomalies(appointments: Appointment[]): string[] {
    const anomalies: string[] = [];
    const onboarded = appointments.filter(a => a.stage === AppointmentStage.ONBOARDED);

    // 1. Late Night Activity Detect
    const lateNight = onboarded.filter(a => {
        const h = new Date(a.onboardedAt || a.scheduledAt).getHours();
        return h >= 22 || h <= 5;
    });
    if (lateNight.length > 5) {
        anomalies.push(`${lateNight.length} onboards recorded during late-night hours (10PM-5AM).`);
    }

    // 2. Velocity Anomaly (Too Fast)
    const instantOnboards = onboarded.filter(a => {
        const diff = new Date(a.onboardedAt || a.scheduledAt).getTime() - new Date(a.createdAt).getTime();
        return diff < 1000 * 60 * 5; // Less than 5 mins
    });
    if (instantOnboards.length > 3) {
        anomalies.push(`${instantOnboards.length} deals moved from lead to onboard in under 5 minutes.`);
    }

    return anomalies;
}

/**
 * Predicts the likelihood of conversion based on the appointment hour 🎯
 */
export function calculateSuccessProbability(appointmentHour: number, appointments: Appointment[]): { score: number; label: string; color: string } {
    const stats = calculatePeakTime(appointments);
    const peakHour = stats.hour;

    // Difference from peak hour (closer is better)
    const diff = Math.abs(appointmentHour - peakHour);

    let score = 85; // Base high score
    if (diff > 2) score -= 15;
    if (diff > 4) score -= 20;
    if (appointmentHour < 8 || appointmentHour > 19) score -= 25; // Business hours check

    score = Math.max(score, 15);

    if (score >= 80) return { score, label: 'High', color: 'text-emerald-500' };
    if (score >= 50) return { score, label: 'Medium', color: 'text-amber-500' };
    return { score, label: 'Low', color: 'text-rose-500' };
}

/**
 * Generates proactive coaching habits based on team data 🏅
 */
export function generateCoachingInsights(appointments: Appointment[]): string[] {
    const insights: string[] = [];
    const onboarded = appointments.filter(a => a.stage === AppointmentStage.ONBOARDED);

    if (onboarded.length > 0) {
        const transfers = appointments.filter(a => a.stage === AppointmentStage.TRANSFERRED || a.stage === AppointmentStage.ONBOARDED);
        const avgResponseTime = transfers.reduce((sum, a) => {
            const diff = new Date(a.onboardedAt || a.scheduledAt).getTime() - new Date(a.createdAt).getTime();
            return sum + diff;
        }, 0) / transfers.length;

        if (avgResponseTime < 1000 * 60 * 60 * 2) {
            insights.push("You convert 20% higher when following up within 2 hours. Keep that speed!");
        } else {
            insights.push("Focus on your transfer queue this morning—speed to lead is your biggest growth lever.");
        }
    }

    const peak = calculatePeakTime(appointments);
    insights.push(`Your team is most lethal at ${peak.label}. Schedule your heavy hitters during this window.`);

    return insights;
}
