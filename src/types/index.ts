/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Test Ride'
  | 'Quoted'
  | 'Booked'
  | 'Closed'
  | 'Lost';

export type LeadSource =
  | 'Walk-in'
  | 'Digital inquiry'
  | 'Test ride event'
  | 'Test Ride Experience'
  | 'Phone'
  | 'Referral';

export interface LeadNote {
  id: string;
  date: string; // DD/MM/YYYY
  author: string;
  text: string;
}

export type LeadPriority = 'Hot' | 'Warm' | 'Cold';

export interface CallLog {
  id: string;
  date: string; // DD/MM/YYYY HH:mm
  timestamp?: string; // formatted date & time
  caller: string;
  outcome: 'Interested' | 'Scheduled Test Ride' | 'Price Objection' | 'Follow Up Later' | 'Unreachable';
  notes: string;
  nextFollowUp?: string;
}

export interface Lead {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  city: string;
  modelInterest: string;
  colorPreference: string;
  salespersonId: string;
  salespersonName: string;
  source: LeadSource;
  status: LeadStatus;
  priority?: LeadPriority;
  budgetLkr?: number;
  lostReason?: string;
  callLogs?: CallLog[];
  nextFollowUpDate: string; // DD/MM/YYYY
  notes: LeadNote[];
  createdAt: string; // DD/MM/YYYY
  bookingId?: string;
}

export type BikeStatus = 'Available' | 'Reserved' | 'Demo' | 'Delivered';

export type BikeLocation =
  | 'Colombo Flagship Floor'
  | 'Warehouse A - Kelaniya'
  | 'Colombo 03 Transit'
  | 'Pre-Delivery Bay';

export interface Bike {
  id: string;
  model: string;
  variant: string;
  colour: string;
  chassisNumber: string; // synthetic VIN
  engineNumber: string; // synthetic engine no
  year: number;
  location: BikeLocation;
  priceLkr: number; // Illustrative price in LKR
  status: BikeStatus;
  imageKey: string;
  imageUrl?: string;
  allocatedBookingId?: string;
  arrivalDate: string; // DD/MM/YYYY
  displacementCc: number;
  powerBhp: string;
}

export type PaymentType =
  | 'Booking Advance'
  | 'Down Payment'
  | 'Finance Settlement'
  | 'Final Settlement';

export interface PaymentRecord {
  id: string;
  date: string; // DD/MM/YYYY
  amountLkr: number;
  type: PaymentType;
  reference: string;
  status: 'Pending Verification' | 'Verified' | 'Reversed';
  entryType?: 'PAYMENT' | 'REVERSAL';
  reversesPaymentId?: string;
  reversedByPaymentId?: string;
  requestId?: string;
  recordedByUid?: string;
  verifiedBy?: string;
  verifiedByUid?: string;
  verifiedAt?: string;
  notes?: string;
}

export interface DeliveryChecklist {
  paymentVerified: boolean; // Balance 0 and all payments verified
  documentsChecked: boolean; // NIC copy, Revenue License application, Registration docs, Insurance cover note
  pdiCompleted: boolean; // Battery check, mirror install, toolkit, fluids, tire pressure, road test
  customerOrientationDone: boolean; // Features, warranty, first service schedule
  deliveryNotes: string;
}

export type BookingStatus = 'Confirmed' | 'Delivered' | 'Cancelled';

export interface BookingTimelineItem {
  id: string;
  date: string; // DD/MM/YYYY HH:mm
  title: string;
  description: string;
  type: 'lead' | 'booking' | 'payment' | 'pdi' | 'delivery' | 'status';
}

export interface BookingAccessoryItem {
  accessoryId: string;
  name: string;
  partNumber?: string;
  priceLkr: number;
  quantity: number;
  installationStatus?: 'Pending Installation' | 'Installed at PDI' | 'Handover OTC';
  isFitted?: boolean;
}

export interface Booking {
  id: string; // e.g. BK-2026-0042
  leadId?: string;
  customerName: string;
  customerPhone: string;
  customerNIC: string; // Synthetic masked NIC
  customerAddress: string;
  salespersonId: string;
  salespersonName: string;
  bikeId: string;
  bikeModel: string;
  bikeColour: string;
  bikeChassis: string;
  bikeEngine: string;
  totalPriceLkr: number;
  discountRequestedLkr?: number;
  discountLkr: number;
  discountStatus?: 'None' | 'Pending' | 'Approved' | 'Rejected';
  discountApprovedByUid?: string;
  finalPriceLkr: number;
  verifiedPaidLkr?: number;
  balanceLkr?: number;
  accessories?: BookingAccessoryItem[];
  accessoriesTotalLkr?: number;
  tradeInCreditLkr?: number;
  appliedTradeInId?: string;
  payments: PaymentRecord[];
  status: BookingStatus;
  deliveryChecklist: DeliveryChecklist;
  deliveredAt?: string;
  deliveredBy?: string;
  cancellationReason?: string;
  requestId?: string;
  createdByUid?: string;
  createdAt: string; // DD/MM/YYYY
  timeline: BookingTimelineItem[];
}

