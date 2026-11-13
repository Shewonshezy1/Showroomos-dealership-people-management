/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider, testFirestoreConnection } from '../firebase';
import {
  hasPermission,
  canAccessView,
  ROLE_LABELS,
  Permission,
} from '../auth/permissions';
import {
  resolveOrActivateStaffProfile,
  subscribeAuthorizedCollections,
  createRequestId,
  fsCreateLead,
  fsUpdateLead,
  fsAddBike,
  fsUpdateBike,
  fsCreateBookingAtomic,
  fsCancelBookingAtomic,
  fsRecordPaymentAtomic,
  fsVerifyPaymentAtomic,
  fsReversePaymentAtomic,
  fsDecideDiscountAtomic,
  fsUpdateDeliveryChecklist,
  fsDeliverBookingAtomic,
  fsDecideLeave,
  fsAddLeaveRequest,
  fsMarkAttendance,
  fsAddServiceCard,
  fsUpdateServiceStatus,
  fsAttachAccessoryAtomic,
  fsRemoveAccessoryAtomic,
  fsAddTestRide,
  fsUpdateTestRide,
  fsCreateTradeIn,
  fsDecideTradeIn,
  fsApplyTradeInAtomic,
  fsCreateInvite,
  fsUpdateUserRoleOrStatus,
  fsExportDatabaseBackup,
} from '../services/firestoreShowroomService';
import {
  Bike,
  Booking,
  Employee,
  EmployeeSalary,
  LeaveRequest,
  AttendanceRecord,
  Lead,
  ServiceJobCard,
  UserRole,
  UserSession,
  StaffInvite,
  AuditLogEntry,
  AppView,
  PaymentRecord,
  DeliveryChecklist,
  AttendanceStatus,
  LeaveStatus,
  Accessory,
  TestRideRecord,
  TradeInValuation,
  CallLog,
  LeadPriority,
} from '../types';
import { getTodayDDMMYYYY } from '../utils/formatters';

export type AuthStatus =
  | 'loading'
  | 'unauthenticated'
  | 'active'
  | 'disabled'
  | 'uninvited'
  | 'unverified_email';

export interface ActionResult {
  success: boolean;
  error?: string;
  bookingId?: string;
  leadId?: string;
  id?: string;
}

interface ShowroomContextType {
  // Authentication & Session
  authStatus: AuthStatus;
  authError: string | null;
  pendingAuthEmail: string | null;
  currentUser: UserSession | null;
  signInWithGoogle: () => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
  canView: (view: AppView) => boolean;

  // Navigation & Role
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  currentRole: UserRole;

  // Data Collections (synced from Firestore)
  leads: Lead[];
  bikes: Bike[];
  bookings: Booking[];
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  attendance: AttendanceRecord[];
  serviceJobCards: ServiceJobCard[];
  accessories: Accessory[];
  testRides: TestRideRecord[];
  tradeIns: TradeInValuation[];
  staffUsers: UserSession[];
  staffInvites: StaffInvite[];
  auditLogs: AuditLogEntry[];

  // Error Banner
  operationError: string | null;
  clearOperationError: () => void;

  // Reconciled Metrics
  metrics: {
    activeLeadsCount: number;
    availableBikesCount: number;
    confirmedBookingsCount: number;
    deliveredCount: number;
    verifiedCollectionsLkr: number;
    unverifiedPaymentsLkr: number;
    pendingLeaveRequestsCount: number;
    totalStockValueLkr: number;
    totalPipelineValueLkr: number;
    readyForDeliveryCount: number;
    totalAccessoriesStockValueLkr: number;
    scheduledTestRidesCount: number;
    activeTradeInsCount: number;
  };

