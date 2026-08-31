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

export interface ReportReadyTemplateData {
  reportType: 'weekly' | 'monthly' | 'custom';
  periodStart: string;
  periodEnd: string;
  downloadUrl: string;
  expiresAt: number;
  dataCompleteness: 'full' | 'partial' | 'minimal';
  recipientName?: string;
}

// Email content strings - predefined, never from user input
const CONTENT = {
  en: {
    appName: 'AIVO',
    verification: {
      subject: 'Your AIVO Verification Code',
      greeting: (name?: string) => (name ? `Hello ${name},` : 'Hello,'),
      intro: 'Your verification code is:',
      codeLabel: 'Verification Code',
      expirationWarning: (minutes: number) =>
        `This code will expire in ${minutes} minutes.`,
      securityNotice: 'For your security, do not share this code with anyone.',
      ignoreNotice:
        "If you didn't request this code, you can safely ignore this email.",
      supportText: 'If you need help, contact our support team.',
      footer: 'This is an automated message. Please do not reply.',
    },
    report: {
      subject: (type: string) => {
        const typeLabel = type === 'weekly' ? 'Weekly' : type === 'monthly' ? 'Monthly' : 'Custom';
        return `Your ${typeLabel} Health Report is Ready`;
      },
      greeting: (name?: string) => (name ? `Hello ${name},` : 'Hello,'),
      intro: (type: string) => {
        const typeLabel = type === 'weekly' ? 'weekly' : type === 'monthly' ? 'monthly' : 'custom';
        return `Your ${typeLabel} AIVO Health Report is ready for download.`;
      },
      periodLabel: 'Report Period',
      downloadButton: 'Download Report',
      downloadNote: 'This link will expire in 24 hours.',
      dataNote: 'Your report includes data from:',
      dataFull: 'All tracked metrics (readiness, sleep, nutrition, activity, and workouts)',
      dataPartial: 'Most tracked metrics with some gaps',
      dataMinimal: 'Limited data available',
      privacyNote:
        'This report contains your personal health data. Keep it secure and do not share it publicly.',
      disclaimer:
        'AIVO Health Reports provide automated wellness summaries. They do not provide medical advice, diagnosis, or treatment.',
      footer: 'This is an automated message. Please do not reply.',
    },
    copyright: '© 2024 AIVO. All rights reserved.',
  },
  vi: {
    appName: 'AIVO',
    verification: {
      subject: 'Mã Xác Minh AIVO Của Bạn',
      greeting: (name?: string) => (name ? `Xin chào ${name},` : 'Xin chào,'),
      intro: 'Mã xác minh của bạn là:',
      codeLabel: 'Mã Xác Minh',
      expirationWarning: (minutes: number) =>
        `Mã này sẽ hết hạn trong ${minutes} phút.`,
      securityNotice: 'Để bảo mật, vui lòng không chia sẻ mã này với bất kỳ ai.',
      ignoreNotice:
        'Nếu bạn không yêu cầu mã này, bạn có thể an toàn bỏ qua email này.',
      supportText: 'Nếu bạn cần hỗ trợ, hãy liên hệ đội ngũ hỗ trợ của chúng tôi.',
      footer: 'Đây là tin nhắn tự động. Vui lòng không trả lời.',
    },
    report: {
      subject: (type: string) => {
        const typeLabel = type === 'weekly' ? 'Tuần' : type === 'monthly' ? 'Tháng' : 'Tùy chỉnh';
        return `Báo Cáo Sức Khỏe AIVO ${typeLabel} Đã Sẵn Sàng`;
      },
      greeting: (name?: string) => (name ? `Xin chào ${name},` : 'Xin chào,'),
      intro: (type: string) => {
        const typeLabel = type === 'weekly' ? 'tuần' : type === 'monthly' ? 'tháng' : 'tùy chỉnh';
        return `Báo Cáo Sức Khỏe AIVO ${typeLabel} của bạn đã sẵn sàng để tải xuống.`;
      },
      periodLabel: 'Thời Gian Báo Cáo',
      downloadButton: 'Tải Xuống Báo Cáo',
      downloadNote: 'Liên kết này sẽ hết hạn sau 24 giờ.',
      dataNote: 'Báo cáo của bạn bao gồm dữ liệu từ:',
      dataFull: 'Tất cả các chỉ số được theo dõi (sẵn sàng, giấc ngủ, dinh dưỡng, hoạt động và bài tập)',
      dataPartial: 'Hầu hết các chỉ số được theo dõi với một số khoảng trống',
      dataMinimal: 'Dữ liệu có sẵn hạn chế',
      privacyNote:
        'Báo cáo này chứa dữ liệu sức khỏe cá nhân của bạn. Hãy giữ nó an toàn và không chia sẻ công khai.',
      disclaimer:
        'Báo Cáo Sức Khỏe AIVO cung cấp tóm tắt sức khỏe tự động. Chúng không cung cấp lời khuyên y tế, chẩn đoán hoặc điều trị.',
      footer: 'Đây là tin nhắn tự động. Vui lòng không trả lời.',
    },
    copyright: '© 2024 AIVO. Mọi quyền được bảo lưu.',
  },
} as const;

