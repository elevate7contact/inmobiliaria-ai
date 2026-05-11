import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/reset-password"];
const API_V1_PREFIX = "/api/v1";
const REALTOR_ROUTES = ["/dashboard", "/properties", "/subscription", "/analytics", "/api-docs"];
const ADMIN_ROUTES = ["/admin"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-key",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // API v1 — autenticada por API key, no por sesión
  if (pathname.startsWith(API_V1_PREFIX)) {
    return supabaseResponse;
  }

  // Rutas públicas — siempre accesibles
  if (PUBLIC_ROUTES.some((r) => pathname === r)) {
    // Si ya está loggeado y va a login/signup, redirigir al home de su rol
    if (user && (pathname === "/login" || pathname === "/signup")) {
      const role = user.user_metadata?.role ?? "SEARCHER";
      const redirect =
        role === "REALTOR" ? "/dashboard" : role === "ADMIN" ? "/admin" : "/search";
      return NextResponse.redirect(new URL(redirect, request.url));
    }
    return supabaseResponse;
  }

  // Sin sesión → redirigir a login
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = user.user_metadata?.role ?? "SEARCHER";

  // Rutas de admin — solo ADMIN
  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r)) && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Rutas de realtor — solo REALTOR o ADMIN
  if (
    REALTOR_ROUTES.some((r) => pathname.startsWith(r)) &&
    role !== "REALTOR" &&
    role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/search", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
