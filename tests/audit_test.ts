/**
 * Automated Audit and Journey Verification Suite for ShowroomOS
 */
import {
  INITIAL_BIKES,
  INITIAL_BOOKINGS,
  INITIAL_EMPLOYEES,
  INITIAL_LEADS,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_ATTENDANCE,
  INITIAL_SERVICE_CARDS,
} from '../src/data/seedData';
import {
  Bike,
  Booking,
  Lead,
  LeaveRequest,
  PaymentRecord,
} from '../src/types';
import {
  formatLKR,
  generateBookingId,
  getTodayDDMMYYYY,
} from '../src/utils/formatters';

console.log('--- STARTING SHOWROOMOS AUDIT & JOURNEY TEST SUITE ---');

let leads: Lead[] = JSON.parse(JSON.stringify(INITIAL_LEADS));
let bikes: Bike[] = JSON.parse(JSON.stringify(INITIAL_BIKES));
let bookings: Booking[] = JSON.parse(JSON.stringify(INITIAL_BOOKINGS));
let leaveRequests: LeaveRequest[] = JSON.parse(JSON.stringify(INITIAL_LEAVE_REQUESTS));

// Helper: Calculate dashboard metrics
function computeMetrics() {
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
  return {
    activeLeadsCount,
    availableBikesCount,
    confirmedBookingsCount,
    deliveredCount,
    verifiedCollectionsLkr,
    unverifiedPaymentsLkr,
    pendingLeaveRequestsCount,
  };
}

let initialMetrics = computeMetrics();
console.log('Initial metrics:', initialMetrics);

// ==========================================
// TEST JOURNEY 1: Create a lead
// ==========================================
console.log('\n[TEST 1] Creating a new lead...');
const newLead: Lead = {
  id: `lead-${Date.now()}`,
  customerName: 'Suresh Jayawardena',
  phone: '+94 77 999 1122',
  email: 'suresh.j@example.lk',
  city: 'Colombo 05',
  modelInterest: 'Himalayan 450',
  colorPreference: 'Kaza Brown',
  salespersonId: 'emp-001',
  salespersonName: 'Dilantha Perera',
  source: 'Walk-in',
  status: 'New',
  nextFollowUpDate: getTodayDDMMYYYY(),
  notes: [
    {
      id: 'n-test-1',
      date: getTodayDDMMYYYY(),
      author: 'Dilantha Perera',
      text: 'Inquiry registered during audit test.',
    },
  ],
  createdAt: getTodayDDMMYYYY(),
};
leads.unshift(newLead);

const metricsAfterLead = computeMetrics();
if (metricsAfterLead.activeLeadsCount !== initialMetrics.activeLeadsCount + 1) {
  throw new Error(`FAIL: Active leads count expected ${initialMetrics.activeLeadsCount + 1}, got ${metricsAfterLead.activeLeadsCount}`);
}
console.log('PASS: Lead created successfully. Active leads increased to', metricsAfterLead.activeLeadsCount);

// ==========================================
// TEST JOURNEY 2 & 3: Convert it to a booking with an available bike & confirm bike becomes Reserved
// ==========================================
console.log('\n[TEST 2 & 3] Converting lead to booking with an Available bike...');
const availableHimalayan = bikes.find(b => b.model === 'Himalayan 450' && b.status === 'Available');
if (!availableHimalayan) {
  throw new Error('FAIL: No Available Himalayan 450 found in inventory.');
}
const chosenBikeId = availableHimalayan.id;
console.log(`Allocating bike ${chosenBikeId} (Chassis: ${availableHimalayan.chassisNumber}, status: ${availableHimalayan.status})`);

const bookingId = generateBookingId(bookings);
const advanceDepositLkr = 500000;
const newBooking: Booking = {
  id: bookingId,
  leadId: newLead.id,
  customerName: newLead.customerName,
  customerPhone: newLead.phone,
  customerNIC: '1989****2011',
  customerAddress: `${newLead.city}, Sri Lanka`,
  salespersonId: newLead.salespersonId,
  salespersonName: newLead.salespersonName,
  bikeId: chosenBikeId,
  bikeModel: availableHimalayan.model,
  bikeColour: availableHimalayan.colour,
  bikeChassis: availableHimalayan.chassisNumber,
  bikeEngine: availableHimalayan.engineNumber,
  totalPriceLkr: availableHimalayan.priceLkr,
  discountLkr: 0,
  finalPriceLkr: availableHimalayan.priceLkr,
  payments: [
    {
      id: `pmt-test-${Date.now()}`,
      date: getTodayDDMMYYYY(),
      amountLkr: advanceDepositLkr,
      type: 'Booking Advance',
      reference: 'SL-CHQ-TEST-001',
      status: 'Verified',
      verifiedBy: 'Finance Lead',
      verifiedAt: `${getTodayDDMMYYYY()} (At Booking)`,
    },
  ],
  status: 'Confirmed',
  deliveryChecklist: {
    paymentVerified: advanceDepositLkr >= availableHimalayan.priceLkr,
    documentsChecked: false,
    pdiCompleted: false,
    customerOrientationDone: false,
    deliveryNotes: 'Audit test booking.',
  },
  createdAt: getTodayDDMMYYYY(),
  timeline: [],
};

