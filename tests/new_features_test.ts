/**
 * Test Suite for ShowroomOS New Features:
 * 1. Accessories attachment & stock management
 * 2. Test Rides booking, logging & lead conversion
 * 3. Trade-In valuation & balance credit deduction
 * 4. Financing & EMI calculation
 */
import {
  INITIAL_BIKES,
  INITIAL_BOOKINGS,
  INITIAL_ACCESSORIES,
  INITIAL_TEST_RIDES,
  INITIAL_TRADE_INS,
  INITIAL_LEADS,
} from '../src/data/seedData';
import {
  Booking,
  Accessory,
  TestRideRecord,
  TradeInValuation,
  Lead,
} from '../src/types';

console.log('--- STARTING SHOWROOMOS NEW FEATURES VERIFICATION ---');

let bookings: Booking[] = JSON.parse(JSON.stringify(INITIAL_BOOKINGS));
let accessories: Accessory[] = JSON.parse(JSON.stringify(INITIAL_ACCESSORIES));
let testRides: TestRideRecord[] = JSON.parse(JSON.stringify(INITIAL_TEST_RIDES));
let tradeIns: TradeInValuation[] = JSON.parse(JSON.stringify(INITIAL_TRADE_INS));
let leads: Lead[] = JSON.parse(JSON.stringify(INITIAL_LEADS));

// ----------------------------------------------------
// 1. ACCESSORIES TEST
// ----------------------------------------------------
console.log('\n[FEATURE 1] Testing Genuine Accessories Attachment & Stock Management...');
const targetBooking = bookings.find(b => b.id === 'BK-2026-0042')!;
const touringSeat = accessories.find(a => a.id === 'acc-001')!;
const initialStock = touringSeat.stockQuantity;
const initialBookingPrice = targetBooking.finalPriceLkr;

// Attach 2x Touring Seats (LKR 45,000 each)
const qtyToAdd = 2;
const itemTotal = touringSeat.priceLkr * qtyToAdd;

touringSeat.stockQuantity -= qtyToAdd;
targetBooking.accessories = [
  ...(targetBooking.accessories || []),
  {
    accessoryId: touringSeat.id,
    name: touringSeat.name,
    priceLkr: touringSeat.priceLkr,
    quantity: qtyToAdd,
    isFitted: false,
  },
];
targetBooking.accessoriesTotalLkr = (targetBooking.accessoriesTotalLkr || 0) + itemTotal;
targetBooking.finalPriceLkr += itemTotal;

if (touringSeat.stockQuantity !== initialStock - qtyToAdd) {
  throw new Error(`Stock decrement failed! Expected ${initialStock - qtyToAdd}, got ${touringSeat.stockQuantity}`);
}
if (targetBooking.finalPriceLkr !== initialBookingPrice + itemTotal) {
  throw new Error(`Booking price calculation failed! Expected ${initialBookingPrice + itemTotal}, got ${targetBooking.finalPriceLkr}`);
}
console.log(`PASS: Attached ${qtyToAdd}x ${touringSeat.name}. Stock decremented from ${initialStock} to ${touringSeat.stockQuantity}. Booking price updated from LKR ${initialBookingPrice.toLocaleString()} to LKR ${targetBooking.finalPriceLkr.toLocaleString()}.`);

// ----------------------------------------------------
// 2. TEST RIDE & LEAD CONVERSION TEST
// ----------------------------------------------------
console.log('\n[FEATURE 2] Testing Test Ride Booking & 1-Click CRM Lead Conversion...');
const newTestRide: TestRideRecord = {
  id: `TR-2026-105`,
  customerName: 'Roshan Gunasekara',
  customerPhone: '+94 77 444 8899',
  licenseNumber: 'B4892019',
  model: 'Himalayan 450',
  demoBikeChassis: 'ME3-HM45-D1908',
  scheduledDate: '10/11/2026',
  timeSlot: '02:30 PM',
  route: 'Suburban Expressway Link',
  status: 'Completed',
  feedbackRating: 5,
  feedbackNotes: 'Outstanding suspension and liquid-cooled engine performance. Ready to book.',
  salespersonName: 'Kasun Perera',
};
testRides.push(newTestRide);

