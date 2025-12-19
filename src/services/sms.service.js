const axios = require("axios");

class SmsService {
    async sendSms(phone, otp) {
        try {
            const response = await axios.post(
                "https://www.fast2sms.com/dev/bulkV2",
                {
                    route: "otp",
                    variables_values: otp,
                    numbers: phone
                },
                {
                    headers: {
                        authorization: process.env.FAST2SMS_API_KEY,
                        "Content-Type": "application/json"
                    }
                }
            );

            if (response.data.return === true) {
                return true;
            }

            console.error("Fast2SMS API Error:", response.data);
            return false;
        } catch (error) {
            console.error(
                "Fast2SMS Request Failed:",
                error.response?.data || error.message
            );
            return false;
        }
    }
}

module.exports = new SmsService();
