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
      city: 'Warszawa',
      address: '',
      instagram: '@brighthouse.pl',
      bankName: 'Santander Bank Polska',
      accountNumber: '',
      blikPhone: '',
      recipientName: 'BrightHouse',
      cleanerRatePercent: 40,
      updatedAt: new Date(),
    };

    const dateFormatted = new Date(order.date).toLocaleDateString('pl-PL');

    // Собираем детализированные позиции для счета
    const items: { name: string; qty: string; total: string }[] = [];

    // 1. Основная уборка
    const serviceNames: Record<string, string> = {
      STANDARD: 'Sprzątanie standardowe',
      STANDARD_PLUS: 'Sprzątanie Standard Plus',
      GENERAL: 'Sprzątanie generalne',
      AFTER_REPAIR: 'Sprzątanie po remoncie',
      OFFICE_REGULAR: 'Sprzątanie biura (regularne)',
      OFFICE_GENERAL: 'Sprzątanie biura (generalne)',
    };
    items.push({
      name: `${serviceNames[order.serviceType] || 'Usługa sprzątania'} (${order.areaM2 || 0} m², ${order.roomsCount || 1} pok., ${order.bathroomsCount || 1} łaz.)`,
      qty: '1 usł.',
      total: 'Wycena łączna'
    });

    // 2. Окна
    if (order.windowsCount) items.push({ name: 'Mycie okien standardowych', qty: `${order.windowsCount} szt.`, total: 'W cenie' });
    if ((order as any).balconyWindowsCount) items.push({ name: 'Mycie okien balkonowych / przesuwnych', qty: `${(order as any).balconyWindowsCount} szt.`, total: 'W cenie' });
    if ((order as any).showcaseWindowsCount) items.push({ name: 'Mycie witryn szklanych', qty: `${(order as any).showcaseWindowsCount} szt.`, total: 'W cenie' });

    // 3. Техника и кухня
    if (order.hasOven) items.push({ name: 'Czyszczenie piekarnika wewnątrz', qty: '1 szt.', total: 'W cenie' });
    if (order.hasFridge || order.hasFridgeFreeze) items.push({ name: 'Czyszczenie lodówki wewnątrz', qty: '1 szt.', total: 'W cenie' });
    if (order.hasMicrowave) items.push({ name: 'Czyszczenie mikrofalówki', qty: '1 szt.', total: 'W cenie' });
    if (order.hasKitchenClosets) items.push({ name: 'Czyszczenie szafek kuchennych wewnątrz', qty: '1 usł.', total: 'W cenie' });

    // 4. Химчистка
    if (order.drySofa2) items.push({ name: 'Pranie kanapy 2-osobowej', qty: `${order.drySofa2} szt.`, total: 'W cenie' });
    if (order.drySofa3) items.push({ name: 'Pranie kanapy 3-osobowej', qty: `${order.drySofa3} szt.`, total: 'W cenie' });
    if (order.drySofaCorner4) items.push({ name: 'Pranie narożnika', qty: `${order.drySofaCorner4} szt.`, total: 'W cenie' });
    if (order.dryArmchair) items.push({ name: 'Pranie fotela', qty: `${order.dryArmchair} szt.`, total: 'W cenie' });

    const isPaid = order.status === 'COMPLETED';

    const html = `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Rachunek ${order.orderNumber}</title>
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
      margin-top: 35px;
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
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .total-box {
      margin-top: 25px;
      text-align: right;
    }
    .total-amount {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin-left: 10px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: bold;
      margin-top: 5px;
    }
    .paid { background: #dcfce7; color: #15803d; }
    .unpaid { background: #fef3c7; color: #b45309; }
    .payment-info {
      margin-top: 30px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 12px;
      font-size: 12px;
      line-height: 1.6;
      border: 1px solid #e2e8f0;
    }
    .exemption-note {
      font-size: 11px;
      color: #64748b;
      margin-top: 20px;
      font-style: italic;
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
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Profesjonalne usługi czyszczenia i sprzątania</div>
      </div>
      <div class="invoice-title">
        <h1>RACHUNEK</h1>
        <div style="font-size: 13px; font-weight: bold; margin-top: 4px;">Nr: ${order.orderNumber || order.id}</div>
        <div style="font-size: 12px; color: #64748b;">Data wykonania: ${dateFormatted}</div>
        <div>
          ${isPaid 
            ? '<span class="status-badge paid">✓ OPŁACONO</span>' 
            : '<span class="status-badge unpaid">DO ZAPŁATY</span>'}
        </div>
      </div>
    </div>

    <div class="parties">
      <div class="party-box">
        <h3>Sprzedawca / Wykonawca</h3>
        <b>${company.companyName}</b><br>
        ${company.nip ? `NIP: ${company.nip}<br>` : ''}
        ${company.address ? `${company.address},${company.city}<br>` : ''}
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
          <th style="width: 40px;">Lp.</th>
          <th>Nazwa usługi / Opis</th>
          <th style="width: 80px; text-align: center;">Ilość</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td><b>${item.name}</b></td>
            <td style="text-align: center;">${item.qty}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="total-box">
      <span style="font-size: 14px; font-weight: bold; color: #64748b;">Łączna kwota do zapłaty:</span>
      <span class="total-amount">${order.price} zł</span>
    </div>

    <div class="payment-info">
      <b>Szczegóły płatności:</b><br>
      Metoda płatności: <b>${order.paymentMethod === 'CARD' ? 'Karta / Terminal' : order.paymentMethod === 'TRANSFER' ? 'Przelew bankowy' : order.paymentMethod === 'BLIK' ? 'BLIK' : 'Gotówka'}</b><br>
      ${company.accountNumber ? `Konto bankowe (IBAN): <b>${company.accountNumber}</b> (${company.bankName})<br>` : ''}
      ${company.blikPhone ? `Numer telefonu do płatności BLIK: <b>${company.blikPhone}</b><br>` : ''}
      Tytuł przelewu: <b>Rachunek ${order.orderNumber || order.id}, ${order.clientName || ''}</b>
    </div>

    <div class="exemption-note">
      * Podstawa prawna zwolnienia z VAT: Zwolnienie z podatku od towarów i usług na podstawie art. 113 ust. 1 (lub ust. 9) ustawy z dnia 11 marca 2004 r. o podatku od towarów i usług.
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
