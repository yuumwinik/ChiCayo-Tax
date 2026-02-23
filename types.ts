
export enum AppointmentStage {
  PENDING = 'PENDING',
  RESCHEDULED = 'RESCHEDULED',
  NO_SHOW = 'NO_SHOW',
  ONBOARDED = 'ONBOARDED',
  DECLINED = 'DECLINED',
  TRANSFERRED = 'TRANSFERRED',
  ACTIVATED = 'ACTIVATED',
}

export type View = 'dashboard' | 'calendar' | 'onboarded' | 'earnings-full' | 'admin-dashboard' | 'profile' | 'user-analytics' | 'education';
export type UserRole = 'agent' | 'admin';
export type AdminView = 'overview' | 'deepdive' | 'cycles' | 'auditlog' | 'referral-wins';
export type AvatarId = 'initial' | 'robot' | 'alien' | 'ghost' | 'fire' | 'zap' | 'crown' | 'star' | 'smile';

export const ACCOUNT_EXECUTIVES = ['Joshua', 'Jorge', 'Andrew'];

export const AE_COLORS: Record<string, string> = {
  'Joshua': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  'Jorge': 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
  'Andrew': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
};

export interface GlobalSettings {
  id: string;
  commission_standard: number;
  commission_self: number;
  commission_referral: number;
  updated_at: string;
}

export interface NotificationSettings {
  enabled: boolean;
  thresholdMinutes: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarId?: AvatarId;
  createdAt?: string;
  hasSeenTutorial?: boolean;
  notificationSettings?: NotificationSettings;
  preferredDialer?: string;
  dismissedCycleIds?: string[];
  showFailedSection?: boolean;
}

export interface PayCycle {
  id: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'upcoming' | 'completed';
}

export interface ReferralHistoryEntry {
  id: string;
  date: string;
  count: number;
  incentiveId: string;
}

export interface Appointment {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  scheduledAt: string;
  stage: AppointmentStage;
  notes?: string;
  createdAt: string;
  earnedAmount?: number;
  type?: 'appointment' | 'transfer';
  aeName?: string;
  referralCount?: number;
  lastReferralAt?: string;
  referralHistory?: ReferralHistoryEntry[];
  nurtureDate?: string;
  onboardedAt?: string;
  activatedAt?: string;
  originalUserId?: string;
  originalOnboardType?: 'self' | 'transfer';
  originalAeName?: string;
}

export interface Incentive {
  id: string;
  userId: string;
  amountCents: number;
  label: string;
  appliedCycleId?: string;
  createdAt: string;
  ruleId?: string;
  relatedAppointmentId?: string;
}

export interface IncentiveRule {
  id: string;
  userId: string;
  type: 'one_time' | 'per_deal' | 'up_for_grabs';
  valueCents: number;
  label: string;
  startTime?: string;
  endTime?: string;
  targetCount?: number;
  currentCount?: number;
  isActive: boolean;
  createdAt: string;
}

export interface EarningWindow {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  totalCents: number;
  onboardedCount: number;
  isClosed: boolean;
  incentives?: Incentive[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: UserRole;
  status: string;
  onboardedCount: number;
  totalEarnings: number;
  lastActive: string;
  avatarId?: AvatarId;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface DashboardStats {
  totalAppointments: number;
  totalOnboarded: number;
  totalPending: number;
  totalFailed: number;
  totalRescheduled: number;
  conversionRate: string;
  aePerformance: Record<string, number>;
}

export const STAGE_LABELS: Record<AppointmentStage, string> = {
  [AppointmentStage.PENDING]: 'Upcoming',
  [AppointmentStage.RESCHEDULED]: 'Rescheduled',
  [AppointmentStage.NO_SHOW]: 'Failed to Show',
  [AppointmentStage.ONBOARDED]: 'Onboarded',
  [AppointmentStage.DECLINED]: 'Declined',
  [AppointmentStage.TRANSFERRED]: 'Transferred',
  [AppointmentStage.ACTIVATED]: 'Activated',
};

export const STAGE_COLORS: Record<AppointmentStage, string> = {
  [AppointmentStage.PENDING]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  [AppointmentStage.RESCHEDULED]: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  [AppointmentStage.NO_SHOW]: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  [AppointmentStage.ONBOARDED]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  [AppointmentStage.DECLINED]: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  [AppointmentStage.TRANSFERRED]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  [AppointmentStage.ACTIVATED]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
};
