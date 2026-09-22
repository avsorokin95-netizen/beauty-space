import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { About } from "./components/About";
import { Services } from "./components/Services";
import { Gallery } from "./components/Gallery";
import { Contacts } from "./components/Contacts";
import { LocalInfo } from "./components/LocalInfo";
import { Reviews } from "./components/Reviews";
import { ContactsProvider } from "./components/ContactsProvider";
import { PricesProvider } from "./components/PricesProvider";
import type { PublicSnapshot } from "../shared/public-snapshot";
import { PublicSnapshotContext } from "./lib/bootstrap";

export default function App({ initialSnapshot }: { initialSnapshot?: PublicSnapshot }) {
  return (
    <PublicSnapshotContext.Provider value={initialSnapshot ?? null}>
    <PricesProvider>
    <ContactsProvider initialSnapshot={initialSnapshot?.contacts}>
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
        <LocalInfo />
        <Contacts />
      </main>
    </ContactsProvider>
    </PricesProvider>
    </PublicSnapshotContext.Provider>
  );
}
