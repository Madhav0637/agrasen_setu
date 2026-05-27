const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * MSG91 SMS Service — used ONLY for OTP verification
 * All other notifications go via Firebase Push
 */
class Msg91Service {
  constructor() {
    this.authKey = env.MSG91_AUTH_KEY;
    this.senderId = env.MSG91_SENDER_ID;
    this.otpTemplateId = env.MSG91_OTP_TEMPLATE_ID;
    this.baseUrl = 'https://control.msg91.com/api/v5';
  }

  /**
   * Send OTP via MSG91
   */
  async sendOtp(phone, otp) {
    if (!this.authKey) {
      logger.warn({ phone }, 'MSG91 not configured — OTP not sent via SMS');
      return { success: false, reason: 'not_configured' };
    }

    try {
      const url = `${this.baseUrl}/flow/`;
      const payload = {
        template_id: this.otpTemplateId,
        short_url: '0',
        recipients: [
          {
            mobiles: `91${phone}`,
            otp: otp,
          },
        ],
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: this.authKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.type === 'success') {
        logger.info({ phone }, 'OTP sent via MSG91');
        return { success: true, requestId: data.request_id };
      }

      logger.error({ phone, response: data }, 'MSG91 OTP send failed');
      return { success: false, reason: data.message || 'unknown' };
    } catch (error) {
      logger.error({ err: error, phone }, 'MSG91 API call failed');
      return { success: false, reason: error.message };
    }
  }
}

module.exports = new Msg91Service();
