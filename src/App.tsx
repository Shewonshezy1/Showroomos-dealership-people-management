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
import { DemoGuideModal } from './components/common/DemoGuideModal';
import { ResetConfirmModal } from './components/common/ResetConfirmModal';
import { NotificationSimulatorModal } from './components/common/NotificationSimulatorModal';

import { LoginView } from './components/auth/LoginView';
import { ProformaQuotationModal } from './components/crm/ProformaQuotationModal';

const MainContent: React.FC = () => {
  const { currentView, currentUser } = useShowroom();

  // If user is not authenticated, display login portal
  if (!currentUser) {
    return <LoginView />;
  }

  // Modal triggers
  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);
  const [newBookingModalOpen, setNewBookingModalOpen] = useState(false);
  const [newBikeModalOpen, setNewBikeModalOpen] = useState(false);
  const [convertModalLeadId, setConvertModalLeadId] = useState<string | null>(null);
  const [addPaymentBookingId, setAddPaymentBookingId] = useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedBikeForBooking, setSelectedBikeForBooking] = useState<string | undefined>();

  const handleOpenBookingForBike = (bikeId: string) => {
    // When reserving directly from an inventory card
    setSelectedBikeForBooking(bikeId);
    setNewBookingModalOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#101114] text-stone-100 font-sans">
      {/* Top Header */}
      <Header onOpenResetModal={() => setResetModalOpen(true)} />

      {/* Main Workspace: Sidebar + Content Canvas */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto bg-[#0d0e11] p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {currentView === 'dashboard' && (
              <DashboardView
                onOpenNewLead={() => setNewLeadModalOpen(true)}
                onOpenNewBooking={() => setNewBookingModalOpen(true)}
              />
            )}
            {currentView === 'crm' && (
              <CrmView
                onOpenNewLead={() => setNewLeadModalOpen(true)}
                onOpenConvertModal={(leadId) => setConvertModalLeadId(leadId)}
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
                onOpenAddPayment={(bId) => setAddPaymentBookingId(bId)}
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
          </div>
        </main>
      </div>

      {/* Drawers & Modals */}
      <LeadDetailDrawer
        onOpenConvertModal={(leadId) => setConvertModalLeadId(leadId)}
      />
      <NewLeadModal
        isOpen={newLeadModalOpen}
        onClose={() => setNewLeadModalOpen(false)}
      />
      <ConvertLeadModal
        leadId={convertModalLeadId}
        onClose={() => setConvertModalLeadId(null)}
      />
      <BookingDetailDrawer
        onOpenAddPayment={(bId) => setAddPaymentBookingId(bId)}
      />
      <NewBookingModal
        isOpen={newBookingModalOpen}
        initialBikeId={selectedBikeForBooking}
        onClose={() => {
          setNewBookingModalOpen(false);
          setSelectedBikeForBooking(undefined);
        }}
      />
      <AddPaymentModal
        bookingId={addPaymentBookingId}
        onClose={() => setAddPaymentBookingId(null)}
      />
      <BikeDetailDrawer
        onOpenBookingForBike={handleOpenBookingForBike}
      />
      <NewBikeModal
        isOpen={newBikeModalOpen}
        onClose={() => setNewBikeModalOpen(false)}
      />
      <PrintableBookingModal />
      <ProformaQuotationModal />
      <DemoGuideModal />
      <ResetConfirmModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
      />
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
