// backend/src/services/sms.service.ts
import * as dotenv from 'dotenv';
dotenv.config();

const AfricasTalking = require('africastalking');
const africastalking = AfricasTalking({
  apiKey: process.env.AFRICASTALKING_API_KEY || 'sandbox_key',
  username: process.env.AFRICASTALKING_USERNAME || 'sandbox'
});

const sms = africastalking.SMS;

export class SMSService {
  static async sendWelcomeSMS(phone: string, name: string) {
    try {
      const message = `Karibu ${name} kwenye Kenya Farm IoT! Tutakutumia alert za udongo kupitia SMS.`;

      const response = await sms.send({
        to: phone,
        message: message,
        from: 'KENYAFARM'  // Optional: get shortcode from Africa's Talking
      });

      console.log('Welcome SMS sent:', response);
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }

  static async sendMoistureAlert(phone: string, moisture: number) {
    const messages = [
      `Udongo umekauka (${moisture}%). Umwagie maji sasa.`,
      `Udongo uko sawa (${moisture}%). Usiumwagie maji leo.`,
      `Udongo umejaa maji (${moisture}%). Usiumwagie maji wiki ijayo.`
    ];

    let message = '';
    if (moisture < 30) message = messages[0];
    else if (moisture < 60) message = messages[1];
    else message = messages[2];

    try {
      await sms.send({
        to: phone,
        message: message
      });
      return true;
    } catch (error) {
      console.error('Moisture alert failed:', error);
      return false;
    }
  }
}
