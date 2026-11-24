// En-têtes qui transmettent l'adresse du visiteur à l'API, avec le secret qui les rend crédibles.
// À n'utiliser que côté serveur (actions et routes) : le secret ne doit jamais partir vers le navigateur.
export function entetesRelais(ip: string): Record<string, string> {
  const secret = process.env.MARLY_SECRET_RELAIS;
  if (!ip || !secret) return {};
  return { "X-Marly-Ip": ip, "X-Marly-Relais": secret };
}