import EspressoApp from "../components/EspressoApp";
import ErrorBoundary from "../components/ErrorBoundary";
export default function Page() {
  return (
    <ErrorBoundary>
      <EspressoApp />
    </ErrorBoundary>
  );
}
