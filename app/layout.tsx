import "./globals.css";

export const metadata = {
  title: "Agenda Etech",
  description: "Agenda SGP - Etech",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
