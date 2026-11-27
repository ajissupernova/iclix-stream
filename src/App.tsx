import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import { preloadConfiguration } from "./api/images";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import ScrollTopButton from "./components/ScrollTopButton";
import { DetailSkeleton } from "./components/Skeleton";
import { LanguageProvider, useLanguage } from "./context/Language";
import { ToastProvider } from "./context/Toast";
import { WatchlistProvider } from "./context/Watchlist";
import Catalog from "./pages/Catalog";
import Home from "./pages/Home";
import Search from "./pages/Search";
import TvCatalog from "./pages/TvCatalog";
import Admin from "./pages/Admin";
import CollectionPage from "./pages/Collection";

// Halaman detail dan halaman sekunder dimuat saat dibutuhkan agar bundel awal tetap ringan.
const MovieDetail = lazy(() => import("./pages/MovieDetail"));
const MyList = lazy(() => import("./pages/MyList"));
const PersonDetail = lazy(() => import("./pages/PersonDetail"));
const TvDetail = lazy(() => import("./pages/TvDetail"));

preloadConfiguration();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function NotFound() {
  const { copy } = useLanguage();

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-extrabold">{copy.notFound.title}</h1>
      <p className="mt-3 text-mist">{copy.notFound.body}</p>
      <Link
        to="/"
        className="btn-primary mt-6"
      >
        {copy.common.backHome}
      </Link>
    </div>
  );
}

function Shell() {
  const { copy } = useLanguage();
  const { pathname } = useLocation();

  useEffect(() => {
    const root = document.getElementById("root");
    const viewport = window.visualViewport;
    if (!root || !viewport) return;

    const isDetailPage = /^\/(film|serial)\/[^/]+$/.test(pathname);
    const fitZoomedOutViewport = () => {
      if (isDetailPage && viewport.scale < 1) {
        root.style.setProperty("--visual-viewport-width", `${viewport.width}px`);
      } else {
        root.style.removeProperty("--visual-viewport-width");
      }
    };

    fitZoomedOutViewport();
    viewport.addEventListener("resize", fitZoomedOutViewport);
    return () => {
      viewport.removeEventListener("resize", fitZoomedOutViewport);
      root.style.removeProperty("--visual-viewport-width");
    };
  }, [pathname]);

  return (
    <WatchlistProvider>
      <ScrollToTop />
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-clix focus:px-4 focus:py-2 focus:text-paper"
      >
        {copy.common.skipToContent}
      </a>
      <Navbar />
      <main id="konten">
        <Suspense fallback={<DetailSkeleton />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/katalog" element={<Catalog />} />
            <Route path="/film/:id" element={<MovieDetail />} />
            <Route path="/serial" element={<TvCatalog />} />
            <Route path="/serial/:id" element={<TvDetail />} />
            <Route path="/cari" element={<Search />} />
            <Route path="/orang/:id" element={<PersonDetail />} />
            <Route path="/daftar-saya" element={<MyList />} />
            <Route path="/koleksi/:slug" element={<CollectionPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <ScrollTopButton />
    </WatchlistProvider>
  );
}

function AppRoute() {
  const { pathname } = useLocation();
  if (pathname === "/kelola") return <Admin />;
  return <Shell />;
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <ToastProvider>
          <AppRoute />
        </ToastProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