type Locale = 'en' | 'vi';

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
  return String(text).replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

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
  <title>${escapeHtml(t.verification.subject)}</title>
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
      <p class="greeting">${escapeHtml(t.verification.greeting(name))}</p>
      <p class="intro">${escapeHtml(t.verification.intro)}</p>
      
      <div class="code-box">
        <p class="code-label">${escapeHtml(t.verification.codeLabel)}</p>
        <p class="code">${escapeHtml(data.verificationCode)}</p>
        <p class="expiration">${escapeHtml(t.verification.expirationWarning(data.expiresInMinutes))}</p>
      </div>
      
      <div class="warning">
        <p>${escapeHtml(t.verification.securityNotice)}</p>
      </div>
      
      <p class="notice">${escapeHtml(t.verification.ignoreNotice)}</p>
      
      <p class="support">${escapeHtml(t.verification.supportText)}</p>
    </div>
    <div class="footer">
      <p>${escapeHtml(t.verification.footer)}</p>
      <p class="copyright">${escapeHtml(t.copyright)}</p>
    </div>
  </div>
</body>
</html>`;

  return {
    subject: t.verification.subject,
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
  const name = data.recipientName;

  const lines = [
    `${'='.repeat(50)}`,
    `${t.appName} - ${t.verification.subject}`,
    `${'='.repeat(50)}`,
    '',
    t.verification.greeting(name),
    '',
    t.verification.intro,
    '',
    `${t.verification.codeLabel}: ${data.verificationCode}`,
    '',
    t.verification.expirationWarning(data.expiresInMinutes),
    '',
    '-'.repeat(50),
    t.verification.securityNotice,
    '-'.repeat(50),
    '',
    t.verification.ignoreNotice,
    '',
    t.verification.supportText,
    '',
    '-'.repeat(50),
    t.verification.footer,
    t.copyright,
    '',
  ];

  return lines.join('\n');
}

/**
 * Generate HTML email template for report ready notification
 */
export function generateReportReadyHtml(
  data: ReportReadyTemplateData,
  locale: Locale = 'en'
): { subject: string; html: string } {
  const t = CONTENT[locale];
  const name = data.recipientName ? escapeHtml(data.recipientName) : undefined;

  // Format dates
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const dataCompletenessText =
    data.dataCompleteness === 'full'
      ? t.report.dataFull
      : data.dataCompleteness === 'partial'
      ? t.report.dataPartial
      : t.report.dataMinimal;

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(t.report.subject(data.reportType))}</title>
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
      max-width: 520px;
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
      font-size: 24px;
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
    .period-box {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .period-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #666666;
      margin-bottom: 4px;
    }
    .period-value {
      font-size: 18px;
      font-weight: 600;
      color: #333333;
    }
    .download-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 16px;
    }
    .download-note {
      font-size: 14px;
      color: #666666;
      margin-bottom: 24px;
    }
    .data-note {
      background-color: #f0f4ff;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .data-note-title {
      font-size: 14px;
      font-weight: 600;
      color: #333333;
      margin-bottom: 8px;
    }
    .data-note-content {
      font-size: 14px;
      color: #666666;
    }
    .privacy-notice {
      background-color: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .privacy-notice p {
      margin: 0;
      font-size: 14px;
      color: #856404;
    }
    .disclaimer {
      font-size: 12px;
      color: #999999;
      margin-bottom: 24px;
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
      .content {
        padding: 24px 16px;
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
      <p class="greeting">${escapeHtml(t.report.greeting(name))}</p>
      <p class="intro">${escapeHtml(t.report.intro(data.reportType))}</p>
      
      <div class="period-box">
        <p class="period-label">${escapeHtml(t.report.periodLabel)}</p>
        <p class="period-value">${escapeHtml(formatDate(data.periodStart))} - ${escapeHtml(formatDate(data.periodEnd))}</p>
      </div>
      
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${escapeHtml(data.downloadUrl)}" class="download-button">${escapeHtml(t.report.downloadButton)}</a>
      </div>
      <p class="download-note">${escapeHtml(t.report.downloadNote)}</p>
      
      <div class="data-note">
        <p class="data-note-title">${escapeHtml(t.report.dataNote)}</p>
        <p class="data-note-content">${escapeHtml(dataCompletenessText)}</p>
      </div>
      
      <div class="privacy-notice">
        <p>${escapeHtml(t.report.privacyNote)}</p>
      </div>
      
      <p class="disclaimer">${escapeHtml(t.report.disclaimer)}</p>
    </div>
    <div class="footer">
      <p>${escapeHtml(t.report.footer)}</p>
      <p class="copyright">${escapeHtml(t.copyright)}</p>
    </div>
  </div>
</body>
</html>`;

  return {
    subject: t.report.subject(data.reportType),
    html,
  };
}