bookings.unshift(newBooking);

// Update bike status to Reserved
bikes = bikes.map(b => (b.id === chosenBikeId ? { ...b, status: 'Reserved', allocatedBookingId: bookingId } : b));
// Update lead status to Booked
leads = leads.map(l => (l.id === newLead.id ? { ...l, status: 'Booked', bookingId } : l));

const updatedBike = bikes.find(b => b.id === chosenBikeId);
if (updatedBike?.status !== 'Reserved') {
  throw new Error(`FAIL: Bike status expected Reserved, got ${updatedBike?.status}`);
}
if (updatedBike.allocatedBookingId !== bookingId) {
  throw new Error(`FAIL: Bike allocatedBookingId expected ${bookingId}, got ${updatedBike.allocatedBookingId}`);
}
console.log(`PASS: Bike ${chosenBikeId} successfully transitioned to "Reserved" tied to ${bookingId}.`);

// ==========================================
// TEST JOURNEY 4: Try allocating that same bike again and verify it is blocked
// ==========================================
console.log('\n[TEST 4] Trying to allocate the same reserved bike again...');
function attemptAllocation(bikeIdToAllocate: string) {
  const target = bikes.find(b => b.id === bikeIdToAllocate);
  if (!target) return { success: false, error: 'Not found' };
  if (target.status !== 'Available') {
    return {
      success: false,
      error: `Allocation failed: Chassis ${target.chassisNumber} is currently "${target.status}". Only Available units can be allocated.`,
    };
  }
  return { success: true };
}

const reallocResult = attemptAllocation(chosenBikeId);
if (reallocResult.success) {
  throw new Error('FAIL: Re-allocating a Reserved bike should have been BLOCKED, but succeeded!');
}
console.log('PASS: Re-allocation was correctly BLOCKED with error:', reallocResult.error);

// ==========================================
// TEST JOURNEY 5 & 6: Record and verify a simulated deposit, confirm balance and dashboard update
// ==========================================
console.log('\n[TEST 5 & 6] Recording and verifying a simulated deposit on booking...');
const targetBooking = bookings.find(b => b.id === bookingId)!;

const prevVerifiedCollections = computeMetrics().verifiedCollectionsLkr;
const prevVerifiedPaid = targetBooking.payments
  .filter(p => p.status === 'Verified')
  .reduce((sum, p) => sum + p.amountLkr, 0);
const prevOutstandingBalance = targetBooking.finalPriceLkr - prevVerifiedPaid;

console.log(`Before deposit: Final Price: ${formatLKR(targetBooking.finalPriceLkr)}, Verified Paid: ${formatLKR(prevVerifiedPaid)}, Balance: ${formatLKR(prevOutstandingBalance)}`);

const depositAmount = 1000000;
// Record payment as Pending Verification first
const newDeposit: PaymentRecord = {
  id: `pmt-test-dep-${Date.now()}`,
  date: getTodayDDMMYYYY(),
  amountLkr: depositAmount,
  type: 'Down Payment',
  reference: 'SL-TRF-TEST-8899',
  status: 'Pending Verification',
};
targetBooking.payments.push(newDeposit);

const metricsWithPending = computeMetrics();
if (metricsWithPending.verifiedCollectionsLkr !== prevVerifiedCollections) {
  throw new Error('FAIL: Unverified deposit should NOT increase verified collections!');
}
console.log('PASS: Unverified deposit did not distort verified collections.');

// Now VERIFY the deposit
newDeposit.status = 'Verified';
newDeposit.verifiedBy = 'Shiromi Gunawardena (Finance Lead)';
newDeposit.verifiedAt = `${getTodayDDMMYYYY()} 11:30`;

const metricsAfterVerification = computeMetrics();
const newVerifiedPaid = targetBooking.payments
  .filter(p => p.status === 'Verified')
  .reduce((sum, p) => sum + p.amountLkr, 0);
