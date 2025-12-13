
export enum AppointmentStage {
  PENDING = 'PENDING',
  RESCHEDULED = 'RESCHEDULED',
  NO_SHOW = 'NO_SHOW',
  ONBOARDED = 'ONBOARDED',
  DECLINED = 'DECLINED',
  TRANSFERRED = 'TRANSFERRED', // New Stage
}

export type View = 'dashboard' | 'calendar' | 'onboarded' | 'earnings-full' | 'admin-dashboard' | 'profile' | 'user-analytics';

export type UserRole = 'agent' | 'admin';

export type AdminView = 'overview' | 'analytics' | 'cycles' | 'audit';

export type AvatarId = 'initial' | 'robot' | 'alien' | 'ghost' | 'fire' | 'zap' | 'crown' | 'star' | 'smile';

export const ACCOUNT_EXECUTIVES = ['Joshua', 'Jorge', 'Andrew'];

export const AE_COLORS: Record<string, string> = {
  'Joshua': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  'Jorge': 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
  'Andrew': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
};

export interface NotificationSettings {
  enabled: boolean;
  thresholdMinutes: number; // 5, 10, 15, 30
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarId?: AvatarId;
  createdAt?: string; // ISO Date string of signup
  hasSeenTutorial?: boolean;
  notificationSettings?: NotificationSettings;
  preferredDialer?: string; // New field for Dialer App Name (e.g. 'Genesys', 'Skype')
}

export interface TeamMember {
  id: string;
  name: string;
  role: UserRole;
  status: 'Online' | 'Offline' | 'Busy';
  onboardedCount: number;
  totalEarnings: number;
  lastActive: string;
  avatarId?: AvatarId;
}

export interface PayCycle {
  id: string;
  startDate: string; // ISO
  endDate: string; // ISO
  status: 'active' | 'upcoming' | 'completed';
}

export interface Appointment {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  scheduledAt: string; // ISO String
  stage: AppointmentStage;
  notes?: string;
  createdAt: string;
  earnedAmount?: number; // Cents earned at the time of onboarding
  type?: 'appointment' | 'transfer';
  aeName?: string;
}

export interface EarningWindow {
  id: string;
  userId: string;
  startDate: string; // ISO String
  endDate: string; // ISO String
  totalCents: number;
  onboardedCount: number;
  isClosed: boolean;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'move_stage' | 'login';
  details: string;
  timestamp: string;
  relatedId?: string; // Appointment ID or User ID
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  isSidebarOpen: boolean;
}

export interface DashboardStats {
  totalAppointments: number;
  totalOnboarded: number;
  totalPending: number;
  totalFailed: number;
  totalRescheduled: number;
  conversionRate: string;
  
  // Live Transfer Intelligence
  totalTransfers: number;
  transfersOnboarded: number;
  transfersDeclined: number;
  transferConversionRate: string;
  
  // Appointment -> Transfer Intelligence
  appointmentsTransferred: number;
  apptTransferConversionRate: string;
  
  aePerformance: Record<string, number>; // AE Name -> Onboarded Count
}

export const STAGE_LABELS: Record<AppointmentStage, string> = {
  [AppointmentStage.PENDING]: 'Upcoming',
  [AppointmentStage.RESCHEDULED]: 'Rescheduled',
  [AppointmentStage.NO_SHOW]: 'Failed to Show',
  [AppointmentStage.ONBOARDED]: 'Onboarded',
  [AppointmentStage.DECLINED]: 'Declined',
  [AppointmentStage.TRANSFERRED]: 'Transferred',
};

export const STAGE_COLORS: Record<AppointmentStage, string> = {
  [AppointmentStage.PENDING]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  [AppointmentStage.RESCHEDULED]: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  [AppointmentStage.NO_SHOW]: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  [AppointmentStage.ONBOARDED]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  [AppointmentStage.DECLINED]: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  [AppointmentStage.TRANSFERRED]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
};