/**
 * Generate plain text email template for report ready notification
 */
export function generateReportReadyText(
  data: ReportReadyTemplateData,
  locale: Locale = 'en'
): string {
  const t = CONTENT[locale];
  const name = data.recipientName;

  // Format dates
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const dataCompletenessText =
    data.dataCompleteness === 'full'
      ? t.report.dataFull
      : data.dataCompleteness === 'partial'
      ? t.report.dataPartial
      : t.report.dataMinimal;

  const lines = [
    `${'='.repeat(50)}`,
    `${t.appName} - ${t.report.subject(data.reportType)}`,
    `${'='.repeat(50)}`,
    '',
    t.report.greeting(name),
    '',
    t.report.intro(data.reportType),
    '',
    `${t.report.periodLabel}: ${formatDate(data.periodStart)} - ${formatDate(data.periodEnd)}`,
    '',
    `${t.report.downloadButton}:`,
    data.downloadUrl,
    '',
    t.report.downloadNote,
    '',
    '-'.repeat(50),
    t.report.dataNote,
    dataCompletenessText,
    '-'.repeat(50),
    '',
    t.report.privacyNote,
    '',
    t.report.disclaimer,
    '',
    '-'.repeat(50),
    t.report.footer,
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
  data: EmailVerificationTemplateData | ReportReadyTemplateData,
  locale: Locale
): { subject: string; html: string; text: string } {
  switch (messageType) {
    case 'auth.email_verification_code':
      const verificationData = data as EmailVerificationTemplateData;
      const htmlResult = generateEmailVerificationHtml(verificationData, locale);
      return {
        subject: htmlResult.subject,
        html: htmlResult.html,
        text: generateEmailVerificationText(verificationData, locale),
      };
    case 'health.weekly_report_ready':
    case 'health.monthly_report_ready':
    case 'health.custom_report_ready':
      const reportData = data as ReportReadyTemplateData;
      const reportHtmlResult = generateReportReadyHtml(reportData, locale);
      return {
        subject: reportHtmlResult.subject,
        html: reportHtmlResult.html,
        text: generateReportReadyText(reportData, locale),
      };
    default:
      throw new Error(`Unknown message type: ${messageType}`);
  }
}
