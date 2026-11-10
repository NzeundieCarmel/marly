import { NextResponse, type NextRequest } from "next/server";

export function proxy(requete: NextRequest) {
  // Sans cookie de session, pas d'accès aux pages des dossiers
  if (!requete.cookies.has("marly_session")) {
    return NextResponse.redirect(new URL("/connexion", requete.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dossiers/:path*"],
};