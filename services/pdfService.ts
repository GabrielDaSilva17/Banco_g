
import type { Table } from '../types';

declare global {
  interface Window {
    jspdf: any;
  }
}

export const exportTableToPDF = (table: Table) => {
  if (!window.jspdf || !(window.jspdf.jsPDF)) {
    alert("PDF generation library is not loaded.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const head = [table.columns.map(c => c.name)];
  const body = table.rows.map(row => 
    table.columns.map(col => {
      const data = row[col.id];
      if (col.type === 'IMAGE' && typeof data === 'string' && data.startsWith('data:image')) {
        return '[Image Data]';
      }
      if (data === null || data === undefined) {
          return '';
      }
      if(typeof data === 'boolean') {
          return data ? 'Yes' : 'No';
      }
      return String(data);
    })
  );

  (doc as any).autoTable({
    head: head,
    body: body,
    startY: 20,
    theme: 'grid',
    headStyles: { fillColor: [34, 40, 49] },
  });

  doc.text(`Table: ${table.name}`, 14, 15);
  doc.save(`${table.name.replace(/\s/g, '_')}.pdf`);
};
