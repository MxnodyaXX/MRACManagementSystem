import emailjs from '@emailjs/browser';

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  ?? '';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID ?? '';
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  ?? '';

export interface RentalSummaryParams {
  toEmail: string;
  toName: string;
  invoiceNo: string;
  vehicleName: string;
  vehicleReg: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  dailyRate: number;
  baseAmount: number;
  extraKm: number;
  extraKmRate: number;
  extraCharge: number;
  finalAmount: number;
  advancePaid: number;
  balanceCollected: number;
  ownerName: string;
  ownerPayout: number;
  commLabel: string;
  commAmount: number;
  commRate: number;
}

export async function sendRentalSummary(p: RentalSummaryParams): Promise<void> {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn('[EmailJS] Credentials not set — skipping email. Add VITE_EMAILJS_* to .env.local');
    return;
  }
  if (!p.toEmail) return;

  await emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      to_email:     p.toEmail,
      to_name:      p.toName,
      subject:      `Your EMRAC Rental Summary — ${p.invoiceNo}`,
      html_content: buildHTML(p),
    },
    PUBLIC_KEY,
  );
}

function fmt(n: number) {
  return `Rs ${n.toLocaleString()}`;
}

function buildHTML(p: RentalSummaryParams): string {
  const extraRow = p.extraKm > 0 ? `
    <tr>
      <td style="padding:10px 16px;color:#b45309;background:#fffbeb">
        Extra Km Charge
        <div style="font-size:11px;color:#d97706;margin-top:2px">${p.extraKm.toLocaleString()} km × Rs ${p.extraKmRate}</div>
      </td>
      <td style="padding:10px 16px;text-align:right;font-weight:700;color:#b45309;background:#fffbeb">
        + ${fmt(p.extraCharge)}
      </td>
    </tr>` : `
    <tr>
      <td style="padding:10px 16px;color:#059669" colspan="2">
        ✓ Within included km — no extra charge
      </td>
    </tr>`;

  const advanceRow = p.advancePaid > 0 ? `
    <tr>
      <td style="padding:10px 16px;color:#6b7280">Advance Paid at Booking</td>
      <td style="padding:10px 16px;text-align:right;font-weight:600;color:#059669">− ${fmt(p.advancePaid)}</td>
    </tr>
    <tr style="background:#f0fdf4">
      <td style="padding:10px 16px;font-weight:700;color:#065f46">Balance Collected</td>
      <td style="padding:10px 16px;text-align:right;font-weight:700;color:#065f46">= ${fmt(p.balanceCollected)}</td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rental Summary</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:600px;width:100%">

    <!-- Header -->
    <tr>
      <td style="background:#1e3a5f;padding:28px 32px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px">EMRAC</div>
              <div style="font-size:11px;color:#93c5fd;margin-top:3px">Vehicle Rental Management</div>
            </td>
            <td align="right">
              <div style="font-size:13px;font-weight:700;color:#ffffff;letter-spacing:1px">RENTAL SUMMARY</div>
              <div style="font-size:11px;color:#93c5fd;margin-top:3px">${p.invoiceNo}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Greeting -->
    <tr>
      <td style="padding:28px 32px 0">
        <p style="margin:0;font-size:15px;color:#1e293b">Dear <strong>${p.toName}</strong>,</p>
        <p style="margin:8px 0 0;font-size:13px;color:#64748b;line-height:1.6">
          Thank you for choosing EMRAC. Here is the complete summary of your recent rental.
        </p>
      </td>
    </tr>

    <!-- Vehicle + Trip -->
    <tr>
      <td style="padding:20px 32px 0">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;overflow:hidden">
          <tr>
            <td style="padding:12px 16px 8px;font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em" colspan="2">
              Trip Details
            </td>
          </tr>
          <tr>
            <td style="padding:4px 16px 4px;font-size:12px;color:#64748b;width:40%">Vehicle</td>
            <td style="padding:4px 16px 4px;font-size:12px;font-weight:600;color:#1e293b">${p.vehicleName} · ${p.vehicleReg}</td>
          </tr>
          <tr>
            <td style="padding:4px 16px 4px;font-size:12px;color:#64748b">Rental Period</td>
            <td style="padding:4px 16px 4px;font-size:12px;font-weight:600;color:#1e293b">${p.startDate} → ${p.endDate}</td>
          </tr>
          <tr>
            <td style="padding:4px 16px 12px;font-size:12px;color:#64748b">Duration</td>
            <td style="padding:4px 16px 12px;font-size:12px;font-weight:600;color:#1e293b">${p.totalDays} day${p.totalDays !== 1 ? 's' : ''}</td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Amount Breakdown -->
    <tr>
      <td style="padding:20px 32px 0">
        <p style="margin:0 0 10px;font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Amount Breakdown</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;font-size:13px">
          <tr style="background:#f8fafc">
            <th style="padding:10px 16px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Description</th>
            <th style="padding:10px 16px;text-align:right;font-size:11px;color:#64748b;font-weight:600">Amount</th>
          </tr>
          <tr>
            <td style="padding:10px 16px;color:#334155;border-top:1px solid #f1f5f9">
              Vehicle Rental
              <div style="font-size:11px;color:#94a3b8;margin-top:2px">${p.totalDays}d × Rs ${p.dailyRate.toLocaleString()}</div>
            </td>
            <td style="padding:10px 16px;text-align:right;font-weight:600;color:#1e293b;border-top:1px solid #f1f5f9">${fmt(p.baseAmount)}</td>
          </tr>
          ${extraRow}
          <tr style="background:#1e3a5f">
            <td style="padding:12px 16px;font-weight:700;color:#ffffff;font-size:14px">Final Total</td>
            <td style="padding:12px 16px;text-align:right;font-weight:900;color:#ffffff;font-size:16px">${fmt(p.finalAmount)}</td>
          </tr>
          ${advanceRow}
        </table>
      </td>
    </tr>

    <!-- Payment Split -->
    <tr>
      <td style="padding:20px 32px 0">
        <p style="margin:0 0 10px;font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Payment Distribution</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;font-size:13px">
          <tr>
            <td style="padding:10px 16px;color:#334155">
              ${p.ownerName}
              <div style="font-size:11px;color:#94a3b8">${100 - p.commRate}% owner share</div>
            </td>
            <td style="padding:10px 16px;text-align:right;font-weight:700;color:#059669">${fmt(p.ownerPayout)}</td>
          </tr>
          <tr style="border-top:1px solid #f1f5f9">
            <td style="padding:10px 16px;color:#334155">
              ${p.commLabel}
              <div style="font-size:11px;color:#94a3b8">${p.commRate}% management fee</div>
            </td>
            <td style="padding:10px 16px;text-align:right;font-weight:700;color:#2563eb">${fmt(p.commAmount)}</td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:28px 32px;text-align:center">
        <p style="margin:0;font-size:12px;color:#94a3b8">
          Thank you for choosing <strong>EMRAC</strong> · emrac.lk
        </p>
        <p style="margin:6px 0 0;font-size:11px;color:#cbd5e1">
          This is an automated rental summary. Please contact us if you have any questions.
        </p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;
}
