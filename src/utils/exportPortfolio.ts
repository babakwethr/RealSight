import { format } from 'date-fns';

interface Investor {
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
}

interface Holding {
  unit_ref: string;
  invested_amount: number;
  current_value: number;
  status: string;
  project?: { name: string; location?: string; developer?: string };
}

interface Payment {
  due_date: string;
  amount: number;
  status: string;
  note: string | null;
  project?: { name: string };
}

interface Document {
  title: string;
  category: string;
  file_url: string;
  created_at: string;
  project?: { name: string } | null;
}

interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
  roi: number;
  holdingsCount: number;
}

interface ExportData {
  investor: Investor;
  holdings: Holding[];
  payments: Payment[];
  documents: Document[];
  summary: PortfolioSummary | null;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function exportToCSV(data: ExportData) {
  const { investor, holdings, payments, documents, summary } = data;
  const lines: string[] = [];
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm');

  // Header
  lines.push('INVESTOR PORTFOLIO REPORT');
  lines.push(`Generated: ${timestamp}`);
  lines.push('');

  // Investor Info
  lines.push('INVESTOR INFORMATION');
  lines.push(`Name,${investor.name}`);
  lines.push(`Email,${investor.email}`);
  lines.push(`Phone,${investor.phone || 'N/A'}`);
  lines.push(`Country,${investor.country || 'N/A'}`);
  lines.push('');

  // Portfolio Summary
  if (summary) {
    lines.push('PORTFOLIO SUMMARY');
    lines.push(`Total Invested,${formatCurrency(summary.totalInvested)}`);
    lines.push(`Current Value,${formatCurrency(summary.currentValue)}`);
    lines.push(`Profit/Loss,${formatCurrency(summary.profitLoss)}`);
    lines.push(`ROI,${summary.roi.toFixed(1)}%`);
    lines.push(`Holdings Count,${summary.holdingsCount}`);
    lines.push('');
  }

  // Holdings
  lines.push('HOLDINGS');
  lines.push('Project,Unit Ref,Invested Amount,Current Value,Gain/Loss,Status');
  holdings.forEach(h => {
    const gain = ((h.current_value - h.invested_amount) / h.invested_amount) * 100;
    lines.push(`"${h.project?.name || 'Unknown'}","${h.unit_ref}","${formatCurrency(h.invested_amount)}","${formatCurrency(h.current_value)}","${gain >= 0 ? '+' : ''}${gain.toFixed(1)}%","${h.status}"`);
  });
  lines.push('');

  // Payments
  lines.push('PAYMENTS');
  lines.push('Project,Due Date,Amount,Status,Note');
  payments.forEach(p => {
    lines.push(`"${p.project?.name || 'Unknown'}","${format(new Date(p.due_date), 'MMM d, yyyy')}","${formatCurrency(p.amount)}","${p.status}","${p.note || ''}"`);
  });
  lines.push('');

  // Documents
  lines.push('DOCUMENTS');
  lines.push('Title,Category,Project,Date Added');
  documents.forEach(d => {
    lines.push(`"${d.title}","${d.category}","${d.project?.name || 'General'}","${format(new Date(d.created_at), 'MMM d, yyyy')}"`);
  });

  // Create and download
  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${investor.name.replace(/\s+/g, '_')}_Portfolio_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToPDF(data: ExportData) {
  const { investor, holdings, payments, documents, summary } = data;
  const timestamp = format(new Date(), 'MMMM d, yyyy \'at\' h:mm a');

  // Create HTML content for PDF
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Portfolio Report - ${investor.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      color: #1a1a1a; 
      line-height: 1.6;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header { 
      border-bottom: 2px solid #c9a962; 
      padding-bottom: 20px; 
      margin-bottom: 30px; 
    }
    .header h1 { 
      color: #c9a962; 
      font-size: 28px; 
      font-weight: 600; 
    }
    .header p { 
      color: #666; 
      font-size: 12px; 
      margin-top: 8px; 
    }
    .section { margin-bottom: 30px; }
    .section-title { 
      font-size: 16px; 
      font-weight: 600; 
      color: #1a1a1a; 
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e5e5e5;
    }
    .info-grid { 
      display: grid; 
      grid-template-columns: repeat(2, 1fr); 
      gap: 8px 24px; 
    }
    .info-item { font-size: 13px; }
    .info-label { color: #666; }
    .info-value { font-weight: 500; }
    .summary-grid { 
      display: grid; 
      grid-template-columns: repeat(4, 1fr); 
      gap: 16px; 
    }
    .summary-card { 
      background: #f8f8f8; 
      padding: 16px; 
      border-radius: 8px; 
      text-align: center;
    }
    .summary-value { 
      font-size: 18px; 
      font-weight: 600; 
      color: #1a1a1a; 
    }
    .summary-label { 
      font-size: 11px; 
      color: #666; 
      text-transform: uppercase; 
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
    .positive { color: #10b981; }
    .negative { color: #ef4444; }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      font-size: 12px; 
    }
    th { 
      background: #f8f8f8; 
      padding: 10px 8px; 
      text-align: left; 
      font-weight: 600; 
      color: #666;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
    }
    td { 
      padding: 10px 8px; 
      border-bottom: 1px solid #eee; 
    }
    .status { 
      display: inline-block; 
      padding: 2px 8px; 
      border-radius: 4px; 
      font-size: 10px; 
      font-weight: 500;
      text-transform: uppercase;
    }
    .status-active, .status-paid { background: #d1fae5; color: #059669; }
    .status-pending, .status-due { background: #fef3c7; color: #d97706; }
    .status-sold { background: #e5e5e5; color: #666; }
    .status-overdue { background: #fee2e2; color: #dc2626; }
    .footer { 
      margin-top: 40px; 
      padding-top: 20px; 
      border-top: 1px solid #e5e5e5; 
      font-size: 11px; 
      color: #999; 
      text-align: center; 
    }
    @media print {
      body { padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Portfolio Report</h1>
    <p>Generated on ${timestamp}</p>
  </div>

  <div class="section">
    <div class="section-title">Investor Information</div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Name: </span>
        <span class="info-value">${investor.name}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Email: </span>
        <span class="info-value">${investor.email}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Phone: </span>
        <span class="info-value">${investor.phone || 'N/A'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Country: </span>
        <span class="info-value">${investor.country || 'N/A'}</span>
      </div>
    </div>
  </div>

  ${summary ? `
  <div class="section">
    <div class="section-title">Portfolio Summary</div>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-value">${formatCurrency(summary.totalInvested)}</div>
        <div class="summary-label">Total Invested</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${formatCurrency(summary.currentValue)}</div>
        <div class="summary-label">Current Value</div>
      </div>
      <div class="summary-card">
        <div class="summary-value ${summary.profitLoss >= 0 ? 'positive' : 'negative'}">${formatCurrency(summary.profitLoss)}</div>
        <div class="summary-label">Profit/Loss</div>
      </div>
      <div class="summary-card">
        <div class="summary-value ${summary.roi >= 0 ? 'positive' : 'negative'}">${summary.roi >= 0 ? '+' : ''}${summary.roi.toFixed(1)}%</div>
        <div class="summary-label">ROI</div>
      </div>
    </div>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Holdings (${holdings.length})</div>
    ${holdings.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Project</th>
          <th>Unit Ref</th>
          <th>Invested</th>
          <th>Current Value</th>
          <th>Gain/Loss</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${holdings.map(h => {
    const gain = ((h.current_value - h.invested_amount) / h.invested_amount) * 100;
    return `
          <tr>
            <td>${h.project?.name || 'Unknown'}</td>
            <td>${h.unit_ref}</td>
            <td>${formatCurrency(h.invested_amount)}</td>
            <td>${formatCurrency(h.current_value)}</td>
            <td class="${gain >= 0 ? 'positive' : 'negative'}">${gain >= 0 ? '+' : ''}${gain.toFixed(1)}%</td>
            <td><span class="status status-${h.status}">${h.status}</span></td>
          </tr>
          `;
  }).join('')}
      </tbody>
    </table>
    ` : '<p style="color: #666; font-size: 13px;">No holdings recorded.</p>'}
  </div>

  <div class="section">
    <div class="section-title">Payments (${payments.length})</div>
    ${payments.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Project</th>
          <th>Due Date</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        ${payments.map(p => `
          <tr>
            <td>${p.project?.name || 'Unknown'}</td>
            <td>${format(new Date(p.due_date), 'MMM d, yyyy')}</td>
            <td>${formatCurrency(p.amount)}</td>
            <td><span class="status status-${p.status}">${p.status}</span></td>
            <td>${p.note || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : '<p style="color: #666; font-size: 13px;">No payments recorded.</p>'}
  </div>

  <div class="section">
    <div class="section-title">Documents (${documents.length})</div>
    ${documents.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Category</th>
          <th>Project</th>
          <th>Date Added</th>
        </tr>
      </thead>
      <tbody>
        ${documents.map(d => `
          <tr>
            <td>${d.title}</td>
            <td style="text-transform: capitalize;">${d.category}</td>
            <td>${d.project?.name || 'General'}</td>
            <td>${format(new Date(d.created_at), 'MMM d, yyyy')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : '<p style="color: #666; font-size: 13px;">No documents uploaded.</p>'}
  </div>

  <div class="footer">
    Realsight Investor Lounge &mdash; Confidential Portfolio Report
  </div>
</body>
</html>
  `;

  // Open in new window and trigger print
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load then trigger print
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
