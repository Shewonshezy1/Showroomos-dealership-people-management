/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const formatLKR = (amount: number): string => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'LKR 0';
  }
  return `LKR ${Math.round(amount).toLocaleString('en-US')}`;
};

export const getTodayDDMMYYYY = (): string => {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
};

export const generateBookingId = (countOrList: number | { id: string }[]): string => {
  if (Array.isArray(countOrList)) {
    let maxId = 42;
    countOrList.forEach(b => {
      const match = b.id.match(/BK-\d+-0*(\d+)/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxId) maxId = val;
      }
    });
    return `BK-2026-${String(maxId + 1).padStart(4, '0')}`;
  }
  const num = String(Math.max(43, countOrList + 1)).padStart(4, '0');
  return `BK-2026-${num}`;
};

export const generateChassisNumber = (): string => {
  const chars = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ME3U4S2C5${rand}`;
};

export const generateEngineNumber = (): string => {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `UJ3E5N${num}`;
};

export const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const sanitize = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(sanitize).join(','),
    ...rows.map(row => row.map(sanitize).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
