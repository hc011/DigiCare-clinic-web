import ReactDOM from "react-dom/client";
import "./index.css";
import App, { PDFViewerProvider } from "./App";
import AuthProvider from "./context/AuthContext";
import { CheckupCabinProvider } from "./context/CheckupCabinContext";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
    <AuthProvider>
      <CheckupCabinProvider>
        <PDFViewerProvider>
          <App />
        </PDFViewerProvider>
      </CheckupCabinProvider>
    </AuthProvider>
);
