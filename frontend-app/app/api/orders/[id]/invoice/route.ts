import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [order, settings] = await Promise.all([
      prisma.order.findUnique({
        where: { id },
        include: {
          assignedCleaners: {
            include: { cleaner: true }
          }
        }
      }),
      prisma.companySettings.findUnique({
        where: { id: 1 }
      })
    ]);

    if (!order) {
      return new Response('Заказ не найден', { status: 404 });
    }

    const company = settings || {
      id: 1,
      companyName: 'BrightHouse Cleaning',
      nip: '',
      phone: '+48 000 000 000',
      email: 'contact@brighthouse.pl',
      city: '',
      address: '',
      instagram: '@brighthouse.pl',
      bankName: 'Santander',
      accountNumber: '',
      blikPhone: '',
      recipientName: '',
      cleanerRatePercent: 40,
      updatedAt: new Date(),
    };

    const dateFormatted = new Date(order.date).toLocaleDateString('pl-PL');

    const html = `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Rachunek / Faktura ${order.orderNumber}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 40px;
      color: #1e293b;
      background: #fff;
    }
    .invoice-box {
      max-width: 800px;
      margin: auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
    }
    .brand {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h1 {
      margin: 0;
      font-size: 20px;
      color: #2563eb;
    }
    .parties {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
    }
    .party-box {
      width: 45%;
      font-size: 13px;
      line-height: 1.6;
    }
    .party-box h3 {
      margin: 0 0 8px 0;
      font-size: 12px;
      text-transform: uppercase;
      color: #64748b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 40px;
      font-size: 13px;
    }
    th {
      background: #f8fafc;
      text-align: left;
      padding: 12px;
      border-bottom: 1px solid #cbd5e1;
      color: #475569;
    }
    td {
      padding: 14px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .total-box {
      margin-top: 30px;
      text-align: right;
    }
    .total-amount {
      font-size: 22px;
      font-weight: 800;
      color: #059669;
    }
    .payment-info {
      margin-top: 40px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 12px;
      font-size: 12px;
      line-height: 1.6;
    }
    .no-print {
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
    }
    .btn-print {
      background: #2563eb;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
    }
    @media print {
      .no-print { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="invoice-box">
    <div class="no-print">
      <button class="btn-print" onclick="window.print()">🖨 Drukuj / Zapisz jako PDF</button>
    </div>

    <div class="header">
      <div>
        <div class="brand">✨ ${company.companyName}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Profesjonalne usługi sprzątania</div>
      </div>
      <div class="invoice-title">
        <h1>RACHUNEK / POTWIERDZENIE</h1>
        <div style="font-size: 13px; font-weight: bold; margin-top: 4px;">Nr: ${order.orderNumber}</div>
        <div style="font-size: 12px; color: #64748b;">Data wykonania: ${dateFormatted}</div>
      </div>
    </div>

    <div class="parties">
      <div class="party-box">
        <h3>Sprzedawca / Wykonawca</h3>
        <b>${company.companyName}</b><br>
        ${company.nip ? `NIP: ${company.nip}<br>` : ''}
        ${company.address ? `${company.address}<br>` : ''}
        Tel: ${company.phone || '-'}<br>
        Email: ${company.email || '-'}
      </div>

      <div class="party-box">
        <h3>Nabywca / Klient</h3>
        <b>${order.clientName || 'Klient'}</b><br>
        Adres: ${order.addressLine1 || '-'}<br>
        Tel: ${order.clientPhone || '-'}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Lp.</th>
          <th>Nazwa usługi / Opis</th>
          <th>Ilość</th>
          <th style="text-align: right;">Wartość</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>
            <b>${order.serviceType || 'Usługa sprzątania'}</b>
            ${order.notes ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${order.notes}</div>` : ''}
          </td>
          <td>1 usł.</td>
          <td style="text-align: right; font-weight: bold;">${order.price} zł</td>
        </tr>
      </tbody>
    </table>

    <div class="total-box">
      <span style="font-size: 14px; font-weight: bold;">Do zapłaty:</span>
      <span class="total-amount">${order.price} zł</span>
    </div>

    <div class="payment-info">
      <b>Dane do płatności:</b><br>
      ${company.accountNumber ? `Numer konta bankowego (IBAN): <b>${company.accountNumber}</b> (${company.bankName || 'Bank'})<br>` : ''}
      ${company.blikPhone ? `Płatność BLIK na numer: <b>${company.blikPhone}</b><br>` : ''}
      Tytuł przelewu: <b>Rachunek ${order.orderNumber}, ${order.clientName || ''}</b>
    </div>
  </div>
</body>
</html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('Ошибка генерации счета:', error);
    return new Response('Ошибка сервера', { status: 500 });
  }
}
