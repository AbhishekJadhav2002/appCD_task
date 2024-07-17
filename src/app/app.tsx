import { Home } from "pages/index";
import { Suspense } from "react";

function App() {
  return (
    <main className="flex flex-col items-center justify-center">
      <Suspense fallback={<div>Loading...</div>}>
        <Home />
      </Suspense>
    </main>
  );
}

export default App;
