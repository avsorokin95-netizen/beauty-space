import { MotionConfig } from "framer-motion";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { About } from "./components/About";
import { Services } from "./components/Services";
import { Gallery } from "./components/Gallery";
import { Contacts } from "./components/Contacts";
import { Reviews } from "./components/Reviews";
import { lazy, Suspense } from "react";
import { ContactsProvider } from "./components/ContactsProvider";
const Admin = lazy(() => import("./components/admin/Admin"));
export default function App() {
  if (window.location.pathname.replace(/\/$/, "") === "/admin") {
    return (
      <Suspense
        fallback={
          <main role="status" style={{ padding: 40 }}>
            Завантажуємо адмінку…
          </main>
        }
      >
        <Admin />
      </Suspense>
    );
  }
  return (
    <ContactsProvider><MotionConfig reducedMotion="user">
      <a className="skip-link" href="#main">
        Перейти до вмісту
      </a>
      <Header />
      <main id="main">
        <Hero />
        <About />
        <Services />
        <Gallery />
        <Reviews />
        <Contacts />
      </main>
    </MotionConfig></ContactsProvider>
  );
}
