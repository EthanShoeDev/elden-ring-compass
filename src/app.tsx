import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./index.css";

function App() {
  const router = getRouter();

  return <RouterProvider router={router} />;
}

export default App;
