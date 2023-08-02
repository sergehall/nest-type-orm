import { Injectable } from '@nestjs/common';
import { MailerConfig } from '../../../config/mailer/mailer-config';
import { DomainNamesEnums } from '../enums/domain-names.enums';

@Injectable()
export class MailsAdapter {
  constructor(protected mailerConfig: MailerConfig) {}

  async createSendMailOptionsForRecoveryCode(
    email: string,
    recoveryCode: string,
  ) {
    const domainName = DomainNamesEnums.DOMAIN_HEROKU_POSTGRES;
    const fromEmail = await this.mailerConfig.getNodeMailerValue(
      'NODEMAILER_EMAIL',
    );
    const path = '/auth/password-recovery';
    const parameter = '?recoveryCode=' + recoveryCode;
    const fullURL = domainName + path + parameter;
    const subject = 'Sent recovery code';
    const template = 'index';
    const text = 'Welcome';
    const html = `
      <h1 style="color: dimgrey">Click on the link below to confirm your email address.</h1>
      <div><a style="font-size: 20px; text-decoration-line: underline" href=${fullURL}> Push link to confirm email.</a></div>`;

    const context = {
      name: email,
      fullURL,
    };
    return {
      to: email,
      from: fromEmail,
      subject,
      template,
      text,
      html,
      context,
    };
  }

  async createSendMailOptionsForConfirmationCode(
    email: string,
    confirmationCode: string,
  ) {
    const EMAIL_FROM = await this.mailerConfig.getNodeMailerValue(
      'NODEMAILER_EMAIL',
    );

    const domainName = DomainNamesEnums.DOMAIN_HEROKU_POSTGRES;
    const path = '/auth/confirm-registration';
    const parameter = '?code=' + confirmationCode;
    const fullURL = domainName + path + parameter;
    const fromEmail = EMAIL_FROM;
    const subject = 'Registration by confirmation code';
    const template = 'index';
    const text = 'Welcome';
    const html = `
      <h1 style="color: dimgrey">Click on the link below to confirm your email address.</h1>
      <div><a style="font-size: 20px; text-decoration-line: underline" href=${fullURL}> Push link to confirm email.</a></div>`;

    const context = {
      name: email,
      fullURL,
    };

    return {
      to: email,
      from: fromEmail,
      subject,
      template,
      text,
      html,
      context,
    };
  }
}