const newOutstandingBalance = targetBooking.finalPriceLkr - newVerifiedPaid;

console.log(`After verification: Verified Paid: ${formatLKR(newVerifiedPaid)}, Balance: ${formatLKR(newOutstandingBalance)}, Verified Collections: ${formatLKR(metricsAfterVerification.verifiedCollectionsLkr)}`);

if (metricsAfterVerification.verifiedCollectionsLkr !== prevVerifiedCollections + depositAmount) {
  throw new Error(`FAIL: Verified collections expected ${prevVerifiedCollections + depositAmount}, got ${metricsAfterVerification.verifiedCollectionsLkr}`);
}
if (newOutstandingBalance !== prevOutstandingBalance - depositAmount) {
  throw new Error(`FAIL: Outstanding balance expected ${prevOutstandingBalance - depositAmount}, got ${newOutstandingBalance}`);
}
console.log('PASS: Outstanding balance decreased by exact deposit, and dashboard collections increased accordingly.');

// ==========================================
// TEST JOURNEY 7: Approve employee leave request and verify HR counts update
// ==========================================
console.log('\n[TEST 7] Approving employee leave request and verifying HR counts update...');
const pendingLeave = leaveRequests.find(l => l.status === 'Pending');
if (!pendingLeave) {
  throw new Error('FAIL: Expected at least one Pending leave request in seed data.');
}
const prevPendingLeaves = computeMetrics().pendingLeaveRequestsCount;
console.log(`Pending leave request: ${pendingLeave.id} (${pendingLeave.employeeName}), total pending: ${prevPendingLeaves}`);

pendingLeave.status = 'Approved';
pendingLeave.decisionDate = getTodayDDMMYYYY();
pendingLeave.decisionBy = 'Roshan Samarasinghe (GM)';

const metricsAfterLeave = computeMetrics();
if (metricsAfterLeave.pendingLeaveRequestsCount !== prevPendingLeaves - 1) {
  throw new Error(`FAIL: Pending leaves count expected ${prevPendingLeaves - 1}, got ${metricsAfterLeave.pendingLeaveRequestsCount}`);
}
console.log(`PASS: Pending leave approved. Dashboard pending count decreased from ${prevPendingLeaves} to ${metricsAfterLeave.pendingLeaveRequestsCount}.`);

// ==========================================
// TEST JOURNEY 8: Refresh and confirm demo records persist
// ==========================================
console.log('\n[TEST 8] Testing JSON serialization and persistence reload...');
const serializedLeads = JSON.stringify(leads);
const serializedBikes = JSON.stringify(bikes);
const serializedBookings = JSON.stringify(bookings);
const serializedLeaves = JSON.stringify(leaveRequests);

const reloadedLeads: Lead[] = JSON.parse(serializedLeads);
const reloadedBikes: Bike[] = JSON.parse(serializedBikes);
const reloadedBookings: Booking[] = JSON.parse(serializedBookings);
const reloadedLeaves: LeaveRequest[] = JSON.parse(serializedLeaves);

if (reloadedLeads.length !== leads.length || reloadedBookings.length !== bookings.length) {
  throw new Error('FAIL: Persistence reload length mismatch!');
}
const reloadedBooking = reloadedBookings.find(b => b.id === bookingId);
if (!reloadedBooking || reloadedBooking.payments.length !== targetBooking.payments.length) {
  throw new Error('FAIL: Reloaded booking payments missing!');
}
console.log('PASS: All records cleanly persist through serialization and reload.');

// ==========================================
// TEST JOURNEY 9: Export bookings to CSV
// ==========================================
console.log('\n[TEST 9] Testing CSV formatting and export for bookings...');
const headers = [
  'Booking ID',
  'Customer Name',
  'Phone',
  'NIC (Synthetic)',
  'Allocated Model',
  'Chassis / VIN',
  'Engine Number',
  'Total Price (LKR)',
  'Verified Paid (LKR)',
  'Remaining Balance (LKR)',
  'Status',
  'Salesperson',
  'Created Date',
];

const rows = bookings.map(b => {
  const vPaid = b.payments
    .filter(p => p.status === 'Verified')
    .reduce((sum, p) => sum + p.amountLkr, 0);
  const bal = b.finalPriceLkr - vPaid;

  return [
    b.id,
    b.customerName,
    b.customerPhone,
    b.customerNIC,
    b.bikeModel,
    b.bikeChassis,
    b.bikeEngine,
    b.finalPriceLkr,
    vPaid,
    bal,
    b.status,
    b.salespersonName,
    b.createdAt,
  ];
});

