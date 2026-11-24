import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

@Injectable()
export class MessagerieService {
  private readonly logger = new Logger('Messagerie');
  private readonly transport: Transporter | null;
  private readonly expediteur: string;
  private readonly production: boolean;

  constructor(config: ConfigService) {
    const hote = config.get<string>('SMTP_HOTE');
    const port = Number(config.get('SMTP_PORT') ?? 587);
    this.production = config.get('NODE_ENV') === 'production';
    this.expediteur =
      config.get<string>('SMTP_EXPEDITEUR') ?? 'Marly <no-reply@marly.cm>';
    this.transport = hote
      ? createTransport({
          host: hote,
          port,
          secure: port === 465,
          auth: {
            user: config.get<string>('SMTP_UTILISATEUR'),
            pass: config.get<string>('SMTP_MOT_DE_PASSE'),
          },
        })
      : null;
  }

  async envoyer(
    destinataire: string,
    sujet: string,
    texte: string,
  ): Promise<void> {
    if (!this.transport) {
      // En production, jamais de code dans les journaux : on refuse d'envoyer
      if (this.production) {
        this.logger.error('SMTP non configuré : aucun e-mail ne peut partir');
        throw new ServiceUnavailableException(
          "L'envoi d'e-mails est momentanément indisponible",
        );
      }
      this.logger.warn(
        `[DÉVELOPPEMENT] E-mail pour ${destinataire} · ${sujet}\n${texte}`,
      );
      return;
    }
    await this.transport.sendMail({
      from: this.expediteur,
      to: destinataire,
      subject: sujet,
      text: texte,
    });
  }
}
