// Invitation email delivery via AWS SESv2. Best-effort by design: when SES
// is not configured (no INVITE_FROM_EMAIL) or sending fails, callers fall
// back to the copy-token channel instead of failing the request.

const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');

function mailerConfig() {
  const from = (process.env.INVITE_FROM_EMAIL || '').trim();
  const appUrl = (process.env.INVITE_APP_URL || '').trim().replace(/\/$/, '');
  const region = process.env.AWS_REGION || 'ap-south-1';
  return { from, appUrl, region, configured: from.length > 0 };
}

function inviteLink(appUrl, { email, role, token }) {
  const qs = new URLSearchParams({ invite: token, email, role });
  return appUrl ? `${appUrl}/register?${qs.toString()}` : '';
}

async function sendInviteEmail({ to, name, role, token }) {
  const { from, appUrl, region, configured } = mailerConfig();
  if (!configured) {
    return { sent: false, reason: 'SES not configured (INVITE_FROM_EMAIL unset)' };
  }
  const link = inviteLink(appUrl, { email: to, role, token });
  const subject = `Your RahatSetu ${role} invitation`;
  const bodyText = [
    `Hello${name ? ` ${name}` : ''},`,
    '',
    `You have been invited to join RahatSetu as ${role}.`,
    '',
    link ? `Register here: ${link}` : `Your invitation token: ${token}`,
    '',
    'This token is single-use. If you did not expect this invitation, ignore this email.',
  ].join('\n');
  const client = new SESv2Client({ region });
  try {
    await client.send(
      new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: subject },
            Body: { Text: { Data: bodyText } },
          },
        },
      })
    );
    return { sent: true, link: link || undefined };
  } catch (error) {
    return { sent: false, reason: error?.message || 'SES send failed', link: link || undefined };
  }
}

module.exports = { mailerConfig, inviteLink, sendInviteEmail };
