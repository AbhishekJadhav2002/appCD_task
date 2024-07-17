import { MindMap } from "components/index";
import { Suspense } from "react";

function Home() {
  return (
    <div className="min-h-screen w-full">
      <h1 className="my-6 text-center">Home</h1>
      <div className="min-h-[500px] flex items-center justify-center">
        <Suspense fallback={<div>Loading...</div>}>
          <MindMap className="" log={true} />
        </Suspense>
      </div>
    </div>
  );
}

export default Home;
