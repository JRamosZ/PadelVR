import CourtSetupPage from "./pages/CourtSetupPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import NewMatchSetupPage from "./pages/NewMatchSetupPage.jsx";
import ScoreboardPage from "./pages/ScoreboardPage.jsx";

export default function App() {
  const pathSegments = window.location.pathname.split("/").filter(Boolean);

  if (pathSegments.length === 0) {
    return <HomePage />;
  }

  if (pathSegments.length === 1) {
    return <CourtSetupPage courtId={pathSegments[0]} />;
  }

  if (
    pathSegments.length === 3 &&
    pathSegments[1] === "matches" &&
    pathSegments[2] === "new"
  ) {
    return <NewMatchSetupPage courtId={pathSegments[0]} />;
  }

  if (
    pathSegments.length === 3 &&
    pathSegments[1] === "matches" &&
    pathSegments[2] !== "new"
  ) {
    return <ScoreboardPage courtId={pathSegments[0]} matchId={pathSegments[2]} />;
  }

  return (
    <main className="setup-page">
      <h1>Página no encontrada</h1>
    </main>
  );
}
