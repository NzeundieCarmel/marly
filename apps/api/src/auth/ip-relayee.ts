import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

function egal(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// L'adresse transmise par Next.js n'est crue que si la requête porte le secret partagé.
// Sans secret configuré, on ne fait confiance à personne : adresse réelle de la connexion.
export function ipDe(requete: Request): string {
  const secret = process.env.MARLY_SECRET_RELAIS ?? '';
  const presente = requete.headers['x-marly-relais'];
  const relayee = requete.headers['x-marly-ip'];
  const confiance =
    secret.length >= 32 &&
    typeof presente === 'string' &&
    egal(presente, secret);
  const ip =
    (confiance && typeof relayee === 'string' && relayee) ||
    requete.ip ||
    'inconnue';
  return ip.slice(0, 64);
}
