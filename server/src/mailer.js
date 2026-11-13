// Magic-link delivery. Production uses Resend over HTTPS; tests and local runs use an in-memory outbox.

export function createResendMailer({ apiKey, from, fetchImpl = fetch }) {
  return {
    configured: true,
    async send({ to, subject, text }) {
      const response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject, text }),
      });
      if (!response.ok) throw new Error(`email provider returned ${response.status}`);
    },
  };
}

export function createMemoryMailer() {
  const outbox = [];
  return {
    configured: true,
    outbox,
    async send(message) {
      outbox.push(message);
    },
  };
}

export const disabledMailer = { configured: false, async send() {} };