export interface Accessory {
  id: string;
  partNumber: string;
  name: string;
  category:
    | 'Performance & Protection'
    | 'Luggage & Touring'
    | 'Seats & Comfort'
    | 'Styling & Wheels'
    | 'Riding Apparel';
  compatibleModels: string[];
  priceLkr: number;
  stockQuantity: number;
  description: string;
  imageIcon: string;
}

export interface TestRideRecord {
  id: string;
  leadId?: string;
  customerName: string;
  customerPhone: string;
  licenseNumber: string; // synthetic Sri Lankan license
  model: string;
  demoBikeChassis: string;
  scheduledDate: string; // DD/MM/YYYY
  timeSlot: string; // e.g. "10:30 AM"
  route: 'Urban Colombo Circuit' | 'Marine Drive Coastal Route' | 'Suburban Expressway Link';
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'No Show';
  feedbackRating?: number; // 1-5
  feedbackNotes?: string;
  salespersonName: string;
  convertedToLeadId?: string;
  createdByUid?: string;
}

export type TradeInStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Applied';

export interface TradeInValuation {
  id: string;
  customerName: string;
  customerPhone: string;
  currentMakeModel: string; // e.g. "Bajaj Pulsar 150"
  registrationNumber: string; // e.g. "WP BCN-4412"
  manufacturingYear: number;
  mileageKm: number;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Requires Reconditioning';
  targetModelInterest: string; // e.g. "Classic 350"
  estimatedValuationLkr: number;
  status?: TradeInStatus;
  approvedBy?: string;
  approvedByUid?: string;
  approvedAt?: string;
  appliedBookingId?: string;
  evaluatorName: string;
  date: string;
  notes: string;
  createdByUid?: string;
}

export interface EmployeeSalary {
  basicLkr: number;
  showroomAllowanceLkr: number;
  salesIncentiveLkr: number;
  illustrativeDeductionsLkr: number;
}

export interface Employee {
  id: string;
  empCode: string;
  fullName: string;
  department: 'Sales' | 'Service & PDI' | 'Showroom Operations' | 'Finance & Admin';
  role: string;
  manager: string;
  email: string;
  phone: string;
  status: 'Active' | 'On Leave';
  joinDate: string; // DD/MM/YYYY
  salary: EmployeeSalary;
}

export type AttendanceStatus = 'Present' | 'Late' | 'Half Day' | 'On Leave';

export interface AttendanceRecord {
  id: string;
  date: string; // DD/MM/YYYY
  employeeId: string;
  employeeName: string;
  department: string;
  status: AttendanceStatus;
  checkInTime: string;
  notes: string;
}

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: 'Annual' | 'Casual' | 'Medical';
  startDate: string; // DD/MM/YYYY
  endDate: string; // DD/MM/YYYY
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string; // DD/MM/YYYY
  decisionDate?: string;
  decisionBy?: string;
  decisionByUid?: string;
}

export interface ServiceJobCard {
  id: string;
  customerName: string;
  customerPhone: string;
  bikeModel: string;
  chassisNumber: string;
  serviceType:
    | 'Pre-Delivery Inspection (PDI)'
    | '1st Free Service (500 km)'
    | 'General Service & Oil'
    | 'Warranty Inspection';
  technicianName: string;
  bay: string;
  status: 'Scheduled' | 'In Progress' | 'Inspection Completed' | 'Ready for Handover';
  scheduledDate: string; // DD/MM/YYYY
  notes: string;
  estimatedCostLkr: number;
}

export type UserRole =
  | 'admin'
  | 'general_manager'
  | 'sales'
  | 'finance'
  | 'hr'
  | 'service'
  | 'stock';

export type DemoRole = UserRole;

export interface UserSession {
  id: string;
  uid: string;
  fullName: string;
  name?: string;
  email: string;
  role: UserRole;
  designation: string;
  roleLabel?: string;
  department: string;
  branch: string;
  disabled: boolean;
  invitedBy?: string;
  avatarUrl?: string;
  phone?: string;
}

export interface StaffInvite {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  designation: string;
  department: string;
  branch: string;
  status: 'Pending' | 'Accepted' | 'Revoked';
  invitedByUid: string;
  createdAt?: string;
}

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  actorEmail: string;
  actorRole: UserRole;
  action: string;
  collection: string;
  recordId: string;
  requestId?: string;
  changes?: Record<string, unknown>;
  createdAt: string;
}

export type AppView =
  | 'dashboard'
  | 'crm'
  | 'inventory'
  | 'bookings'
  | 'delivery'
  | 'accessories'
  | 'testrides'
  | 'tradein'
  | 'financing'
  | 'hr'
  | 'service'
  | 'reports'
  | 'admin';

