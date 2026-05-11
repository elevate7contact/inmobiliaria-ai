import Link from "next/link";

const features = [
  {
    icon: "🤖",
    title: "Búsqueda con IA",
    desc: "Describe en lenguaje natural lo que buscas y la IA encuentra las mejores opciones para ti.",
  },
  {
    icon: "🏠",
    title: "Miles de propiedades",
    desc: "Apartamentos, casas, locales y más. Actualizado en tiempo real por asesores verificados.",
  },
  {
    icon: "📊",
    title: "Análisis de mercado",
    desc: "Compara precios, zonas y tendencias para tomar la mejor decisión de inversión.",
  },
  {
    icon: "💬",
    title: "Chat directo",
    desc: "Conéctate directamente con el asesor inmobiliario sin intermediarios.",
  },
];

const countries = [
  { flag: "🇨🇴", name: "Colombia" },
  { flag: "🇺🇸", name: "Estados Unidos" },
  { flag: "🇲🇽", name: "México" },
  { flag: "🇦🇷", name: "Argentina" },
  { flag: "🇨🇱", name: "Chile" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-indigo-600 tracking-tight">
            Chatinmuebles
          </span>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Registrarse
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 bg-gradient-to-b from-indigo-50 to-white">
        <span className="inline-block mb-4 px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full uppercase tracking-wider">
          Búsqueda inteligente de inmuebles
        </span>
        <h1 className="text-5xl font-bold text-gray-900 max-w-3xl leading-tight mb-6">
          Encuentra tu próximo hogar{" "}
          <span className="text-indigo-600">con inteligencia artificial</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-xl mb-10">
          Dile a nuestra IA exactamente lo que necesitas y te mostramos las
          mejores propiedades en segundos. Sin filtros complicados.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="px-8 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            Buscar propiedades gratis
          </Link>
          <Link
            href="/login"
            className="px-8 py-3.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Todo lo que necesitas en un solo lugar
          </h2>
          <p className="text-center text-gray-500 mb-16 max-w-lg mx-auto">
            Tecnología de punta para que encontrar inmueble sea simple, rápido y confiable.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f) => (
              <div key={f.title} className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl hover:bg-indigo-50 transition-colors">
                <span className="text-4xl">{f.icon}</span>
                <h3 className="font-semibold text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Countries */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Disponible en 5 países
          </h2>
          <p className="text-gray-500 mb-10">
            Propiedades verificadas en los mercados más activos de Latinoamérica y Norteamérica.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {countries.map((c) => (
              <div key={c.name} className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-5 py-2.5 shadow-sm">
                <span className="text-2xl">{c.flag}</span>
                <span className="text-sm font-medium text-gray-700">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-indigo-600 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          ¿Listo para encontrar tu inmueble ideal?
        </h2>
        <p className="text-indigo-200 mb-10 max-w-lg mx-auto">
          Únete a miles de personas que ya encontraron su hogar con Chatinmuebles.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="px-8 py-3.5 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 transition-colors"
          >
            Crear cuenta gratis
          </Link>
          <Link
            href="/login"
            className="px-8 py-3.5 border border-indigo-400 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-gray-900 text-center">
        <p className="text-gray-500 text-sm">
          © {new Date().getFullYear()} Chatinmuebles. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
