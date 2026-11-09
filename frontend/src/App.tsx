import { Outlet, Route, Routes } from 'react-router-dom';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { ScrollToTop } from './components/Page';
import { BookingPage } from './pages/BookingPage';
import { ConferencePage } from './pages/ConferencePage';
import { ContactPage } from './pages/ContactPage';
import { DashboardPage } from './pages/DashboardPage';
import { DiningPage } from './pages/DiningPage';
import { FacilitiesPage } from './pages/FacilitiesPage';
import { GymPage } from './pages/GymPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OffersPage } from './pages/OffersPage';
import { RoomsPage } from './pages/RoomsPage';

function SiteLayout() {
  return (
    <>
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="booking" element={<BookingPage />} />
          <Route path="facilities" element={<FacilitiesPage />} />
          <Route path="dining" element={<DiningPage />} />
          <Route path="conference" element={<ConferencePage />} />
          <Route path="gym" element={<GymPage />} />
          <Route path="offers" element={<OffersPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="dashboard" element={<DashboardPage />} />
      </Routes>
    </>
  );
}
