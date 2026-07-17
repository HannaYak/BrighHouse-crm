import '../client-source/globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="bg-slate-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