  // Lead Actions
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'notes'>) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  addLeadNote: (leadId: string, noteText: string, author?: string) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  convertLeadToBooking: (
    leadId: string,
    bookingDetails: {
      bikeId: string;
      advanceAmountLkr: number;
      paymentReference: string;
      customerNIC: string;
      customerAddress: string;
      discountRequestedLkr?: number;
    }
  ) => Promise<ActionResult>;

  // Bike Actions
  addBike: (bike: Omit<Bike, 'id'>) => Promise<void>;
  updateBike: (id: string, updates: Partial<Bike>) => Promise<void>;

  // Booking & Payment Actions (Atomic + Idempotent)
  createBooking: (bookingData: {
    customerName: string;
    customerPhone: string;
    customerNIC: string;
    customerAddress: string;
    salespersonId?: string;
    bikeId: string;
    discountLkr?: number;
    discountRequestedLkr?: number;
    initialPayment?: {
      amountLkr: number;
      type: PaymentRecord['type'];
      reference: string;
    };
    leadId?: string;
  }) => Promise<ActionResult>;
  cancelBooking: (bookingId: string, reason: string) => Promise<ActionResult>;
  addPaymentToBooking: (
    bookingId: string,
    payment: {
      amountLkr: number;
      type: PaymentRecord['type'];
      reference: string;
    }
  ) => Promise<ActionResult>;
  verifyPayment: (bookingId: string, paymentId: string) => Promise<ActionResult>;
  reversePayment: (bookingId: string, paymentId: string, reason: string) => Promise<ActionResult>;
  decideDiscount: (
    bookingId: string,
    approved: boolean,
    approvedAmountLkr: number
  ) => Promise<ActionResult>;
  updateDeliveryChecklist: (bookingId: string, checklist: Partial<DeliveryChecklist>) => Promise<void>;
  deliverBooking: (bookingId: string) => Promise<ActionResult>;

  // HR Actions
  updateLeaveRequestStatus: (leaveId: string, status: LeaveStatus) => Promise<ActionResult>;
  addLeaveRequest: (request: Omit<LeaveRequest, 'id' | 'status' | 'appliedOn'>) => Promise<void>;
  markAttendance: (employeeId: string, status: AttendanceStatus, notes?: string) => Promise<void>;

  // Service Job Card Actions
  updateServiceStatus: (jobCardId: string, status: ServiceJobCard['status']) => Promise<void>;
  addServiceJobCard: (card: Omit<ServiceJobCard, 'id'>) => Promise<void>;

  // Accessories Actions
  addAccessoryToBooking: (
    bookingId: string,
    accessoryId: string,
    quantity?: number
  ) => Promise<ActionResult>;
  removeAccessoryFromBooking: (bookingId: string, accessoryId: string) => Promise<ActionResult>;

  // Test Ride Actions
  addTestRide: (record: Omit<TestRideRecord, 'id'>) => Promise<void>;
  updateTestRideStatus: (
    id: string,
    status: TestRideRecord['status'],
    rating?: number,
    notes?: string
  ) => Promise<void>;
  convertTestRideToLead: (testRideId: string) => Promise<ActionResult>;

  // Trade-In Actions
  addTradeInValuation: (val: Omit<TradeInValuation, 'id' | 'date'>) => Promise<ActionResult>;
  decideTradeIn: (tradeInId: string, approved: boolean) => Promise<ActionResult>;
  applyTradeInToBooking: (tradeInId: string, bookingId: string) => Promise<ActionResult>;

  // Admin & Identity Actions
  inviteStaff: (
    invite: Omit<StaffInvite, 'id' | 'status' | 'invitedByUid' | 'createdAt'>
  ) => Promise<ActionResult>;
  updateStaffRoleOrStatus: (
    targetUid: string,
    updates: { role?: UserRole; disabled?: boolean }
  ) => Promise<ActionResult>;
  exportDatabaseBackup: () => Promise<Record<string, unknown[]> | null>;

  // Notification Preview Modal (explicitly simulated)
  notificationModal: {
    isOpen: boolean;
    title: string;
    recipientPhone: string;
    recipientName: string;
    message: string;
    channel: 'SMS' | 'WhatsApp';
    purpose: string;
  } | null;
  openNotificationModal: (payload: {
    title: string;
    recipientPhone: string;
    recipientName: string;
    message: string;
    channel?: 'SMS' | 'WhatsApp';
    purpose: string;
  }) => void;
  closeNotificationModal: () => void;

  // UI Selection States
  selectedLeadId: string | null;
  setSelectedLeadId: (id: string | null) => void;
  crmViewMode: 'kanban' | 'list';
  setCrmViewMode: (mode: 'kanban' | 'list') => void;
  addCallLogToLead: (leadId: string, call: Omit<CallLog, 'id' | 'date'>) => Promise<void>;
  updateLeadPriority: (leadId: string, priority: LeadPriority) => Promise<void>;
  markLeadLost: (leadId: string, reason: string) => Promise<void>;
  reassignLead: (leadId: string, salespersonId: string, salespersonName: string) => Promise<void>;
  proformaQuoteLeadId: string | null;
  setProformaQuoteLeadId: (id: string | null) => void;

  selectedBookingId: string | null;
  setSelectedBookingId: (id: string | null) => void;
  selectedBikeId: string | null;
  setSelectedBikeId: (id: string | null) => void;
  printableBookingId: string | null;
  setPrintableBookingId: (id: string | null) => void;
}

const ZERO_SALARY: EmployeeSalary = {
  basicLkr: 0,
  showroomAllowanceLkr: 0,
  salesIncentiveLkr: 0,
  illustrativeDeductionsLkr: 0,
};

const ShowroomContext = createContext<ShowroomContextType | undefined>(undefined);

