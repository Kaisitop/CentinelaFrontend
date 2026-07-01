import { redirect } from "next/navigation"

/** El registro público del panel está deshabilitado; solo Admin crea cuentas de personal. */
export default function RegisterPage() {
  redirect("/login")
}
