import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { api } from '../services/api.js'
import { throwFriendly } from './apiError.js'

async function fetchAdminData(path, params = {}) {
  try {
    const { data } = await api.get(path, { params })
    if (!data?.success) throw new Error(data?.error?.message || 'Request failed')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Request failed')
  }
}

function formatAmount(v, currency = 'INR') {
  const num = Number(v)
  if (!Number.isFinite(num)) return String(v ?? '—')
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(num)
  } catch {
    return `${currency} ${num.toFixed(0)}`
  }
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function reportFileName() {
  const stamp = new Date().toISOString().slice(0, 10)
  return `b2b-admin-report-${stamp}.pdf`
}

async function loadReportData() {
  const [
    stats,
    txData,
    pendingReqData,
    unreadData,
    msgData,
  ] = await Promise.all([
    fetchAdminData('/admin/stats'),
    fetchAdminData('/admin/transactions', { limit: 15, page: 1 }),
    fetchAdminData('/admin/category-requests', { status: 'PENDING', limit: 10, page: 1 }),
    fetchAdminData('/admin/messages/unread-count'),
    fetchAdminData('/admin/messages', { status: 'UNREAD', limit: 10, page: 1 }),
  ])

  return {
    stats,
    transactions: txData?.transactions ?? [],
    pendingRequests: pendingReqData?.requests ?? [],
    pendingRequestCount: pendingReqData?.pagination?.total ?? pendingReqData?.requests?.length ?? 0,
    unreadMessages: unreadData?.count ?? 0,
    messages: msgData?.messages ?? [],
  }
}

/**
 * Fetches admin dashboard data and downloads a PDF platform report.
 */
export async function downloadAdminReportPdf({ adminName, adminEmail } = {}) {
  const data = await loadReportData()
  const generatedAt = formatDateTime(new Date())
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 16

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(15, 23, 42)
  doc.text('B2B Admin Platform Report', 14, y)

  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text(`Generated: ${generatedAt}`, 14, y)
  if (adminName || adminEmail) {
    y += 5
    doc.text(`Prepared for: ${adminName || 'Admin'}${adminEmail ? ` (${adminEmail})` : ''}`, 14, y)
  }

  y += 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)
  doc.text('Platform summary', 14, y)

  autoTable(doc, {
    startY: y + 4,
    head: [['Metric', 'Count / Value']],
    body: [
      ['Registered buyers', String(data.stats?.buyers ?? 0)],
      ['Active sellers', String(data.stats?.sellers ?? 0)],
      ['Total products', String(data.stats?.products ?? 0)],
      ['Total orders', String(data.stats?.orders ?? 0)],
      ['Revenue (confirmed / shipped / delivered)', formatAmount(data.stats?.revenue)],
      ['Pending category requests', String(data.pendingRequestCount)],
      ['Unread support messages', String(data.unreadMessages)],
    ],
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  })

  y = doc.lastAutoTable.finalY + 12

  if (data.transactions.length) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(15, 23, 42)
    doc.text('Recent transactions', 14, y)

    autoTable(doc, {
      startY: y + 4,
      head: [['Order', 'Buyer', 'Amount', 'Status', 'Date']],
      body: data.transactions.map((tx) => [
        tx.orderNumber || tx.id?.slice(0, 8) || '—',
        tx.buyer?.companyName || tx.buyer?.email || '—',
        formatAmount(tx.totalAmount),
        tx.status || '—',
        formatDateTime(tx.createdAt),
      ]),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    })

    y = doc.lastAutoTable.finalY + 12
  }

  if (data.pendingRequests.length) {
    if (y > 240) {
      doc.addPage()
      y = 16
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(15, 23, 42)
    doc.text('Pending category requests', 14, y)

    autoTable(doc, {
      startY: y + 4,
      head: [['Category', 'Seller', 'Status', 'Submitted']],
      body: data.pendingRequests.map((req) => [
        req.categoryName || '—',
        req.seller?.companyName || req.seller?.email || '—',
        req.status || '—',
        formatDateTime(req.createdAt),
      ]),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [245, 158, 11], textColor: 255 },
      alternateRowStyles: { fillColor: [255, 251, 235] },
      margin: { left: 14, right: 14 },
    })

    y = doc.lastAutoTable.finalY + 12
  }

  if (data.messages.length) {
    if (y > 240) {
      doc.addPage()
      y = 16
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(15, 23, 42)
    doc.text('Unread messages', 14, y)

    autoTable(doc, {
      startY: y + 4,
      head: [['Subject', 'From', 'Role', 'Received']],
      body: data.messages.map((msg) => [
        msg.subject || 'No subject',
        msg.sender?.companyName || msg.sender?.email || '—',
        msg.sender?.role || '—',
        formatDateTime(msg.createdAt),
      ]),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [239, 68, 68], textColor: 255 },
      alternateRowStyles: { fillColor: [254, 242, 242] },
      margin: { left: 14, right: 14 },
    })
  }

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `B2B Marketplace · Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' },
    )
  }

  doc.save(reportFileName())
}
