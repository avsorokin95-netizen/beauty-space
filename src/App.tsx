import type { PublicPath } from '../shared/pages';
import { RelatedServices } from './components/RelatedServices';
import { MobileBooking } from './components/MobileBooking';
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

export default function App({ initialSnapshot, path = "/" }: { initialSnapshot?: PublicSnapshot; path?: PublicPath }) {
  return (
    <PublicSnapshotContext.Provider value={initialSnapshot ?? null}>
    <PricesProvider>
    <ContactsProvider initialSnapshot={initialSnapshot?.contacts} path={path}>
      <a className="skip-link" href="#main">
        Перейти до вмісту
      </a>
      <Header path={path} />
      <main id="main">
        <Hero path={path} />
        <Services path={path} />
        <Gallery category={path === "/" ? undefined : path === "/pedicure" ? "pedicure" : "lashes"} />
        <RelatedServices path={path} />
        <About />
        <Reviews />
        <LocalInfo path={path} />
        <Contacts />
      </main>
      <MobileBooking />
    </ContactsProvider>
    </PricesProvider>
    </PublicSnapshotContext.Provider>
  );
}
