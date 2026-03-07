import "./globals.css";

export const metadata = {
  title: "Meal Ops Board",
  description: "Anti-inflammatory meal planner"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en"><body>{children}</body></html>
  );
}
