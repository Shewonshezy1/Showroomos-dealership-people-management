/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShowroomProvider, useShowroom } from './context/ShowroomContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './views/DashboardView';
import { CrmView } from './views/CrmView';
import { InventoryView } from './views/InventoryView';
import { BookingsView } from './views/BookingsView';
import { DeliveryView } from './views/DeliveryView';
import { HrView } from './views/HrView';
import { ServiceView } from './views/ServiceView';
import { ReportsView } from './views/ReportsView';
import { AccessoriesView } from './views/AccessoriesView';
import { TestRidesView } from './views/TestRidesView';
import { TradeInView } from './views/TradeInView';
import { FinancingView } from './views/FinancingView';
import { AdminView } from './views/AdminView';

// Modals & Drawers
import { LeadDetailDrawer } from './components/crm/LeadDetailDrawer';
import { NewLeadModal } from './components/crm/NewLeadModal';
import { ConvertLeadModal } from './components/crm/ConvertLeadModal';
import { BookingDetailDrawer } from './components/bookings/BookingDetailDrawer';
import { NewBookingModal } from './components/bookings/NewBookingModal';
import { AddPaymentModal } from './components/bookings/AddPaymentModal';
import { BikeDetailDrawer } from './components/inventory/BikeDetailDrawer';
import { NewBikeModal } from './components/inventory/NewBikeModal';
import { PrintableBookingModal } from './components/common/PrintableBookingModal';
import { NotificationSimulatorModal } from './components/common/NotificationSimulatorModal';
import { LoginView } from './components/auth/LoginView';
import { ProformaQuotationModal } from './components/crm/ProformaQuotationModal';
import { ROLE_LABELS } from './auth/permissions';
import { ShieldAlert, X } from 'lucide-react';

const MainContent: React.FC = () => {
  const {
    authStatus,
    currentView,
    setCurrentView,
    currentUser,
    canView,
    operationError,
    clearOperationError,
  } = useShowroom();

  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);
  const [newBookingModalOpen, setNewBookingModalOpen] = useState(false);
  const [newBikeModalOpen, setNewBikeModalOpen] = useState(false);
  const [convertModalLeadId, setConvertModalLeadId] = useState<string | null>(null);
  const [addPaymentBookingId, setAddPaymentBookingId] = useState<string | null>(null);
  const [selectedBikeForBooking, setSelectedBikeForBooking] = useState<string | undefined>();

  // Protected route gate: show LoginView unless Firebase Auth & active staff profile are verified
  if (authStatus !== 'active' || !currentUser || currentUser.disabled) {
    return <LoginView />;
  }

  const handleOpenBookingForBike = (bikeId: string) => {
    setSelectedBikeForBooking(bikeId);
    setNewBookingModalOpen(true);
  };

  const viewAuthorized = canView(currentView);

  return (
    <div className="flex flex-col min-h-screen bg-[#101114] text-stone-100 font-sans">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto bg-[#0d0e11] p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-4">
            {operationError && (
              <div className="bg-rose-950/70 border border-rose-800 rounded-xl p-3.5 text-xs text-rose-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{operationError}</span>
                </div>
                <button
                  type="button"
                  onClick={clearOperationError}
                  className="p-1 text-rose-300 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {!viewAuthorized ? (
              <div className="bg-[#18191d] border border-rose-900/60 rounded-xl p-8 max-w-lg mx-auto text-center space-y-3 mt-10">
                <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
                <h2 className="text-lg font-bold text-white">Access Denied</h2>
                <p className="text-xs text-stone-300 leading-relaxed">
                  Your assigned role (<strong>{ROLE_LABELS[currentUser.role]}</strong>) does not have permission to open the <strong>{currentView}</strong> module.
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentView('dashboard')}
                  className="px-4 py-2 bg-[#9b1c1c] hover:bg-[#b91c1c] text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            ) : (
              <>
                {currentView === 'dashboard' && (
                  <DashboardView
                    onOpenNewLead={() => setNewLeadModalOpen(true)}
                    onOpenNewBooking={() => setNewBookingModalOpen(true)}
                  />
                )}
                {currentView === 'crm' && (
                  <CrmView
                    onOpenNewLead={() => setNewLeadModalOpen(true)}
                    onOpenConvertModal={leadId => setConvertModalLeadId(leadId)}
                  />
                )}
                {currentView === 'inventory' && (
                  <InventoryView
                    onOpenNewBike={() => setNewBikeModalOpen(true)}
                    onOpenBookingForBike={handleOpenBookingForBike}
                  />
                )}
                {currentView === 'bookings' && (
                  <BookingsView
                    onOpenNewBooking={() => setNewBookingModalOpen(true)}
                    onOpenAddPayment={bId => setAddPaymentBookingId(bId)}
                  />
                )}
                {currentView === 'delivery' && <DeliveryView />}
                {currentView === 'accessories' && <AccessoriesView />}
                {currentView === 'testrides' && <TestRidesView />}
                {currentView === 'tradein' && <TradeInView />}
                {currentView === 'financing' && <FinancingView />}
                {currentView === 'hr' && <HrView />}
                {currentView === 'service' && <ServiceView />}
                {currentView === 'reports' && <ReportsView />}
                {currentView === 'admin' && <AdminView />}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Drawers & Modals */}
      <LeadDetailDrawer onOpenConvertModal={leadId => setConvertModalLeadId(leadId)} />
      <NewLeadModal isOpen={newLeadModalOpen} onClose={() => setNewLeadModalOpen(false)} />
      <ConvertLeadModal leadId={convertModalLeadId} onClose={() => setConvertModalLeadId(null)} />
      <BookingDetailDrawer onOpenAddPayment={bId => setAddPaymentBookingId(bId)} />
      <NewBookingModal
        isOpen={newBookingModalOpen}
        initialBikeId={selectedBikeForBooking}
        onClose={() => {
          setNewBookingModalOpen(false);
          setSelectedBikeForBooking(undefined);
        }}
      />
      <AddPaymentModal bookingId={addPaymentBookingId} onClose={() => setAddPaymentBookingId(null)} />
      <BikeDetailDrawer onOpenBookingForBike={handleOpenBookingForBike} />
      <NewBikeModal isOpen={newBikeModalOpen} onClose={() => setNewBikeModalOpen(false)} />
      <PrintableBookingModal />
      <ProformaQuotationModal />
      <NotificationSimulatorModal />
    </div>
  );
};

export default function App() {
  return (
    <ShowroomProvider>
      <MainContent />
    </ShowroomProvider>
  );
}
