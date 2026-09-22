import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "./index.css";
import { ClientApp } from "./ClientApp";
import { startAnalytics } from "./lib/analytics";
import { readPublicSnapshot } from "./lib/bootstrap";

startAnalytics();

const path = window.location.pathname;
const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <ClientApp path={path} initialSnapshot={readPublicSnapshot()} />
  </StrictMode>
);

if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
