/**
 * Shared Email Functions — Brevo Integration
 * 
 * ENGINE CONTRACT:
 * - Single source of truth for all transactional emails
 * - Used by webhook (fulfillment) and resend endpoint
 * - No SDK dependency — direct REST API calls
 */

// ============================================================
// BREVO EMAIL TRANSPORT
// ============================================================

interface EmailParams {
  from: { name: string; email: string };
  to: { email: string }[];
  subject: string;
  htmlContent: string;
  bcc?: { email: string }[];
}

export async function sendEmailBrevo(params: EmailParams): Promise<{ messageId?: string }> {
  const apiKey = import.meta.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY not configured');
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      sender: params.from,
      to: params.to,
      subject: params.subject,
      htmlContent: params.htmlContent,
      bcc: params.bcc,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brevo error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return { messageId: data.messageId };
}

// ============================================================
// ACCESS EMAIL (shared by webhook + resend)
// ============================================================

export interface AccessEmailResource {
  operatorId: string;
  operatorName?: string;
  resourceId: string;
  resourceLabel: string;
  resourceDescription?: string;
}

export interface AccessEmailParams {
  toEmail: string;
  resources: AccessEmailResource[];
  portalUrl: string;
  supportEmail?: string;
}

/**
 * Send the "Your access is ready" email.
 * Used by both webhook fulfillment and resend endpoint.
 */
export async function sendAccessEmail(params: AccessEmailParams): Promise<{ messageId?: string }> {
  const { toEmail, resources, portalUrl, supportEmail } = params;
  
  const from = import.meta.env.FULFILLMENT_FROM_EMAIL;
  if (!from) {
    throw new Error('FULFILLMENT_FROM_EMAIL not configured');
  }
  
  const bcc = import.meta.env.FULFILLMENT_BCC_EMAIL || undefined;
  
  // Group resources by operator
  const byOperator: Record<string, AccessEmailResource[]> = {};
  for (const r of resources) {
    if (!byOperator[r.operatorId]) {
      byOperator[r.operatorId] = [];
    }
    byOperator[r.operatorId].push(r);
  }
  
  // Build resources HTML
  let resourcesHtml = '';
  for (const [opId, opResources] of Object.entries(byOperator)) {
    const opName = opResources[0]?.operatorName || opId;
    const itemsHtml = opResources.map(r => `
      <div style="padding:12px 0;border-bottom:1px solid #e5e5e5;">
        <div style="font-weight:600;color:#1a1a1a;">${r.resourceLabel}</div>
        ${r.resourceDescription ? `<div style="font-size:14px;color:#666;margin-top:4px;">${r.resourceDescription}</div>` : ''}
      </div>
    `).join('');
    
    resourcesHtml += `
      <div style="margin-bottom:24px;">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#888;margin-bottom:8px;">${opName}</div>
        ${itemsHtml}
      </div>
    `;
  }
  
  const htmlContent = `
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,sans-serif;line-height:1.6;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff;">
      
      <!-- Header -->
      <div style="text-align:center;margin-bottom:32px;">
        <div style="width:64px;height:64px;background:#16a34a;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:32px;line-height:1;">✓</span>
        </div>
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1a1a1a;">Your access is ready</h1>
        <p style="margin:0;color:#666;font-size:16px;">Sign in to your portal to get started.</p>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align:center;margin-bottom:32px;">
        <a href="${portalUrl}" style="display:inline-block;padding:16px 32px;background:#000;color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:16px;">
          Go to Portal →
        </a>
      </div>
      
      <!-- What you have access to -->
      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
        <h3 style="margin:0 0 16px;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#888;">What you have access to</h3>
        ${resourcesHtml}
      </div>
      
      <!-- Instructions -->
      <div style="background:#fefce8;border:1px solid #fef08a;border-radius:12px;padding:16px;margin-bottom:24px;">
        <h4 style="margin:0 0 8px;font-size:14px;font-weight:600;color:#854d0e;">How to access</h4>
        <ol style="margin:0;padding-left:20px;color:#854d0e;font-size:14px;">
          <li style="margin-bottom:4px;">Click "Go to Portal" above</li>
          <li style="margin-bottom:4px;">Sign in with this email: <strong>${toEmail}</strong></li>
          <li>Click any program to start</li>
        </ol>
      </div>
      
      <!-- Footer -->
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0;" />
      <div style="text-align:center;color:#888;font-size:13px;">
        <p style="margin:0 0 8px;">Questions? ${supportEmail ? `Contact us at <a href="mailto:${supportEmail}" style="color:#666;">${supportEmail}</a>` : 'Reply to this email for support.'}</p>
        <p style="margin:0;">You're receiving this because you made a purchase.</p>
      </div>
      
    </div>
  `;
  
  return sendEmailBrevo({
    from: { name: 'LoveThisPlace', email: from },
    to: [{ email: toEmail }],
    subject: 'Your access is ready ✅',
    htmlContent,
    bcc: bcc ? [{ email: bcc }] : undefined,
  });
}