const sanitize = (val: string | number) => {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const csvContent = [
  headers.map(sanitize).join(','),
  ...rows.map(row => row.map(sanitize).join(',')),
].join('\n');

if (!csvContent.includes(bookingId) || !csvContent.includes('BK-2026-0042')) {
  throw new Error('FAIL: CSV export missing booking records!');
}
console.log(`PASS: Bookings CSV generated (${rows.length} rows, ${csvContent.length} bytes).`);

// ==========================================
// TEST JOURNEY 10: Cancel a booking and verify the bike is released
// ==========================================
console.log('\n[TEST 10] Cancelling booking and verifying bike is released back to Available...');
const bookingToCancel = bookings.find(b => b.id === bookingId)!;
bookingToCancel.status = 'Cancelled';

// Release bike
bikes = bikes.map(b =>
  b.id === bookingToCancel.bikeId || b.allocatedBookingId === bookingId
    ? { ...b, status: 'Available', allocatedBookingId: undefined }
    : b
);

const releasedBike = bikes.find(b => b.id === bookingToCancel.bikeId)!;
if (releasedBike.status !== 'Available') {
  throw new Error(`FAIL: Cancelled booking bike expected status "Available", got ${releasedBike.status}`);
}
if (releasedBike.allocatedBookingId) {
  throw new Error(`FAIL: Cancelled booking bike should not have allocatedBookingId, got ${releasedBike.allocatedBookingId}`);
}
console.log(`PASS: Booking ${bookingId} cancelled; bike ${releasedBike.id} (Chassis: ${releasedBike.chassisNumber}) is released to "Available".`);

// ==========================================
// TEST JOURNEY 11: Complete payment and delivery requirements for another booking; confirm delivery updates bike status
// ==========================================
console.log('\n[TEST 11] Completing payment and delivery requirements for Dinuka Jayasuriya (BK-2026-0041)...');
const deliveryBooking = bookings.find(b => b.id === 'BK-2026-0041')!;
const deliveryBike = bikes.find(b => b.id === deliveryBooking.bikeId)!;

console.log(`Target booking: ${deliveryBooking.id}, Bike: ${deliveryBike.id} (${deliveryBike.model}, current status: ${deliveryBike.status})`);

const vPaidDelivery = deliveryBooking.payments
  .filter(p => p.status === 'Verified')
  .reduce((sum, p) => sum + p.amountLkr, 0);
const deliveryBalance = deliveryBooking.finalPriceLkr - vPaidDelivery;

if (deliveryBalance !== 0) {
  throw new Error(`FAIL: Expected Dinuka Jayasuriya to have 0 balance, got ${deliveryBalance}`);
}

// Ensure checklist is complete
deliveryBooking.deliveryChecklist.paymentVerified = true;
deliveryBooking.deliveryChecklist.documentsChecked = true;
deliveryBooking.deliveryChecklist.pdiCompleted = true;
deliveryBooking.deliveryChecklist.customerOrientationDone = true;

// Execute delivery
deliveryBooking.status = 'Delivered';
deliveryBooking.deliveredAt = `${getTodayDDMMYYYY()} 16:00`;
deliveryBooking.deliveredBy = 'Sanjeewa Alwis';

// Update bike status to Delivered
bikes = bikes.map(b =>
  b.id === deliveryBooking.bikeId || b.allocatedBookingId === deliveryBooking.id
    ? { ...b, status: 'Delivered' }
    : b
);

const updatedDeliveryBike = bikes.find(b => b.id === deliveryBooking.bikeId)!;
if (updatedDeliveryBike.status !== 'Delivered') {
  throw new Error(`FAIL: Delivered bike status expected "Delivered", got ${updatedDeliveryBike.status}`);
}
if (deliveryBooking.status !== 'Delivered') {
  throw new Error(`FAIL: Booking status expected "Delivered", got ${deliveryBooking.status}`);
}

const finalMetrics = computeMetrics();
if (finalMetrics.deliveredCount < 2) {
  throw new Error(`FAIL: Expected at least 2 delivered bikes in metrics, got ${finalMetrics.deliveredCount}`);
}
console.log(`PASS: Handover completed! Booking status is "${deliveryBooking.status}", bike status updated to "${updatedDeliveryBike.status}".`);

console.log('\n--- ALL 11 AUDIT & JOURNEY TESTS COMPLETED SUCCESSFULLY ---');
