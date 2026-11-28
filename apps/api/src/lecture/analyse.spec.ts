import { analyserTexte } from './analyse';

const contexte = {
  raisonSociale: 'Quincaillerie Grand Livre',
  niu: 'M123456789012Q',
  regime: 'REEL' as const,
  tauxTva: 19.25,
  aujourdhui: new Date('2026-11-28T10:00:00Z'),
};

describe('analyserTexte', () => {
  it('lit un ticket avec HT, TVA et TTC', () => {
    const r = analyserTexte(
      'QUINCAILLERIE DU PORT\nRue Joss, Douala\nDate : 28/11/2026\nCiment 50 kg x 5   20 000\nTOTAL HT   20 000\nTVA 19,25 %   3 850\nTOTAL TTC   23 850',
      contexte,
    );
    expect(r).toMatchObject({
      nature: 'ACHAT',
      montantTtc: 23850,
      montantHt: 20000,
      tva: 3850,
      date: '2026-11-28',
      tiers: 'QUINCAILLERIE DU PORT',
    });
  });

  it('reconnait une facture avec le NIU du fournisseur et un mois en lettres', () => {
    const r = analyserTexte(
      'ENEO CAMEROON S.A.\nNIU M098765432109B\nFacture N° 2026-118\nDu 12 novembre 2026\nMontant HT 50 000\nTVA 19,25% 9 625\nNET A PAYER 59 625 FCFA\nTel 699 00 00 00',
      contexte,
    );
    expect(r).toMatchObject({
      montantTtc: 59625,
      montantHt: 50000,
      tva: 9625,
      date: '2026-11-12',
      niuTiers: 'M098765432109B',
    });
  });

  it("reconnait une vente quand le document porte le nom de l'entreprise", () => {
    const r = analyserTexte(
      'QUINCAILLERIE GRAND LIVRE\nBon de vente\nDate : 27/11/2026\nClient : Chantier Test\nTOTAL TTC 11 925',
      contexte,
    );
    expect(r).toMatchObject({
      nature: 'VENTE',
      montantTtc: 11925,
      tiers: 'Chantier Test',
    });
  });

  it('calcule la TVA au reel quand seul le TTC est lisible', () => {
    const r = analyserTexte(
      'SUPERMARCHE SANTA LUCIA\nTICKET 0042\n10-11-2026 14:32\nRiz 25kg 18.500\nHuile 5L 7.250\nTOTAL 25.750\nTVA incluse',
      contexte,
    );
    expect(r).toMatchObject({
      montantTtc: 25750,
      montantHt: 21593,
      tva: 4157,
      tvaCalculee: true,
    });
  });

  it('refuse une date future ou trop ancienne', () => {
    const r = analyserTexte('BOUTIQUE\n12/12/2031\nTOTAL 1 000', contexte);
    expect(r.date).toBeNull();
  });
});
