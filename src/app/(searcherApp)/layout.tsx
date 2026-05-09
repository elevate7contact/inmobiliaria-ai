// Layout para buscadores autenticados
// El compañero construirá el navbar y contenido aquí
export default function SearcherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
