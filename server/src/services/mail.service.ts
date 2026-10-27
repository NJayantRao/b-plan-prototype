import { Resend } from "resend";
import { ENV } from "../config/env.js";
import logger from "../config/logger.js";
import {
  otpEmail,
  welcomeEmail,
  type EmailContent,
} from "../emails/templates.js";
import { ServiceUnavailableError } from "../utils/api-error.js";

interface OutgoingEmail extends EmailContent {
  to: string;
}

/** Captured emails in the test environment so tests can read OTP codes. */
export const testOutbox: OutgoingEmail[] = [];

let resendClient: Resend | undefined;
const getResend = (apiKey: string): Resend => {
  resendClient ??= new Resend(apiKey);
  return resendClient;
};

const deliver = async (email: OutgoingEmail): Promise<void> => {
  if (ENV.RESEND_API_KEY) {
    try {
      const { error } = await getResend(ENV.RESEND_API_KEY).emails.send({
        from: ENV.MAIL_FROM,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      if (error) throw new Error(error.message);
      return;
    } catch (error) {
      logger.error(
        `Email delivery failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableError(
        "We could not send the email right now. Please try again shortly.",
        "EMAIL_DELIVERY_FAILED",
      );
    }
  }

  // --- No provider configured: simulated delivery -----------------------
  if (ENV.isTest) {
    testOutbox.push(email);
    return;
  }

  if (ENV.isProduction) {
    // Never pretend an email was sent in production.
    logger.error("RESEND_API_KEY is not set: cannot deliver email in production");
    throw new ServiceUnavailableError(
      "Verification emails are temporarily unavailable. Please try again later.",
      "EMAIL_NOT_CONFIGURED",
    );
  }

  // Development demo mode: the body (including the OTP) is printed locally.
  logger.warn(
    `[SIMULATED EMAIL - no RESEND_API_KEY set] subject="${email.subject}"\n${email.text}`,
  );
};

export const sendOtpEmail = (to: string, firstName: string, otp: string) =>
  deliver({ to, ...otpEmail(firstName, otp) });

/** Welcome mail is non-essential: a failure must not break sign-up. */
export const sendWelcomeEmail = async (
  to: string,
  firstName: string,
): Promise<void> => {
  try {
    await deliver({ to, ...welcomeEmail(firstName) });
  } catch {
    logger.warn("Welcome email could not be delivered");
  }
};