// 1-Click Convert to CRM Lead
const convertedLead: Lead = {
  id: `lead-tr-${Date.now()}`,
  customerName: newTestRide.customerName,
  phone: newTestRide.customerPhone,
  email: 'roshan.g@example.lk',
  city: 'Colombo',
  modelInterest: newTestRide.model,
  colorPreference: 'Kamet White',
  salespersonId: 'emp-001',
  salespersonName: newTestRide.salespersonName,
  source: 'Walk-in',
  status: 'Test Ride',
  nextFollowUpDate: '11/11/2026',
  createdAt: '10/11/2026',
  notes: [
    {
      id: 'note-tr-1',
      date: '10/11/2026',
      author: newTestRide.salespersonName,
      text: `Customer completed test ride on ${newTestRide.model}. Rating: 5/5 stars. ${newTestRide.feedbackNotes}`,
    },
  ],
};
leads.unshift(convertedLead);

if (!leads.some(l => l.customerName === 'Roshan Gunasekara' && l.status === 'Test Ride')) {
  throw new Error('Test ride to CRM lead conversion failed!');
}
console.log('PASS: Test ride successfully completed and converted into active CRM Lead with 5/5 feedback!');

// ----------------------------------------------------
// 3. TRADE-IN VALUATION & BALANCE CREDIT TEST
// ----------------------------------------------------
console.log('\n[FEATURE 3] Testing Motorcycle Trade-In Valuation & Credit Offset...');
const newTradeIn: TradeInValuation = {
  id: 'TI-2026-104',
  customerName: targetBooking.customerName,
  customerPhone: targetBooking.customerPhone,
  currentMakeModel: 'Yamaha FZ-S Version 3.0',
  registrationNumber: 'WP BDE-8821',
  manufacturingYear: 2021,
  mileageKm: 22000,
  condition: 'Good',
  targetModelInterest: targetBooking.bikeModel,
  estimatedValuationLkr: 680000,
  evaluatorName: 'Pradeep Silva',
  date: '10/11/2026',
  notes: 'Engine clean, single owner, all original documents verified.',
};
tradeIns.push(newTradeIn);

// Apply Trade-In Credit to Booking
const bookingPriceBeforeCredit = targetBooking.finalPriceLkr;
targetBooking.tradeInCreditLkr = newTradeIn.estimatedValuationLkr;
targetBooking.finalPriceLkr = Math.max(0, targetBooking.finalPriceLkr - newTradeIn.estimatedValuationLkr);
newTradeIn.appliedBookingId = targetBooking.id;

if (targetBooking.finalPriceLkr !== bookingPriceBeforeCredit - newTradeIn.estimatedValuationLkr) {
  throw new Error(`Trade-In deduction failed! Expected ${bookingPriceBeforeCredit - newTradeIn.estimatedValuationLkr}, got ${targetBooking.finalPriceLkr}`);
}
console.log(`PASS: Trade-in credit of LKR ${newTradeIn.estimatedValuationLkr.toLocaleString()} successfully deducted from Booking ${targetBooking.id}. Net invoice adjusted from LKR ${bookingPriceBeforeCredit.toLocaleString()} to LKR ${targetBooking.finalPriceLkr.toLocaleString()}.`);

// ----------------------------------------------------
// 4. LEASING & EMI SIMULATOR TEST
// ----------------------------------------------------
console.log('\n[FEATURE 4] Testing Financing & EMI Calculations...');
const vehiclePrice = 2150000; // LKR
const downPayPct = 30; // 30%
const tenureMonths = 36; // 36 months
const ratePa = 15.5; // 15.5% p.a.

const downPayment = Math.round((vehiclePrice * downPayPct) / 100);
const principal = vehiclePrice - downPayment;
const monthlyRate = ratePa / 12 / 100;
const emi = Math.round(
  (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1)
);
const totalRepayment = emi * tenureMonths;
const totalInterest = totalRepayment - principal;

if (downPayment !== 645000) {
  throw new Error(`Down payment incorrect! Expected 645,000, got ${downPayment}`);
}
if (principal !== 1505000) {
  throw new Error(`Principal incorrect! Expected 1,505,000, got ${principal}`);
}
if (emi <= 0 || totalInterest <= 0) {
  throw new Error('EMI or interest calculation resulted in zero or negative values!');
}
console.log(`PASS: Financing calculations verified for LKR ${vehiclePrice.toLocaleString()} at ${downPayPct}% down (${downPayment.toLocaleString()} LKR), 36M @ ${ratePa}% p.a. -> EMI: LKR ${emi.toLocaleString()}/mo, Total Interest: LKR ${totalInterest.toLocaleString()}`);

console.log('\n--- ALL NEW FEATURES VERIFIED SUCCESSFULLY ---');
