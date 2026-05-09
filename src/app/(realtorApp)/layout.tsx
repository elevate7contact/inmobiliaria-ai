// Layout para inmobiliarias autenticadas
// El compañero construirá el sidebar y navbar aquí
export default function RealtorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