export const ShowroomProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingAuthEmail, setPendingAuthEmail] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [crmViewMode, setCrmViewMode] = useState<'kanban' | 'list'>('list');
  const [operationError, setOperationError] = useState<string | null>(null);

  // Firestore synced collections (start empty — never pre-populated from localStorage or mock arrays)
  const [leads, setLeads] = useState<Lead[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rawEmployees, setRawEmployees] = useState<Employee[]>([]);
  const [payrollsMap, setPayrollsMap] = useState<Record<string, EmployeeSalary>>({});
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [serviceJobCards, setServiceJobCards] = useState<ServiceJobCard[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [testRides, setTestRides] = useState<TestRideRecord[]>([]);
  const [tradeIns, setTradeIns] = useState<TradeInValuation[]>([]);
  const [staffUsers, setStaffUsers] = useState<UserSession[]>([]);
  const [staffInvites, setStaffInvites] = useState<StaffInvite[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Modal / Drawer selection states
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [proformaQuoteLeadId, setProformaQuoteLeadId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
  const [printableBookingId, setPrintableBookingId] = useState<string | null>(null);
  const [notificationModal, setNotificationModal] = useState<{
    isOpen: boolean;
    title: string;
    recipientPhone: string;
    recipientName: string;
    message: string;
    channel: 'SMS' | 'WhatsApp';
    purpose: string;
  } | null>(null);

  const clearAllInMemoryData = useCallback(() => {
    setLeads([]);
    setBikes([]);
    setBookings([]);
    setRawEmployees([]);
    setPayrollsMap({});
    setLeaveRequests([]);
    setAttendance([]);
    setServiceJobCards([]);
    setAccessories([]);
    setTestRides([]);
    setTradeIns([]);
    setStaffUsers([]);
    setStaffInvites([]);
    setAuditLogs([]);
    setSelectedLeadId(null);
    setSelectedBookingId(null);
    setSelectedBikeId(null);
    setPrintableBookingId(null);
    setProformaQuoteLeadId(null);
    setNotificationModal(null);
  }, []);

  // Firebase Auth listener + authorized collection subscriptions
  useEffect(() => {
    void testFirestoreConnection();
    let unsubCollections: (() => void) | null = null;
    let activeRun = true;

    const unsubAuth = onAuthStateChanged(auth, async fbUser => {
      if (unsubCollections) {
        unsubCollections();
        unsubCollections = null;
      }

      if (!fbUser) {
        if (!activeRun) return;
        setCurrentUser(null);
        setPendingAuthEmail(null);
        clearAllInMemoryData();
        setAuthStatus('unauthenticated');
        return;
      }

      setAuthStatus('loading');
      setPendingAuthEmail(fbUser.email || null);

      const resolution = await resolveOrActivateStaffProfile(fbUser);
      if (!activeRun) return;

      if (resolution.status !== 'active') {
        setCurrentUser(null);
        clearAllInMemoryData();
        setAuthStatus(resolution.status);
        return;
      }

      const profile: UserSession = {
        ...resolution.profile,
        roleLabel: ROLE_LABELS[resolution.profile.role] || resolution.profile.designation,
      };
      setCurrentUser(profile);
      setAuthStatus('active');
      setAuthError(null);

      if (!canAccessView(profile.role, currentView)) {
        setCurrentView('dashboard');
      }

      unsubCollections = subscribeAuthorizedCollections(profile, {
        onLeads: setLeads,
        onBikes: setBikes,
        onBookings: setBookings,
        onEmployees: setRawEmployees,
        onPayrolls: setPayrollsMap,
        onLeaves: setLeaveRequests,
        onAttendance: setAttendance,
        onServiceCards: setServiceJobCards,
        onAccessories: setAccessories,
        onTestRides: setTestRides,
        onTradeIns: setTradeIns,
        onUsers: setStaffUsers,
        onInvites: setStaffInvites,
        onAuditLogs: setAuditLogs,
        onPermissionRevoked: () => {
          setCurrentUser(null);
          clearAllInMemoryData();
          setAuthStatus('disabled');
        },
      });
    });

    return () => {
      activeRun = false;
      if (unsubCollections) unsubCollections();
      unsubAuth();
    };
  }, [clearAllInMemoryData]);

  // Combine employees with confidential payroll ONLY for HR role
  const employees = useMemo<Employee[]>(() => {
    const canReadPayroll = hasPermission(currentUser?.role, 'hr.payroll.read');
    return rawEmployees.map(emp => ({
      ...emp,
      salary: canReadPayroll && payrollsMap[emp.id] ? payrollsMap[emp.id] : ZERO_SALARY,
    }));
  }, [rawEmployees, payrollsMap, currentUser?.role]);

  const signInWithGoogle = async (): Promise<boolean> => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      setAuthError(msg);
      return false;
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return true;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found') {
        setAuthError(
          'Email/Password provider is not enabled in Firebase Authentication Console yet. Use Company Google Sign-In or enable Email/Password in Firebase Console.'
        );
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setAuthError('Invalid staff email or password.');
      } else if (code === 'auth/user-disabled') {
        setAuthError('This staff account has been disabled in Firebase Authentication.');
      } else {
        setAuthError(err instanceof Error ? err.message : 'Sign in failed.');
      }
      return false;
    }
  };

  const sendPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return {
        success: true,
        message: 'If an email/password account exists for that address, a reset link has been sent.',
      };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        return {
          success: false,
          message: 'Email/Password sign-in is not currently enabled in Firebase Console.',
        };
      }
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Password reset request failed.',
      };
    }
  };

  const logout = async (): Promise<void> => {
    clearAllInMemoryData();
    setCurrentUser(null);
    setAuthStatus('unauthenticated');
    setCurrentView('dashboard');
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const can = useCallback(
    (permission: Permission) => hasPermission(currentUser?.role, permission),
    [currentUser?.role]
  );

  const canView = useCallback(
    (view: AppView) => canAccessView(currentUser?.role, view),
    [currentUser?.role]
  );

  const clearOperationError = () => setOperationError(null);

  const guardUserAndPerm = (permission: Permission, label: string): UserSession => {
    if (!currentUser || currentUser.disabled) {
      const msg = 'Authentication required: Active staff session not found.';
      setOperationError(msg);
      throw new Error(msg);
    }
    if (!hasPermission(currentUser.role, permission)) {
      const msg = `Access Denied: Your role (${ROLE_LABELS[currentUser.role]}) does not have permission to ${label}.`;
      setOperationError(msg);
      throw new Error(msg);
    }
    return currentUser;
  };

  // Derived Reconciled Metrics
  const metrics = useMemo(() => {
    const activeLeadsCount = leads.filter(l => l.status !== 'Closed' && l.status !== 'Lost').length;
    const availableBikesCount = bikes.filter(b => b.status === 'Available').length;
    const confirmedBookingsCount = bookings.filter(b => b.status === 'Confirmed').length;
    const deliveredCount = bookings.filter(b => b.status === 'Delivered').length;

    let verifiedCollectionsLkr = 0;
    let unverifiedPaymentsLkr = 0;

    bookings.forEach(booking => {
      if (booking.status !== 'Cancelled') {
        booking.payments.forEach(p => {
          if (p.entryType === 'REVERSAL' || p.status === 'Reversed') return;
          if (p.status === 'Verified') {
            verifiedCollectionsLkr += p.amountLkr;
          } else {
            unverifiedPaymentsLkr += p.amountLkr;
          }
        });
      }
    });

    const pendingLeaveRequestsCount = leaveRequests.filter(l => l.status === 'Pending').length;
    const totalStockValueLkr = bikes.reduce((sum, b) => sum + (b.priceLkr || 0), 0);
    const totalPipelineValueLkr = bookings
      .filter(b => b.status === 'Confirmed')
      .reduce((sum, b) => sum + b.finalPriceLkr, 0);

    const readyForDeliveryCount = bookings.filter(b => {
      if (b.status !== 'Confirmed') return false;
      const verifiedPaid = b.payments
        .filter(p => p.status === 'Verified' && p.entryType !== 'REVERSAL')
        .reduce((sum, p) => sum + p.amountLkr, 0);
      const balance = Math.max(0, b.finalPriceLkr - verifiedPaid);
      return (
        balance === 0 &&
        b.deliveryChecklist.paymentVerified &&
        b.deliveryChecklist.documentsChecked &&
        b.deliveryChecklist.pdiCompleted
      );
    }).length;

    const totalAccessoriesStockValueLkr = accessories.reduce(
      (sum, a) => sum + a.priceLkr * a.stockQuantity,
      0
    );
    const scheduledTestRidesCount = testRides.filter(tr => tr.status === 'Scheduled').length;
    const activeTradeInsCount = tradeIns.filter(
      ti => !ti.appliedBookingId && ti.status !== 'Rejected'
    ).length;

    return {
      activeLeadsCount,
      availableBikesCount,
      confirmedBookingsCount,
      deliveredCount,
      verifiedCollectionsLkr,
      unverifiedPaymentsLkr,
      pendingLeaveRequestsCount,
      totalStockValueLkr,
      totalPipelineValueLkr,
      readyForDeliveryCount,
      totalAccessoriesStockValueLkr,
      scheduledTestRidesCount,
      activeTradeInsCount,
    };
  }, [leads, bikes, bookings, leaveRequests, accessories, testRides, tradeIns]);

  // Lead Actions
  const addLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'notes'>) => {
    try {
      const actor = guardUserAndPerm('crm.write', 'create leads');
      await fsCreateLead(actor, leadData);
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Failed to create lead.');
    }
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    try {
      const actor = guardUserAndPerm('crm.write', 'update leads');
      await fsUpdateLead(actor, id, updates);
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Failed to update lead.');
    }
  };

  const addLeadNote = async (leadId: string, noteText: string, author?: string) => {
    try {
      const actor = guardUserAndPerm('crm.write', 'add lead notes');
      const target = leads.find(l => l.id === leadId);
      if (!target) return;
      const newNote = {
        id: `note-${Date.now()}`,
        date: getTodayDDMMYYYY(),
        author: author || actor.fullName,
        text: noteText,
      };
      await fsUpdateLead(actor, leadId, { notes: [newNote, ...(target.notes || [])] });
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Failed to add note.');
    }
  };

  const deleteLead = async (id: string) => {
    try {
      const actor = guardUserAndPerm('crm.write', 'close leads');
      await fsUpdateLead(actor, id, { status: 'Lost', lostReason: 'Archived by staff' });
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Failed to archive lead.');
    }
  };

  const addCallLogToLead = async (leadId: string, call: Omit<CallLog, 'id' | 'date'>) => {
    try {
      const actor = guardUserAndPerm('crm.write', 'log calls');
      const target = leads.find(l => l.id === leadId);
      if (!target) return;
      const newCallLog: CallLog = {
        ...call,
        id: `cl-${Date.now()}`,
        date: `${getTodayDDMMYYYY()} 11:30`,
      };
      await fsUpdateLead(actor, leadId, {
        callLogs: [newCallLog, ...(target.callLogs || [])],
        notes: [
          {
            id: `note-${Date.now()}`,
            date: getTodayDDMMYYYY(),
            author: call.caller || actor.fullName,
            text: `Call Logged (${call.outcome}): ${call.notes}`,
          },
          ...(target.notes || []),
        ],
      });
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Failed to log call.');
    }
  };

  const updateLeadPriority = async (leadId: string, priority: LeadPriority) => {
    try {
      const actor = guardUserAndPerm('crm.write', 'update lead priority');
      await fsUpdateLead(actor, leadId, { priority });
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Failed to update priority.');
    }
  };

  const markLeadLost = async (leadId: string, reason: string) => {
    try {
      const actor = guardUserAndPerm('crm.write', 'mark lead lost');
      const target = leads.find(l => l.id === leadId);
      await fsUpdateLead(actor, leadId, {
        status: 'Lost',
        lostReason: reason,
        notes: [
          {
            id: `note-${Date.now()}`,
            date: getTodayDDMMYYYY(),
            author: actor.fullName,
            text: `Lead marked as Lost. Reason: ${reason}`,
          },
          ...(target?.notes || []),
        ],
      });
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Failed to mark lead lost.');
    }
  };

  const reassignLead = async (leadId: string, salespersonId: string, salespersonName: string) => {
    try {
      const actor = guardUserAndPerm('crm.write', 'reassign leads');
      const target = leads.find(l => l.id === leadId);
      await fsUpdateLead(actor, leadId, {
        salespersonId,
        salespersonName,
        notes: [
          {
            id: `note-${Date.now()}`,
            date: getTodayDDMMYYYY(),
            author: actor.fullName,
            text: `Lead reassigned to ${salespersonName}.`,
          },
          ...(target?.notes || []),
        ],
      });
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Failed to reassign lead.');
    }
  };

  // Bike Actions
  const addBike = async (bikeData: Omit<Bike, 'id'>) => {
    try {
      const actor = guardUserAndPerm('inventory.bikes.write', 'add showroom motorcycles');
      await fsAddBike(actor, bikeData);
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Failed to add bike.');
    }
  };

  const updateBike = async (id: string, updates: Partial<Bike>) => {
    try {
      const actor = guardUserAndPerm('inventory.bikes.write', 'update showroom motorcycles');
      await fsUpdateBike(actor, id, updates);
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Failed to update bike.');
    }
  };

  // Booking Actions
  const createBooking = async (bookingData: {
    customerName: string;
    customerPhone: string;
    customerNIC: string;
    customerAddress: string;
    salespersonId?: string;
    bikeId: string;
    discountLkr?: number;
    discountRequestedLkr?: number;
    initialPayment?: {
      amountLkr: number;
      type: PaymentRecord['type'];
      reference: string;
    };
    leadId?: string;
  }): Promise<ActionResult> => {
    try {
      const actor = guardUserAndPerm('bookings.create', 'create bookings');
      const discountRequestedLkr =
        bookingData.discountRequestedLkr ?? bookingData.discountLkr ?? 0;

      const { bookingId } = await fsCreateBookingAtomic(actor, {
        requestId: createRequestId('bk'),
        customerName: bookingData.customerName,
        customerPhone: bookingData.customerPhone,
        customerNIC: bookingData.customerNIC,
        customerAddress: bookingData.customerAddress,
        bikeId: bookingData.bikeId,
        discountRequestedLkr,
        leadId: bookingData.leadId,
      });

      // If an initial payment receipt was supplied, record it as PENDING VERIFICATION (never auto-verified!)
      if (bookingData.initialPayment && bookingData.initialPayment.amountLkr > 0) {
        await fsRecordPaymentAtomic(actor, {
          bookingId,
          requestId: createRequestId('pay'),
          amountLkr: bookingData.initialPayment.amountLkr,
          type: bookingData.initialPayment.type,
          reference: bookingData.initialPayment.reference || 'Initial Booking Receipt',
        });
      }

      return { success: true, bookingId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create booking.';
      setOperationError(msg);
      return { success: false, error: msg };
    }
  };

  const convertLeadToBooking = async (
    leadId: string,
    details: {
      bikeId: string;
      advanceAmountLkr: number;
      paymentReference: string;
      customerNIC: string;
      customerAddress: string;
      discountRequestedLkr?: number;
    }
  ): Promise<ActionResult> => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return { success: false, error: 'Lead not found.' };

    return createBooking({
      customerName: lead.customerName,
      customerPhone: lead.phone,
      customerNIC: details.customerNIC || '1990****2031',
      customerAddress: details.customerAddress || `${lead.city}, Sri Lanka`,
      salespersonId: lead.salespersonId,
      bikeId: details.bikeId,
      discountRequestedLkr: details.discountRequestedLkr,
      leadId,
      initialPayment:
        details.advanceAmountLkr > 0
          ? {
              amountLkr: details.advanceAmountLkr,
              type: 'Booking Advance',
              reference: details.paymentReference || 'Initial Deposit Receipt',
            }
          : undefined,
    });
  };

  const cancelBooking = async (bookingId: string, reason: string): Promise<ActionResult> => {
    try {
      const actor = guardUserAndPerm('bookings.cancel', 'cancel bookings');
      await fsCancelBookingAtomic(actor, bookingId, reason);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Cancellation failed.';
      setOperationError(msg);
      return { success: false, error: msg };
    }
  };

  const addPaymentToBooking = async (
    bookingId: string,
    payment: {
      amountLkr: number;
      type: PaymentRecord['type'];
      reference: string;
    }
  ): Promise<ActionResult> => {
    try {
      const actor = guardUserAndPerm('payments.record_unverified', 'record customer payment receipts');
      await fsRecordPaymentAtomic(actor, {
        bookingId,
        requestId: createRequestId('pay'),
        amountLkr: payment.amountLkr,
        type: payment.type,
        reference: payment.reference,
      });
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to record payment.';
      setOperationError(msg);
      return { success: false, error: msg };
    }
  };

  const verifyPayment = async (bookingId: string, paymentId: string): Promise<ActionResult> => {
    try {
      const actor = guardUserAndPerm('payments.verify', 'verify customer payments');
      await fsVerifyPaymentAtomic(actor, bookingId, paymentId);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment verification failed.';
      setOperationError(msg);
      return { success: false, error: msg };
    }
  };

  const reversePayment = async (
    bookingId: string,
    paymentId: string,
    reason: string
  ): Promise<ActionResult> => {
    try {
      const actor = guardUserAndPerm('payments.reverse', 'post payment reversals');
      await fsReversePaymentAtomic(actor, bookingId, paymentId, reason, createRequestId('rev'));
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment reversal failed.';
      setOperationError(msg);
      return { success: false, error: msg };
    }
  };

  const decideDiscount = async (
    bookingId: string,
    approved: boolean,
    approvedAmountLkr: number
  ): Promise<ActionResult> => {
    try {
      const actor = guardUserAndPerm('discounts.approve', 'approve or reject booking discounts');
      await fsDecideDiscountAtomic(actor, bookingId, approved, approvedAmountLkr);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Discount decision failed.';
      setOperationError(msg);
      return { success: false, error: msg };
    }
  };

  const updateDeliveryChecklist = async (
    bookingId: string,
    checklist: Partial<DeliveryChecklist>
  ) => {
    try {
      const actor = guardUserAndPerm('delivery.checklist_pdi', 'update PDI checklists');
      await fsUpdateDeliveryChecklist(actor, bookingId, checklist);
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Checklist update failed.');
    }
  };

  const deliverBooking = async (bookingId: string): Promise<ActionResult> => {
    try {
      const actor = guardUserAndPerm('delivery.complete_handover', 'complete vehicle handover');
      await fsDeliverBookingAtomic(actor, bookingId);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delivery handover failed.';
      setOperationError(msg);
      return { success: false, error: msg };
    }
  };

  // HR Actions
  const updateLeaveRequestStatus = async (
    leaveId: string,
    status: LeaveStatus
  ): Promise<ActionResult> => {
    try {
      const actor = guardUserAndPerm('hr.leaves.decide', 'approve or reject leave requests');
      await fsDecideLeave(actor, leaveId, status);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Leave decision failed.';
      setOperationError(msg);
      return { success: false, error: msg };
    }
  };

  const addLeaveRequest = async (request: Omit<LeaveRequest, 'id' | 'status' | 'appliedOn'>) => {
    try {
      if (!currentUser) throw new Error('Sign in required.');
      await fsAddLeaveRequest(currentUser, request);
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Failed to submit leave request.');
    }
  };

  const markAttendance = async (
    employeeId: string,
    status: AttendanceStatus,
    notes = ''
  ) => {
    try {
      const actor = guardUserAndPerm('hr.attendance.write', 'record attendance');
      const emp = employees.find(e => e.id === employeeId);
      await fsMarkAttendance(actor, {
        date: getTodayDDMMYYYY(),
        employeeId,
        employeeName: emp?.fullName || 'Employee',
        department: emp?.department || 'Showroom Operations',
        status,
        checkInTime: '08:30 AM',
        notes,
      });
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Attendance update failed.');
    }
  };

  // Service Actions
  const updateServiceStatus = async (
    jobCardId: string,
    status: ServiceJobCard['status']
  ) => {
    try {
      const actor = guardUserAndPerm('service.write', 'update service job cards');
      await fsUpdateServiceStatus(actor, jobCardId, status);
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Service status update failed.');
    }
  };

  const addServiceJobCard = async (card: Omit<ServiceJobCard, 'id'>) => {
    try {
      const actor = guardUserAndPerm('service.write', 'create service job cards');
      await fsAddServiceCard(actor, card);
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Service job card creation failed.');
    }
  };

  // Accessories Actions
  const addAccessoryToBooking = async (
    bookingId: string,
    accessoryId: string,
    quantity = 1
  ): Promise<ActionResult> => {
    try {
      const actor = guardUserAndPerm('bookings.attach_accessories', 'attach accessories to bookings');
      await fsAttachAccessoryAtomic(actor, bookingId, accessoryId, quantity);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Accessory reservation failed.';
      setOperationError(msg);
      return { success: false, error: msg };
    }
  };

  const removeAccessoryFromBooking = async (
    bookingId: string,
    accessoryId: string
  ): Promise<ActionResult> => {
    try {
      const actor = guardUserAndPerm('bookings.attach_accessories', 'remove accessories from bookings');
      await fsRemoveAccessoryAtomic(actor, bookingId, accessoryId);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Accessory removal failed.';
      setOperationError(msg);
      return { success: false, error: msg };
    }
  };

  // Test Ride Actions
  const addTestRide = async (record: Omit<TestRideRecord, 'id'>) => {
    try {
      const actor = guardUserAndPerm('testrides.write', 'schedule test rides');
      await fsAddTestRide(actor, record);
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Failed to schedule test ride.');
    }
  };

  const updateTestRideStatus = async (
    id: string,
    status: TestRideRecord['status'],
    feedbackRating?: number,
    feedbackNotes?: string
  ) => {
    try {
      const actor = guardUserAndPerm('testrides.write', 'update test ride records');
      await fsUpdateTestRide(actor, id, {
        status,
        ...(feedbackRating !== undefined ? { feedbackRating } : {}),
        ...(feedbackNotes !== undefined ? { feedbackNotes } : {}),
      });
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Failed to update test ride.');
    }
  };

  const convertTestRideToLead = async (testRideId: string): Promise<ActionResult> => {
    try {
      const actor = guardUserAndPerm('crm.write', 'convert test ride to lead');
      const tr = testRides.find(r => r.id === testRideId);
      if (!tr) return { success: false, error: 'Test ride record not found.' };
      const leadId = await fsCreateLead(actor, {
        customerName: tr.customerName,
        phone: tr.customerPhone,
        email: `${tr.customerName.toLowerCase().replace(/\s+/g, '.')}@client.lk`,
        city: 'Colombo',
        modelInterest: tr.model,
        colorPreference: 'Standard',
        salespersonId: actor.uid,
        salespersonName: tr.salespersonName || actor.fullName,
        source: 'Test Ride Experience',
        status: 'Test Ride',
        nextFollowUpDate: getTodayDDMMYYYY(),
      });
      await fsUpdateTestRide(actor, testRideId, { convertedToLeadId: leadId });
      return { success: true, leadId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to convert test ride to lead.';
      setOperationError(msg);
      return { success: false, error: msg };
    }
  };

  // Trade-In Actions
  const addTradeInValuation = async (
    val: Omit<TradeInValuation, 'id' | 'date'>
  ): Promise<ActionResult> => {
    try {
      const actor = guardUserAndPerm('tradein.create_estimate', 'create trade-in valuations');
      const id = await fsCreateTradeIn(actor, val);
      return { success: true, id };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save trade-in valuation.';
      setOperationError(msg);
      return { success: false, error: msg };
    }
  };

  const decideTradeIn = async (tradeInId: string, approved: boolean): Promise<ActionResult> => {
    try {
      const actor = guardUserAndPerm('tradein.approve', 'approve or reject trade-in credits');
      await fsDecideTradeIn(actor, tradeInId, approved);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Trade-in approval decision failed.';
      setOperationError(msg);
      return { success: false, error: msg };
    }
  };

  const applyTradeInToBooking = async (
    tradeInId: string,
    bookingId: string
  ): Promise<ActionResult> => {
    try {
      const actor = guardUserAndPerm('tradein.approve', 'apply approved trade-in credits to bookings');
      await fsApplyTradeInAtomic(actor, tradeInId, bookingId);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to apply trade-in credit.';
      setOperationError(msg);
      return { success: false, error: msg };
    }
  };

  // Admin & Identity Actions
  const inviteStaff = async (
    invite: Omit<StaffInvite, 'id' | 'status' | 'invitedByUid' | 'createdAt'>
  ): Promise<ActionResult> => {
    try {
      const actor = guardUserAndPerm('users.manage_invites', 'invite staff users');
      await fsCreateInvite(actor, invite);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to invite staff member.';
      setOperationError(msg);
      return { success: false, error: msg };
    }
  };

  const updateStaffRoleOrStatus = async (
    targetUid: string,
    updates: { role?: UserRole; disabled?: boolean }
  ): Promise<ActionResult> => {
    try {
      if (updates.role !== undefined) {
        guardUserAndPerm('users.assign_role', 'assign staff roles');
      }
      if (updates.disabled !== undefined) {
        guardUserAndPerm('users.toggle_disable', 'disable or enable staff accounts');
      }
      if (!currentUser) throw new Error('Not signed in.');
      if (targetUid === currentUser.uid && updates.disabled) {
        throw new Error('You cannot disable your own active administrator session.');
      }
      await fsUpdateUserRoleOrStatus(currentUser, targetUid, updates);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update staff account.';
      setOperationError(msg);
      return { success: false, error: msg };
    }
  };

  const exportDatabaseBackup = async (): Promise<Record<string, unknown[]> | null> => {
    try {
      const actor = guardUserAndPerm('backup.export', 'export database backup snapshots');
      return await fsExportDatabaseBackup(actor);
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Backup export failed.');
      return null;
    }
  };

  const openNotificationModal = (payload: {
    title: string;
    recipientPhone: string;
    recipientName: string;
    message: string;
    channel?: 'SMS' | 'WhatsApp';
    purpose: string;
  }) => {
    setNotificationModal({
      isOpen: true,
      title: payload.title,
      recipientPhone: payload.recipientPhone,
      recipientName: payload.recipientName,
      message: payload.message,
      channel: payload.channel || 'SMS',
      purpose: payload.purpose,
    });
  };

  const closeNotificationModal = () => setNotificationModal(null);

  return (
    <ShowroomContext.Provider
      value={{
        authStatus,
        authError,
        pendingAuthEmail,
        currentUser,
        signInWithGoogle,
        signInWithEmail,
        sendPasswordReset,
        logout,
        can,
        canView,
        currentView,
        setCurrentView,
        currentRole: currentUser?.role || 'sales',
        leads,
        bikes,
        bookings,
        employees,
        leaveRequests,
        attendance,
        serviceJobCards,
        accessories,
        testRides,
        tradeIns,
        staffUsers,
        staffInvites,
        auditLogs,
        operationError,
        clearOperationError,
        metrics,
        addLead,
        updateLead,
        addLeadNote,
        deleteLead,
        convertLeadToBooking,
        addBike,
        updateBike,
        createBooking,
        cancelBooking,
        addPaymentToBooking,
        verifyPayment,
        reversePayment,
        decideDiscount,
        updateDeliveryChecklist,
        deliverBooking,
        updateLeaveRequestStatus,
        addLeaveRequest,
        markAttendance,
        updateServiceStatus,
        addServiceJobCard,
        addAccessoryToBooking,
        removeAccessoryFromBooking,
        addTestRide,
        updateTestRideStatus,
        convertTestRideToLead,
        addTradeInValuation,
        decideTradeIn,
        applyTradeInToBooking,
        inviteStaff,
        updateStaffRoleOrStatus,
        exportDatabaseBackup,
        notificationModal,
        openNotificationModal,
        closeNotificationModal,
        selectedLeadId,
        setSelectedLeadId,
        crmViewMode,
        setCrmViewMode,
        addCallLogToLead,
        updateLeadPriority,
        markLeadLost,
        reassignLead,
        proformaQuoteLeadId,
        setProformaQuoteLeadId,
        selectedBookingId,
        setSelectedBookingId,
        selectedBikeId,
        setSelectedBikeId,
        printableBookingId,
        setPrintableBookingId,
      }}
    >
      {children}
    </ShowroomContext.Provider>
  );
};

export const useShowroom = () => {
  const context = useContext(ShowroomContext);
  if (!context) {
    throw new Error('useShowroom must be used within a ShowroomProvider');
  }
  return context;
};
