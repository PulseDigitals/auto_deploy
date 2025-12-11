import { DefaultProviders } from "./components/providers/default.tsx";
import { AppRouter } from "./router.tsx";

export default function App() {
  return (
    <DefaultProviders>
      <AppRouter />
    </DefaultProviders>
  );
}
