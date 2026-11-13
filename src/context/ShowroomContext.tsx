/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Bike,
  Booking,
  Employee,
  LeaveRequest,
  AttendanceRecord,
  Lead,
  ServiceJobCard,
  DemoRole,
  UserRole,
  UserSession,
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
import {
  INITIAL_BIKES,
  INITIAL_BOOKINGS,
  INITIAL_EMPLOYEES,
  INITIAL_LEADS,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_ATTENDANCE,
  INITIAL_SERVICE_CARDS,
  INITIAL_ACCESSORIES,
  INITIAL_TEST_RIDES,
  INITIAL_TRADE_INS,
  PRESET_USERS,
} from '../data/seedData';
import { getTodayDDMMYYYY, generateBookingId } from '../utils/formatters';

interface ShowroomContextType {
  // Authentication & Session
  currentUser: UserSession | null;
  login: (email: string, password?: string, role?: UserRole) => boolean;
  logout: () => void;
  switchUserRole: (role: UserRole) => void;

  // Navigation & Role
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  currentRole: DemoRole;
  setCurrentRole: (role: DemoRole) => void;
  demoGuideOpen: boolean;
  setDemoGuideOpen: (open: boolean) => void;

  // Data Collections
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
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'notes'>) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  addLeadNote: (leadId: string, noteText: string, author?: string) => void;
  deleteLead: (id: string) => void;
  convertLeadToBooking: (
    leadId: string,
    bookingDetails: {
      bikeId: string;
      advanceAmountLkr: number;
      paymentReference: string;
      customerNIC: string;
      customerAddress: string;
    }
  ) => { success: boolean; error?: string; bookingId?: string };

  // Bike Actions
  addBike: (bike: Omit<Bike, 'id'>) => void;
  updateBike: (id: string, updates: Partial<Bike>) => void;

  // Booking Actions
  createBooking: (bookingData: {
    customerName: string;
    customerPhone: string;
    customerNIC: string;
    customerAddress: string;
    salespersonId: string;
    bikeId: string;
    discountLkr?: number;
    initialPayment?: {
      amountLkr: number;
      type: PaymentRecord['type'];
      reference: string;
      isVerified?: boolean;
    };
    leadId?: string;
  }) => { success: boolean; error?: string; bookingId?: string };
  cancelBooking: (bookingId: string, reason: string) => { success: boolean; error?: string };
  addPaymentToBooking: (
    bookingId: string,
    payment: {
      amountLkr: number;
      type: PaymentRecord['type'];
      reference: string;
      isVerified: boolean;
    }
  ) => { success: boolean; error?: string };
  togglePaymentVerification: (
    bookingId: string,
    paymentId: string
  ) => { success: boolean; error?: string };
  updateDeliveryChecklist: (bookingId: string, checklist: Partial<DeliveryChecklist>) => void;
  deliverBooking: (bookingId: string, deliveredBy: string) => { success: boolean; error?: string };

  // HR Actions
  updateLeaveRequestStatus: (leaveId: string, status: LeaveStatus, decisionBy?: string) => void;
  addLeaveRequest: (request: Omit<LeaveRequest, 'id' | 'status' | 'appliedOn'>) => void;
  markAttendance: (employeeId: string, status: AttendanceStatus, notes?: string) => void;

  // Service Job Card Actions
  updateServiceStatus: (jobCardId: string, status: ServiceJobCard['status']) => void;
  addServiceJobCard: (card: Omit<ServiceJobCard, 'id'>) => void;

  // Accessories Actions
  addAccessoryToBooking: (
    bookingId: string,
    accessoryId: string,
    quantity?: number
  ) => { success: boolean; error?: string };
  removeAccessoryFromBooking: (
    bookingId: string,
    accessoryId: string
  ) => { success: boolean; error?: string };

  // Test Ride Actions
  addTestRide: (record: Omit<TestRideRecord, 'id'>) => void;
  updateTestRideStatus: (
    id: string,
    status: TestRideRecord['status'],
    rating?: number,
    notes?: string
  ) => void;
  convertTestRideToLead: (testRideId: string) => { success: boolean; leadId?: string };

  // Trade-In Actions
  addTradeInValuation: (val: Omit<TradeInValuation, 'id' | 'date'>) => { success: boolean; id: string };
  applyTradeInToBooking: (tradeInId: string, bookingId: string) => { success: boolean; error?: string };

  // Notification Simulator
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

  // Global Actions
  resetDemoData: () => void;
  selectedLeadId: string | null;
  setSelectedLeadId: (id: string | null) => void;
  // CRM Enhancements
  crmViewMode: 'kanban' | 'list';
  setCrmViewMode: (mode: 'kanban' | 'list') => void;
  addCallLogToLead: (leadId: string, call: Omit<CallLog, 'id' | 'date'>) => void;
  updateLeadPriority: (leadId: string, priority: LeadPriority) => void;
  markLeadLost: (leadId: string, reason: string) => void;
  reassignLead: (leadId: string, salespersonId: string, salespersonName: string) => void;
  proformaQuoteLeadId: string | null;
  setProformaQuoteLeadId: (id: string | null) => void;

  selectedBookingId: string | null;
  setSelectedBookingId: (id: string | null) => void;
  selectedBikeId: string | null;
  setSelectedBikeId: (id: string | null) => void;
  printableBookingId: string | null;
  setPrintableBookingId: (id: string | null) => void;
}

