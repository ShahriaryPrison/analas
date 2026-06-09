export interface SmsSender {
  sendOtp(phone: string, code: string): Promise<boolean>;
}

class ConsoleSender implements SmsSender {
  async sendOtp(phone: string, code: string): Promise<boolean> {
    console.log(`\n==========================================================`);
    console.log(`[SMS CONSOLE SENDER] OTP Code for ${phone}:`);
    console.log(`  Your verification code is: ${code}`);
    console.log(`  @analas.ir #${code}`);
    console.log(`==========================================================\n`);
    return true;
  }
}

class KavenegarSender implements SmsSender {
  async sendOtp(phone: string, code: string): Promise<boolean> {
    const apiKey = process.env.KAVENEGAR_API_KEY;
    const template = process.env.KAVENEGAR_OTP_TEMPLATE || "verify";

    if (!apiKey) {
      console.warn("[SMS SENDER] Kavenegar API key not configured. Falling back to Console.");
      return new ConsoleSender().sendOtp(phone, code);
    }

    try {
      // Strip any leading plus sign for Kavenegar receptor
      const receptor = phone.replace(/^\+/, "");
      const url = `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          receptor,
          token: code,
          template,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[SMS SENDER] Kavenegar API error: ${errText}`);
        return false;
      }

      const data = await res.json();
      return data.return?.status === 200;
    } catch (error) {
      console.error("[SMS SENDER] Kavenegar request failed:", error);
      return false;
    }
  }
}

export function getSmsSender(): SmsSender {
  const provider = (process.env.SMS_PROVIDER || "console").toLowerCase();
  switch (provider) {
    case "kavenegar":
      return new KavenegarSender();
    case "console":
    default:
      return new ConsoleSender();
  }
}

export async function sendOtpSms(phone: string, code: string): Promise<boolean> {
  const sender = getSmsSender();
  return sender.sendOtp(phone, code);
}
