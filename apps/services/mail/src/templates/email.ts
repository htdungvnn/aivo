/**
 * Email Templates for AIVO
 * Predefined templates for transactional emails
 * 
 * Security: All templates use only predefined content.
 * No arbitrary HTML, subjects, or templates are accepted from Queue messages.
 */

export interface EmailVerificationTemplateData {
  verificationCode: string;
  expiresInMinutes: number;
  recipientName?: string;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

/**
 * Escape text for plain text (basic escaping)
 */
function escapeText(text: string): string {
  return text.replace(/[<>]/g, (char) => (char === '<' ? '<' : '>'));
}

// Email content strings - predefined, never from user input
const CONTENT = {
  en: {
    appName: 'AIVO',
    subject: 'Your AIVO Verification Code',
    greeting: (name?: string) => (name ? `Hello ${escapeHtml(name)},` : 'Hello,'),
    intro: 'Your verification code is:',
    codeLabel: 'Verification Code',
    expirationWarning: (minutes: number) =>
      `This code will expire in ${minutes} minutes.`,
    securityNotice: 'For your security, do not share this code with anyone.',
    ignoreNotice:
      "If you didn't request this code, you can safely ignore this email.",
    supportText: 'If you need help, contact our support team.',
    footer: 'This is an automated message. Please do not reply.',
    copyright: '© 2024 AIVO. All rights reserved.',
  },
  vi: {
    appName: 'AIVO',
    subject: 'Mã Xác Minh AIVO Của Bạn',
    greeting: (name?: string) => (name ? `Xin chào ${escapeHtml(name)},` : 'Xin chào,'),
    intro: 'Mã xác minh của bạn là:',
    codeLabel: 'Mã Xác Minh',
    expirationWarning: (minutes: number) =>
      `Mã này sẽ hết hạn trong ${minutes} phút.`,
    securityNotice: 'Để bảo mật, vui lòng không chia sẻ mã này với bất kỳ ai.',
    ignoreNotice:
      'Nếu bạn không yêu cầu mã này, bạn có thể an toàn bỏ qua email này.',
    supportText: 'Nếu bạn cần hỗ trợ, hãy liên hệ đội ngũ hỗ trợ của chúng tôi.',
    footer: 'Đây là tin nhắn tự động. Vui lòng không trả lời.',
    copyright: '© 2024 AIVO. Mọi quyền được bảo lưu.',
  },
} as const;

type Locale = 'en' | 'vi';

/**
 * Generate HTML email template for email verification
 */
export function generateEmailVerificationHtml(
  data: EmailVerificationTemplateData,
  locale: Locale = 'en'
): { subject: string; html: string } {
  const t = CONTENT[locale];
  const name = data.recipientName ? escapeHtml(data.recipientName) : undefined;

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(t.subject)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 480px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 32px 24px;
    }
    .greeting {
      font-size: 18px;
      color: #333333;
      margin-bottom: 16px;
    }
    .intro {
      color: #666666;
      margin-bottom: 24px;
    }
    .code-box {
      background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
      border: 2px solid #667eea;
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      margin-bottom: 24px;
    }
    .code-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #666666;
      margin-bottom: 8px;
    }
    .code {
      font-size: 36px;
      font-weight: 700;
      color: #667eea;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
      margin: 0;
    }
    .expiration {
      font-size: 14px;
      color: #666666;
      margin-top: 12px;
    }
    .warning {
      background-color: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .warning p {
      margin: 0;
      font-size: 14px;
      color: #856404;
    }
    .notice {
      font-size: 14px;
      color: #666666;
      margin-bottom: 16px;
    }
    .support {
      font-size: 14px;
      color: #666666;
      margin-top: 24px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 16px 24px;
      text-align: center;
      border-top: 1px solid #e9ecef;
    }
    .footer p {
      margin: 0;
      font-size: 12px;
      color: #999999;
    }
    .copyright {
      margin-top: 8px;
    }
    @media only screen and (max-width: 480px) {
      body {
        padding: 10px;
      }
      .header {
        padding: 24px 16px;
      }
      .header h1 {
        font-size: 24px;
      }
      .content {
        padding: 24px 16px;
      }
      .code {
        font-size: 28px;
        letter-spacing: 6px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(t.appName)}</h1>
    </div>
    <div class="content">
      <p class="greeting">${t.greeting(name)}</p>
      <p class="intro">${escapeHtml(t.intro)}</p>
      
      <div class="code-box">
        <p class="code-label">${escapeHtml(t.codeLabel)}</p>
        <p class="code">${escapeHtml(data.verificationCode)}</p>
        <p class="expiration">${escapeHtml(t.expirationWarning(data.expiresInMinutes))}</p>
      </div>
      
      <div class="warning">
        <p>${escapeHtml(t.securityNotice)}</p>
      </div>
      
      <p class="notice">${escapeHtml(t.ignoreNotice)}</p>
      
      <p class="support">${escapeHtml(t.supportText)}</p>
    </div>
    <div class="footer">
      <p>${escapeHtml(t.footer)}</p>
      <p class="copyright">${escapeHtml(t.copyright)}</p>
    </div>
  </div>
</body>
</html>`;

  return {
    subject: t.subject,
    html,
  };
}

/**
 * Generate plain text email template for email verification
 */
export function generateEmailVerificationText(
  data: EmailVerificationTemplateData,
  locale: Locale = 'en'
): string {
  const t = CONTENT[locale];
  const name = data.recipientName ? escapeText(data.recipientName) : undefined;

  const lines = [
    `${'='.repeat(50)}`,
    `${t.appName} - ${t.subject}`,
    `${'='.repeat(50)}`,
    '',
    t.greeting(name),
    '',
    t.intro,
    '',
    `${t.codeLabel}: ${data.verificationCode}`,
    '',
    t.expirationWarning(data.expiresInMinutes),
    '',
    '-'.repeat(50),
    t.securityNotice,
    '-'.repeat(50),
    '',
    t.ignoreNotice,
    '',
    t.supportText,
    '',
    '-'.repeat(50),
    t.footer,
    t.copyright,
    '',
  ];

  return lines.join('\n');
}

/**
 * Get template content for a specific message type
 */
export function getTemplateContent(
  messageType: string,
  data: EmailVerificationTemplateData,
  locale: Locale
): { subject: string; html: string; text: string } {
  switch (messageType) {
    case 'auth.email_verification_code':
      const htmlResult = generateEmailVerificationHtml(data, locale);
      return {
        subject: htmlResult.subject,
        html: htmlResult.html,
        text: generateEmailVerificationText(data, locale),
      };
    default:
      throw new Error(`Unknown message type: ${messageType}`);
  }
}
