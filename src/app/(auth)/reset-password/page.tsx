import { redirect } from "next/navigation";

// Clerk maneja el reset de contraseña dentro del componente <SignIn>
// Esta ruta redirige al login donde Clerk ofrece el flujo nativo
export default function ResetPasswordPage() {
  redirect("/login");
}