const STORAGE_KEY = 'showroom_os_re_demo_v1';

const ShowroomContext = createContext<ShowroomContextType | undefined>(undefined);

export const ShowroomProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [currentRole, setCurrentRole] = useState<DemoRole>('management');
  const [demoGuideOpen, setDemoGuideOpen] = useState<boolean>(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_user`);
      return saved ? JSON.parse(saved) : PRESET_USERS[0];
    } catch {
      return PRESET_USERS[0];
    }
  });

  const [crmViewMode, setCrmViewMode] = useState<'kanban' | 'list'>('list');
  const [proformaQuoteLeadId, setProformaQuoteLeadId] = useState<string | null>(null);

  const login = (email: string, password = '', role?: UserRole): boolean => {
    let matched = PRESET_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!matched && role) {
      matched = PRESET_USERS.find(u => u.role === role);
    }
    if (!matched) {
      matched = {
        id: `usr-${Date.now()}`,
        fullName: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase()),
        email,
        role: role || 'sales',
        designation: role === 'management' ? 'General Manager' : 'Sales Consultant',
        department: 'Showroom Operations',
        branch: 'Colombo Flagship Hub',
      };
    }
    setCurrentUser(matched);
    setCurrentRole(matched.role);
    try {
      localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(matched));
    } catch {}
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(`${STORAGE_KEY}_user`);
    } catch {}
  };

  const switchUserRole = (role: UserRole) => {
    const matched = PRESET_USERS.find(u => u.role === role);
    if (matched) {
      setCurrentUser(matched);
      setCurrentRole(role);
      try {
        localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(matched));
      } catch {}
    } else {
      setCurrentRole(role);
      if (currentUser) {
        const updated = { ...currentUser, role };
        setCurrentUser(updated);
        try {
          localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(updated));
        } catch {}
      }
    }
  };

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
  const [printableBookingId, setPrintableBookingId] = useState<string | null>(null);

  // Core Data States
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_leads`);
      return saved ? JSON.parse(saved) : INITIAL_LEADS;
    } catch {
      return INITIAL_LEADS;
    }
  });

  const [bikes, setBikes] = useState<Bike[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_bikes`);
      return saved ? JSON.parse(saved) : INITIAL_BIKES;
    } catch {
      return INITIAL_BIKES;
    }
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_bookings`);
      return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
    } catch {
      return INITIAL_BOOKINGS;
    }
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_employees`);
      return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
    } catch {
      return INITIAL_EMPLOYEES;
    }
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_leaves`);
      return saved ? JSON.parse(saved) : INITIAL_LEAVE_REQUESTS;
    } catch {
      return INITIAL_LEAVE_REQUESTS;
    }
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_attendance`);
      return saved ? JSON.parse(saved) : INITIAL_ATTENDANCE;
    } catch {
      return INITIAL_ATTENDANCE;
    }
  });

  const [serviceJobCards, setServiceJobCards] = useState<ServiceJobCard[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_service`);
      return saved ? JSON.parse(saved) : INITIAL_SERVICE_CARDS;
    } catch {
      return INITIAL_SERVICE_CARDS;
    }
  });

  const [accessories, setAccessories] = useState<Accessory[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_accessories`);
      return saved ? JSON.parse(saved) : INITIAL_ACCESSORIES;
    } catch {
      return INITIAL_ACCESSORIES;
    }
  });

  const [testRides, setTestRides] = useState<TestRideRecord[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_testrides`);
      return saved ? JSON.parse(saved) : INITIAL_TEST_RIDES;
    } catch {
      return INITIAL_TEST_RIDES;
    }
  });

  const [tradeIns, setTradeIns] = useState<TradeInValuation[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_tradeins`);
      return saved ? JSON.parse(saved) : INITIAL_TRADE_INS;
    } catch {
      return INITIAL_TRADE_INS;
    }
  });

  const [notificationModal, setNotificationModal] = useState<{
    isOpen: boolean;
    title: string;
    recipientPhone: string;
    recipientName: string;
    message: string;
    channel: 'SMS' | 'WhatsApp';
    purpose: string;
  } | null>(null);

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

  const closeNotificationModal = () => {
    setNotificationModal(null);
  };

  // Persist to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_leads`, JSON.stringify(leads));
      localStorage.setItem(`${STORAGE_KEY}_bikes`, JSON.stringify(bikes));
      localStorage.setItem(`${STORAGE_KEY}_bookings`, JSON.stringify(bookings));
      localStorage.setItem(`${STORAGE_KEY}_employees`, JSON.stringify(employees));
      localStorage.setItem(`${STORAGE_KEY}_leaves`, JSON.stringify(leaveRequests));
      localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(attendance));
      localStorage.setItem(`${STORAGE_KEY}_service`, JSON.stringify(serviceJobCards));
      localStorage.setItem(`${STORAGE_KEY}_accessories`, JSON.stringify(accessories));
      localStorage.setItem(`${STORAGE_KEY}_testrides`, JSON.stringify(testRides));
      localStorage.setItem(`${STORAGE_KEY}_tradeins`, JSON.stringify(tradeIns));
    } catch (e) {
      console.warn('LocalStorage save error (using memory state):', e);
    }
  }, [leads, bikes, bookings, employees, leaveRequests, attendance, serviceJobCards, accessories, testRides, tradeIns]);

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
        .filter(p => p.status === 'Verified')
        .reduce((sum, p) => sum + p.amountLkr, 0);
      const balance = b.finalPriceLkr - verifiedPaid;
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
    const activeTradeInsCount = tradeIns.filter(ti => !ti.appliedBookingId).length;

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
  const addLead = (leadData: Omit<Lead, 'id' | 'createdAt' | 'notes'>) => {
    const newLead: Lead = {
      ...leadData,
      id: `lead-${Date.now()}`,
      createdAt: getTodayDDMMYYYY(),
      notes: [
        {
          id: `note-${Date.now()}`,
          date: getTodayDDMMYYYY(),
          author: leadData.salespersonName,
          text: `Inquiry registered for ${leadData.modelInterest} (${leadData.source}).`,
        },
      ],
    };
    setLeads(prev => [newLead, ...prev]);
  };

  const updateLead = (id: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, ...updates } : l)));
  };

  const addLeadNote = (leadId: string, noteText: string, author?: string) => {
    setLeads(prev =>
      prev.map(l => {
        if (l.id !== leadId) return l;
        const newNote = {
          id: `note-${Date.now()}`,
          date: getTodayDDMMYYYY(),
          author: author || l.salespersonName,
          text: noteText,
        };
        return {
          ...l,
          notes: [newNote, ...l.notes],
        };
      })
    );
  };

  const deleteLead = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  const addCallLogToLead = (leadId: string, call: Omit<CallLog, 'id' | 'date'>) => {
    const newCallLog: CallLog = {
      ...call,
      id: `cl-${Date.now()}`,
      date: `${getTodayDDMMYYYY()} 11:30`,
    };
    setLeads(prev =>
      prev.map(l =>
        l.id === leadId
          ? {
              ...l,
              callLogs: [newCallLog, ...(l.callLogs || [])],
              notes: [
                {
                  id: `note-${Date.now()}`,
                  date: getTodayDDMMYYYY(),
                  author: call.caller,
                  text: `Call Logged (${call.outcome}): ${call.notes}`,
                },
                ...l.notes,
              ],
            }
          : l
      )
    );
  };

  const updateLeadPriority = (leadId: string, priority: LeadPriority) => {
    setLeads(prev => prev.map(l => (l.id === leadId ? { ...l, priority } : l)));
  };

  const markLeadLost = (leadId: string, reason: string) => {
    setLeads(prev =>
      prev.map(l =>
        l.id === leadId
          ? {
              ...l,
              status: 'Lost',
              lostReason: reason,
              notes: [
                {
                  id: `note-${Date.now()}`,
                  date: getTodayDDMMYYYY(),
                  author: currentUser?.fullName || 'Sales Executive',
                  text: `Lead marked as Lost. Reason: ${reason}`,
                },
                ...l.notes,
              ],
            }
          : l
      )
    );
  };

  const reassignLead = (leadId: string, salespersonId: string, salespersonName: string) => {
    setLeads(prev =>
      prev.map(l =>
        l.id === leadId
          ? {
              ...l,
              salespersonId,
              salespersonName,
              notes: [
                {
                  id: `note-${Date.now()}`,
                  date: getTodayDDMMYYYY(),
                  author: currentUser?.fullName || 'Management',
                  text: `Lead reassigned to ${salespersonName}.`,
                },
                ...l.notes,
              ],
            }
          : l
      )
    );
  };

  // Bike Actions
  const addBike = (bikeData: Omit<Bike, 'id'>) => {
    const newBike: Bike = {
      ...bikeData,
      id: `bike-${Date.now()}`,
    };
    setBikes(prev => [newBike, ...prev]);
  };

  const updateBike = (id: string, updates: Partial<Bike>) => {
    setBikes(prev => prev.map(b => (b.id === id ? { ...b, ...updates } : b)));
  };

  // Booking Actions
  const createBooking = (bookingData: {
    customerName: string;
    customerPhone: string;
    customerNIC: string;
    customerAddress: string;
    salespersonId: string;
    bikeId: string;
    discountLkr?: number;
    initialPayment?: {
      amountLkr: number;
      type: PaymentRecord['type'];
      reference: string;
      isVerified?: boolean;
    };
    leadId?: string;
  }) => {
    const targetBike = bikes.find(b => b.id === bookingData.bikeId);
    if (!targetBike) {
      return { success: false, error: 'Motorcycle not found in inventory.' };
    }
    if (targetBike.status !== 'Available') {
      return {
        success: false,
        error: `Allocation failed: Chassis ${targetBike.chassisNumber} is currently "${targetBike.status}". Only Available units can be allocated.`,
      };
    }

    const salesperson = employees.find(e => e.id === bookingData.salespersonId);
    const salespersonName = salesperson ? salesperson.fullName : 'Showroom Sales Desk';

    const discount = bookingData.discountLkr || 0;
    const finalPrice = Math.max(0, targetBike.priceLkr - discount);

    const bookingId = generateBookingId(bookings);
    const payments: PaymentRecord[] = [];

    if (bookingData.initialPayment && bookingData.initialPayment.amountLkr > 0) {
      if (bookingData.initialPayment.amountLkr > finalPrice) {
        return { success: false, error: 'Initial advance cannot exceed the total purchase price.' };
      }
      payments.push({
        id: `pmt-${Date.now()}`,
        date: getTodayDDMMYYYY(),
        amountLkr: bookingData.initialPayment.amountLkr,
        type: bookingData.initialPayment.type,
        reference: bookingData.initialPayment.reference || 'Initial Deposit',
        status: bookingData.initialPayment.isVerified ? 'Verified' : 'Pending Verification',
        verifiedBy: bookingData.initialPayment.isVerified ? 'Finance Lead' : undefined,
        verifiedAt: bookingData.initialPayment.isVerified ? `${getTodayDDMMYYYY()} (At Booking)` : undefined,
      });
    }

    const verifiedPaidTotal = payments
      .filter(p => p.status === 'Verified')
      .reduce((sum, p) => sum + p.amountLkr, 0);

    const newBooking: Booking = {
      id: bookingId,
      leadId: bookingData.leadId,
      customerName: bookingData.customerName,
      customerPhone: bookingData.customerPhone,
      customerNIC: bookingData.customerNIC,
      customerAddress: bookingData.customerAddress,
      salespersonId: bookingData.salespersonId,
      salespersonName,
      bikeId: targetBike.id,
      bikeModel: targetBike.model,
      bikeColour: targetBike.colour,
      bikeChassis: targetBike.chassisNumber,
      bikeEngine: targetBike.engineNumber,
      totalPriceLkr: targetBike.priceLkr,
      discountLkr: discount,
      finalPriceLkr: finalPrice,
      payments,
      status: 'Confirmed',
      deliveryChecklist: {
        paymentVerified: verifiedPaidTotal >= finalPrice && finalPrice > 0,
        documentsChecked: false,
        pdiCompleted: false,
        customerOrientationDone: false,
        deliveryNotes: 'Booking confirmed. Awaiting final pre-delivery inspections and finance clearance.',
      },
      createdAt: getTodayDDMMYYYY(),
      timeline: [
        {
          id: `tl-${Date.now()}-1`,
          date: `${getTodayDDMMYYYY()} 10:00`,
          title: 'Booking Confirmed & Allocation Locked',
          description: `Chassis ${targetBike.chassisNumber} reserved for ${bookingData.customerName}.`,
          type: 'booking',
        },
        ...(payments.length > 0
          ? [
              {
                id: `tl-${Date.now()}-2`,
                date: `${getTodayDDMMYYYY()} 10:05`,
                title: `Initial ${payments[0].type} Logged`,
                description: `Payment of LKR ${payments[0].amountLkr.toLocaleString()} recorded (${payments[0].status}). Ref: ${payments[0].reference}`,
                type: 'payment' as const,
              },
            ]
          : []),
      ],
    };

    // 1. Add booking
    setBookings(prev => [newBooking, ...prev]);

    // 2. Update bike to Reserved
    setBikes(prev =>
      prev.map(b =>
        b.id === targetBike.id ? { ...b, status: 'Reserved', allocatedBookingId: bookingId } : b
      )
    );

    // 3. Update linked lead if any
    if (bookingData.leadId) {
      setLeads(prev =>
        prev.map(l =>
          l.id === bookingData.leadId
            ? {
                ...l,
                status: 'Booked',
                bookingId,
                notes: [
                  {
                    id: `n-${Date.now()}`,
                    date: getTodayDDMMYYYY(),
                    author: salespersonName,
                    text: `Lead converted to formal booking ${bookingId} (Chassis: ${targetBike.chassisNumber}).`,
                  },
                  ...l.notes,
                ],
              }
            : l
        )
      );
    }

    return { success: true, bookingId };
  };

  const convertLeadToBooking = (
    leadId: string,
    details: {
      bikeId: string;
      advanceAmountLkr: number;
      paymentReference: string;
      customerNIC: string;
      customerAddress: string;
    }
  ) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return { success: false, error: 'Lead not found.' };

    return createBooking({
      customerName: lead.customerName,
      customerPhone: lead.phone,
      customerNIC: details.customerNIC || '1990****2031',
      customerAddress: details.customerAddress || `${lead.city}, Sri Lanka`,
      salespersonId: lead.salespersonId || 'emp-001',
      bikeId: details.bikeId,
      leadId,
      initialPayment: {
        amountLkr: details.advanceAmountLkr,
        type: 'Booking Advance',
        reference: details.paymentReference || 'Advance Payment (Cash/Cheque)',
        isVerified: true, // Auto-verify booking advance when converted from lead for quick presenter demo
      },
    });
  };

  const cancelBooking = (bookingId: string, reason: string) => {
    const targetBooking = bookings.find(b => b.id === bookingId);
    if (!targetBooking) return { success: false, error: 'Booking not found.' };
    if (targetBooking.status === 'Delivered') {
      return { success: false, error: 'Cannot cancel a booking that has already been delivered.' };
    }

    // 1. Release the allocated bike back to Available
    setBikes(prev =>
      prev.map(b =>
        b.id === targetBooking.bikeId || b.allocatedBookingId === bookingId
          ? { ...b, status: 'Available', allocatedBookingId: undefined }
          : b
      )
    );

    // 2. Mark booking as Cancelled
    setBookings(prev =>
      prev.map(b =>
        b.id === bookingId
          ? {
              ...b,
              status: 'Cancelled',
              timeline: [
                {
                  id: `tl-${Date.now()}`,
                  date: `${getTodayDDMMYYYY()} 12:00`,
                  title: 'Booking Cancelled & Stock Released',
                  description: `Reason: ${reason}. Chassis ${targetBooking.bikeChassis} released back to Available showroom stock.`,
                  type: 'status',
                },
                ...b.timeline,
              ],
            }
          : b
      )
    );

    // 3. Update linked lead if present
    if (targetBooking.leadId) {
      setLeads(prev =>
        prev.map(l =>
          l.id === targetBooking.leadId
            ? {
                ...l,
                status: 'Contacted',
                bookingId: undefined,
                notes: [
                  {
                    id: `n-${Date.now()}`,
                    date: getTodayDDMMYYYY(),
                    author: 'System Operations',
                    text: `Booking ${bookingId} cancelled: ${reason}. Lead reverted to Contacted status.`,
                  },
                  ...l.notes,
                ],
              }
            : l
        )
      );
    }

    return { success: true };
  };

  const addPaymentToBooking = (
    bookingId: string,
    payment: {
      amountLkr: number;
      type: PaymentRecord['type'];
      reference: string;
      isVerified: boolean;
    }
  ) => {
    const targetBooking = bookings.find(b => b.id === bookingId);
    if (!targetBooking) return { success: false, error: 'Booking not found.' };

    if (payment.amountLkr <= 0) {
      return { success: false, error: 'Payment amount must be greater than zero.' };
    }

    const currentTotalPaid = targetBooking.payments.reduce((sum, p) => sum + p.amountLkr, 0);
    const balance = targetBooking.finalPriceLkr - currentTotalPaid;

    if (payment.amountLkr > balance) {
      return {
        success: false,
        error: `Overpayment blocked: Outstanding balance is LKR ${balance.toLocaleString()}. Cannot record LKR ${payment.amountLkr.toLocaleString()}.`,
      };
    }

    const newPayment: PaymentRecord = {
      id: `pmt-${Date.now()}`,
      date: getTodayDDMMYYYY(),
      amountLkr: payment.amountLkr,
      type: payment.type,
      reference: payment.reference,
      status: payment.isVerified ? 'Verified' : 'Pending Verification',
      verifiedBy: payment.isVerified ? 'Shiromi Gunawardena (Finance Lead)' : undefined,
      verifiedAt: payment.isVerified ? `${getTodayDDMMYYYY()} 11:30` : undefined,
    };

    setBookings(prev =>
      prev.map(b => {
        if (b.id !== bookingId) return b;
        const updatedPayments = [...b.payments, newPayment];
        const verifiedPaid = updatedPayments
          .filter(p => p.status === 'Verified')
          .reduce((sum, p) => sum + p.amountLkr, 0);
        const isFullyPaidAndVerified = verifiedPaid >= b.finalPriceLkr;

        return {
          ...b,
          payments: updatedPayments,
          deliveryChecklist: {
            ...b.deliveryChecklist,
            paymentVerified: isFullyPaidAndVerified,
          },
          timeline: [
            {
              id: `tl-${Date.now()}`,
              date: `${getTodayDDMMYYYY()} 14:00`,
              title: `${payment.type} Logged: LKR ${payment.amountLkr.toLocaleString()}`,
              description: `Status: ${newPayment.status}. Ref: ${payment.reference}.`,
              type: 'payment',
            },
            ...b.timeline,
          ],
        };
      })
    );

    return { success: true };
  };

  const togglePaymentVerification = (bookingId: string, paymentId: string) => {
    setBookings(prev =>
      prev.map(b => {
        if (b.id !== bookingId) return b;
        let changedPayment: PaymentRecord | undefined;
        const updatedPayments = b.payments.map(p => {
          if (p.id !== paymentId) return p;
          const nextStatus =
            p.status === 'Verified' ? 'Pending Verification' : ('Verified' as const);
          changedPayment = {
            ...p,
            status: nextStatus,
            verifiedBy:
              nextStatus === 'Verified' ? 'Shiromi Gunawardena (Finance Lead)' : undefined,
            verifiedAt: nextStatus === 'Verified' ? `${getTodayDDMMYYYY()} 11:00` : undefined,
          };
          return changedPayment;
        });

        const verifiedPaid = updatedPayments
          .filter(p => p.status === 'Verified')
          .reduce((sum, p) => sum + p.amountLkr, 0);
        const isFullyPaidAndVerified = verifiedPaid >= b.finalPriceLkr;

        const timelineItem = changedPayment
          ? {
              id: `tl-${Date.now()}`,
              date: `${getTodayDDMMYYYY()} 11:00`,
              title: `Payment ${changedPayment.status}: LKR ${changedPayment.amountLkr.toLocaleString()}`,
              description: `Finance verified collection status updated. Ref: ${changedPayment.reference}`,
              type: 'payment' as const,
            }
          : null;

        return {
          ...b,
          payments: updatedPayments,
          deliveryChecklist: {
            ...b.deliveryChecklist,
            paymentVerified: isFullyPaidAndVerified,
          },
          timeline: timelineItem ? [timelineItem, ...b.timeline] : b.timeline,
        };
      })
    );
    return { success: true };
  };

  const updateDeliveryChecklist = (bookingId: string, checklist: Partial<DeliveryChecklist>) => {
    setBookings(prev =>
      prev.map(b => {
        if (b.id !== bookingId) return b;
        return {
          ...b,
          deliveryChecklist: {
            ...b.deliveryChecklist,
            ...checklist,
          },
        };
      })
    );
  };

  const deliverBooking = (bookingId: string, deliveredBy: string) => {
    const targetBooking = bookings.find(b => b.id === bookingId);
    if (!targetBooking) return { success: false, error: 'Booking not found.' };

    const verifiedPaid = targetBooking.payments
      .filter(p => p.status === 'Verified')
      .reduce((sum, p) => sum + p.amountLkr, 0);
    const balance = targetBooking.finalPriceLkr - verifiedPaid;

    if (balance > 0) {
      return {
        success: false,
        error: `Delivery blocked: Outstanding balance of LKR ${balance.toLocaleString()} must be settled and verified first.`,
      };
    }

    if (!targetBooking.deliveryChecklist.documentsChecked) {
      return {
        success: false,
        error:
          'Delivery blocked: Registration, Insurance, and Revenue License documents must be verified first.',
      };
    }

    if (!targetBooking.deliveryChecklist.pdiCompleted) {
      return {
        success: false,
        error:
          'Delivery blocked: Pre-Delivery Inspection (PDI) checklist must be completed by service technician.',
      };
    }

    // Mark booking as delivered
    setBookings(prev =>
      prev.map(b =>
        b.id === bookingId
          ? {
              ...b,
              status: 'Delivered',
              deliveredAt: `${getTodayDDMMYYYY()} 16:00`,
              deliveredBy,
              deliveryChecklist: {
                ...b.deliveryChecklist,
                customerOrientationDone: true,
              },
              timeline: [
                {
                  id: `tl-${Date.now()}`,
                  date: `${getTodayDDMMYYYY()} 16:00`,
                  title: 'Official Motorcycle Handover Completed',
                  description: `Keys delivered by ${deliveredBy}. Customer orientation signed and handover photo taken.`,
                  type: 'delivery',
                },
                ...b.timeline,
              ],
            }
          : b
      )
    );

    // Update bike status to Delivered
    setBikes(prev =>
      prev.map(b =>
        b.id === targetBooking.bikeId || b.allocatedBookingId === bookingId
          ? { ...b, status: 'Delivered' }
          : b
      )
    );

    return { success: true };
  };

  // HR Actions
  const updateLeaveRequestStatus = (
    leaveId: string,
    status: LeaveStatus,
    decisionBy = 'Roshan Samarasinghe (GM)'
  ) => {
    let affectedEmployeeId: string | undefined;
    setLeaveRequests(prev =>
      prev.map(l => {
        if (l.id === leaveId) {
          affectedEmployeeId = l.employeeId;
          return {
            ...l,
            status,
            decisionDate: getTodayDDMMYYYY(),
            decisionBy,
          };
        }
        return l;
      })
    );

    if (affectedEmployeeId) {
      setEmployees(prev =>
        prev.map(e =>
          e.id === affectedEmployeeId
            ? { ...e, status: status === 'Approved' ? 'On Leave' : 'Active' }
            : e
        )
      );
    }
  };

  const addLeaveRequest = (request: Omit<LeaveRequest, 'id' | 'status' | 'appliedOn'>) => {
    const newReq: LeaveRequest = {
      ...request,
      id: `LV-2026-${String(leaveRequests.length + 82).padStart(3, '0')}`,
      status: 'Pending',
      appliedOn: getTodayDDMMYYYY(),
    };
    setLeaveRequests(prev => [newReq, ...prev]);
  };

  const markAttendance = (employeeId: string, status: AttendanceStatus, notes = '') => {
    setAttendance(prev => {
      const existing = prev.find(a => a.employeeId === employeeId);
      if (existing) {
        return prev.map(a => (a.employeeId === employeeId ? { ...a, status, notes } : a));
      }
      const employee = employees.find(e => e.id === employeeId);
      const newRec: AttendanceRecord = {
        id: `att-${Date.now()}`,
        date: getTodayDDMMYYYY(),
        employeeId,
        employeeName: employee ? employee.fullName : 'Employee',
        department: employee ? employee.department : 'General',
        status,
        checkInTime: '08:30 AM',
        notes,
      };
      return [...prev, newRec];
    });
  };

  // Service Actions
  const updateServiceStatus = (jobCardId: string, status: ServiceJobCard['status']) => {
    setServiceJobCards(prev => prev.map(s => (s.id === jobCardId ? { ...s, status } : s)));
  };

  const addServiceJobCard = (card: Omit<ServiceJobCard, 'id'>) => {
    const newCard: ServiceJobCard = {
      ...card,
      id: `JC-2026-${String(serviceJobCards.length + 107).padStart(3, '0')}`,
    };
    setServiceJobCards(prev => [newCard, ...prev]);
  };

  // Accessories Actions
  const addAccessoryToBooking = (bookingId: string, accessoryId: string, quantity = 1) => {
    const accessory = accessories.find(a => a.id === accessoryId);
    if (!accessory) return { success: false, error: 'Accessory not found in catalog.' };
    if (accessory.stockQuantity < quantity) return { success: false, error: 'Insufficient accessory stock quantity.' };

    let success = false;
    setBookings(prev =>
      prev.map(b => {
        if (b.id !== bookingId) return b;
        const currentAccessories = b.accessories || [];
        const existingIdx = currentAccessories.findIndex(a => a.accessoryId === accessoryId);
        let updatedAccessories = [...currentAccessories];
        if (existingIdx >= 0) {
          updatedAccessories[existingIdx] = {
            ...updatedAccessories[existingIdx],
            quantity: updatedAccessories[existingIdx].quantity + quantity,
          };
        } else {
          updatedAccessories.push({
            accessoryId,
            name: accessory.name,
            priceLkr: accessory.priceLkr,
            quantity,
            isFitted: false,
          });
        }
        const accessoriesTotalLkr = updatedAccessories.reduce(
          (sum, acc) => sum + acc.priceLkr * acc.quantity,
          0
        );
        const tradeInCreditLkr = b.tradeInCreditLkr || 0;
        const finalPriceLkr = Math.max(0, b.totalPriceLkr - (b.discountLkr || 0) + accessoriesTotalLkr - tradeInCreditLkr);
        success = true;
        return {
          ...b,
          accessories: updatedAccessories,
          accessoriesTotalLkr,
          finalPriceLkr,
        };
      })
    );

    if (success) {
      setAccessories(prev =>
        prev.map(a => (a.id === accessoryId ? { ...a, stockQuantity: a.stockQuantity - quantity } : a))
      );
    }
    return { success };
  };

  const removeAccessoryFromBooking = (bookingId: string, accessoryId: string) => {
    let releasedQty = 0;
    setBookings(prev =>
      prev.map(b => {
        if (b.id !== bookingId) return b;
        const currentAccessories = b.accessories || [];
        const item = currentAccessories.find(a => a.accessoryId === accessoryId);
        if (!item) return b;
        releasedQty = item.quantity;
        const updatedAccessories = currentAccessories.filter(a => a.accessoryId !== accessoryId);
        const accessoriesTotalLkr = updatedAccessories.reduce(
          (sum, acc) => sum + acc.priceLkr * acc.quantity,
          0
        );
        const tradeInCreditLkr = b.tradeInCreditLkr || 0;
        const finalPriceLkr = Math.max(0, b.totalPriceLkr - (b.discountLkr || 0) + accessoriesTotalLkr - tradeInCreditLkr);
        return {
          ...b,
          accessories: updatedAccessories,
          accessoriesTotalLkr,
          finalPriceLkr,
        };
      })
    );

    if (releasedQty > 0) {
      setAccessories(prev =>
        prev.map(a => (a.id === accessoryId ? { ...a, stockQuantity: a.stockQuantity + releasedQty } : a))
      );
    }
    return { success: true };
  };

  // Test Ride Actions
  const addTestRide = (record: Omit<TestRideRecord, 'id'>) => {
    const newRide: TestRideRecord = {
      ...record,
      id: `TR-2026-${String(testRides.length + 101).padStart(3, '0')}`,
    };
    setTestRides(prev => [newRide, ...prev]);
  };

  const updateTestRideStatus = (
    id: string,
    status: TestRideRecord['status'],
    feedbackRating?: number,
    feedbackNotes?: string
  ) => {
    setTestRides(prev =>
      prev.map(tr =>
        tr.id === id
          ? {
              ...tr,
              status,
              ...(feedbackRating !== undefined ? { feedbackRating } : {}),
              ...(feedbackNotes !== undefined ? { feedbackNotes } : {}),
            }
          : tr
      )
    );
  };

  const convertTestRideToLead = (testRideId: string) => {
    const tr = testRides.find(r => r.id === testRideId);
    if (!tr) return { success: false };
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      customerName: tr.customerName,
      phone: tr.customerPhone,
      email: `${tr.customerName.toLowerCase().replace(/\s+/g, '.')}@client.lk`,
      city: 'Colombo',
      modelInterest: tr.model,
      colorPreference: 'Standard',
      salespersonId: 'emp-001',
      salespersonName: tr.salespersonName,
      source: 'Test Ride Experience',
      status: 'Test Ride',
      nextFollowUpDate: getTodayDDMMYYYY(),
      createdAt: getTodayDDMMYYYY(),
      notes: [
        {
          id: `note-${Date.now()}`,
          date: getTodayDDMMYYYY(),
          author: tr.salespersonName,
          text: `Customer completed test ride on ${tr.model} (${tr.route}). Rating: ${tr.feedbackRating ? `${tr.feedbackRating}/5 stars` : 'Pending'}. ${tr.feedbackNotes || ''}`,
        },
      ],
    };
    setLeads(prev => [newLead, ...prev]);
    return { success: true, leadId: newLead.id };
  };

  // Trade-In Actions
  const addTradeInValuation = (val: Omit<TradeInValuation, 'id' | 'date'>) => {
    const id = `TI-2026-${String(tradeIns.length + 101).padStart(3, '0')}`;
    const newVal: TradeInValuation = {
      ...val,
      id,
      date: getTodayDDMMYYYY(),
    };
    setTradeIns(prev => [newVal, ...prev]);
    return { success: true, id };
  };

  const applyTradeInToBooking = (tradeInId: string, bookingId: string) => {
    const tradeIn = tradeIns.find(t => t.id === tradeInId);
    if (!tradeIn) return { success: false, error: 'Valuation record not found.' };
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return { success: false, error: 'Target booking not found.' };

    const creditAmount = tradeIn.estimatedValuationLkr;
    setBookings(prev =>
      prev.map(b => {
        if (b.id !== bookingId) return b;
        const accessoriesTotal = b.accessoriesTotalLkr || 0;
        const finalPriceLkr = Math.max(0, b.totalPriceLkr - (b.discountLkr || 0) + accessoriesTotal - creditAmount);
        return {
          ...b,
          tradeInCreditLkr: creditAmount,
          finalPriceLkr,
        };
      })
    );

    setTradeIns(prev =>
      prev.map(t => (t.id === tradeInId ? { ...t, appliedBookingId: bookingId } : t))
    );
    return { success: true };
  };

  // Reset Demo Data
  const resetDemoData = () => {
    try {
      localStorage.removeItem(`${STORAGE_KEY}_leads`);
      localStorage.removeItem(`${STORAGE_KEY}_bikes`);
      localStorage.removeItem(`${STORAGE_KEY}_bookings`);
      localStorage.removeItem(`${STORAGE_KEY}_employees`);
      localStorage.removeItem(`${STORAGE_KEY}_leaves`);
      localStorage.removeItem(`${STORAGE_KEY}_attendance`);
      localStorage.removeItem(`${STORAGE_KEY}_service`);
      localStorage.removeItem(`${STORAGE_KEY}_accessories`);
      localStorage.removeItem(`${STORAGE_KEY}_testrides`);
      localStorage.removeItem(`${STORAGE_KEY}_tradeins`);
    } catch (e) {
      console.warn('Clear storage error:', e);
    }
    setLeads(INITIAL_LEADS);
    setBikes(INITIAL_BIKES);
    setBookings(INITIAL_BOOKINGS);
    setEmployees(INITIAL_EMPLOYEES);
    setLeaveRequests(INITIAL_LEAVE_REQUESTS);
    setAttendance(INITIAL_ATTENDANCE);
    setServiceJobCards(INITIAL_SERVICE_CARDS);
    setAccessories(INITIAL_ACCESSORIES);
    setTestRides(INITIAL_TEST_RIDES);
    setTradeIns(INITIAL_TRADE_INS);
    setNotificationModal(null);
    setSelectedLeadId(null);
    setSelectedBookingId(null);
    setSelectedBikeId(null);
    setPrintableBookingId(null);
  };

  return (
    <ShowroomContext.Provider
      value={{
        currentUser,
        login,
        logout,
        switchUserRole,
        crmViewMode,
        setCrmViewMode,
        addCallLogToLead,
        updateLeadPriority,
        markLeadLost,
        reassignLead,
        proformaQuoteLeadId,
        setProformaQuoteLeadId,
        currentView,
        setCurrentView,
        currentRole,
        setCurrentRole,
        demoGuideOpen,
        setDemoGuideOpen,
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
        togglePaymentVerification,
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
        applyTradeInToBooking,
        notificationModal,
        openNotificationModal,
        closeNotificationModal,
        resetDemoData,
        selectedLeadId,
        setSelectedLeadId,
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
