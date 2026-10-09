import CourtSetupPage from "./pages/CourtSetupPage.jsx";
import HomePage from "./pages/HomePage.jsx";

export default function App() {
  const pathSegments = window.location.pathname.split("/").filter(Boolean);

  if (pathSegments.length === 0) {
    return <HomePage />;
  }

  if (pathSegments.length === 1) {
    return <CourtSetupPage courtId={pathSegments[0]} />;
  }

  return (
    <main className="setup-page">
      <h1>Página no encontrada</h1>
    </main>
  );
}
