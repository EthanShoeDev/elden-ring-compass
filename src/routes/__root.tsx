import {
  createRootRoute,
  HeadContent,
  Scripts,
  Outlet,
} from "@tanstack/react-router";
import { AppBar } from "@/components/app-bar";
import { Footer } from "@/components/footer";
import "../index.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Elden Ring Compass",
      },
    ],
  }),

  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="flex h-screen flex-col">
          <AppBar />
          <Outlet />
          <Footer />
        </div>
        <Scripts />
      </body>
    </html>
  );
}
