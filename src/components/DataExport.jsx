import { useState, useEffect } from 'react';
import { getPatients } from '../lib/storage';
import { Download, FileSpreadsheet, Activity, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function DataExport() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const data = await getPatients();
      setPatients(data);
      setLoading(false);
    }
    load();
  }, []);

  const getMonthlyData = () => {
    let cashTotal = 0;
    let upiTotal = 0;
    const rows = [];

    const isCurrentMonth = (dateString) => {
      if (!dateString) return false;
      const d = new Date(dateString);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    };

    patients.forEach(p => {
      // Package payments
      if (p.packageDays !== 'daily' && p.paymentReceived && isCurrentMonth(p.startDate)) {
        const amt = Number(p.paymentAmount || 0);
        if (p.paymentMethod === 'Cash') cashTotal += amt;
        else upiTotal += amt;

        rows.push({
          date: format(new Date(p.startDate), 'dd/MM/yyyy'),
          patientName: p.name,
          phone: p.phone,
          regNo: p.regNo || '',
          diagnosis: p.diagnosis || 'N/A',
          type: `${p.packageDays} Days Package`,
          amount: amt,
          method: p.paymentMethod || 'UPI'
        });
      }

      // Package History payments
      if (p.packageHistory && p.packageHistory.length > 0) {
        p.packageHistory.forEach(hist => {
          if (hist.paymentAmount && hist.paymentMethod && isCurrentMonth(hist.startDate)) {
             const amt = Number(hist.paymentAmount || 0);
             if (hist.paymentMethod === 'Cash') cashTotal += amt;
             else upiTotal += amt;

             rows.push({
                date: format(new Date(hist.startDate), 'dd/MM/yyyy'),
                patientName: p.name,
                phone: p.phone,
                regNo: p.regNo || '',
                diagnosis: hist.diagnosis || p.diagnosis || 'N/A',
                type: `${hist.packageDays} Days Package`,
                amount: amt,
                method: hist.paymentMethod || 'UPI'
             });
          }
        });
      }

      // Daily sessions
      if (p.packageDays === 'daily' && p.sessions) {
        p.sessions.forEach(s => {
          if (isCurrentMonth(s.date)) {
            const amt = Number(s.amountPaid || 0);
            const method = s.paymentMethod || 'UPI';
            if (method === 'Cash') cashTotal += amt;
            else upiTotal += amt;

            rows.push({
              date: format(new Date(s.date), 'dd/MM/yyyy'),
              patientName: p.name,
              phone: p.phone,
              regNo: p.regNo || '',
              diagnosis: s.protocol || p.diagnosis || 'N/A',
              type: 'Per Session',
              amount: amt,
              method: method
            });
          }
        });
      }
    });

    // Sort rows by date descending
    rows.sort((a, b) => {
        const dateA = a.date.split('/').reverse().join('');
        const dateB = b.date.split('/').reverse().join('');
        return dateB.localeCompare(dateA);
    });

    const filteredRows = rows.filter(row => {
      const searchStr = search.toLowerCase().trim();
      const match = searchStr.match(/(?:inv|gpc)\/?\s*(\d+)/i);
      const coreId = match ? match[1] : searchStr;

      return row.patientName.toLowerCase().includes(searchStr) || 
             row.phone.includes(searchStr) || 
             row.regNo.toLowerCase().includes(searchStr) ||
             (coreId && row.regNo.toLowerCase().includes(coreId));
    });

    return { cashTotal, upiTotal, total: cashTotal + upiTotal, rows: filteredRows };
  };

  const data = getMonthlyData();

  const handleExportCSV = () => {
    if (data.rows.length === 0) return alert('No data to export for this month.');

    const headers = ['Date', 'Patient Name', 'Phone', 'Reg No', 'Diagnosis', 'Payment Type', 'Amount (Rs)', 'Method'];
    const csvContent = [
      headers.join(','),
      ...data.rows.map(r => `"${r.date}","${r.patientName}","${r.phone}","${r.regNo}","${r.diagnosis}","${r.type}",${r.amount},"${r.method}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const monthName = new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' });
    link.href = url;
    link.setAttribute('download', `Gyromotion_Report_${monthName}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-8">Loading Data...</div>;

  const cashPercentage = data.total === 0 ? 0 : Math.round((data.cashTotal / data.total) * 100);
  const upiPercentage = data.total === 0 ? 0 : Math.round((data.upiTotal / data.total) * 100);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="flex items-center gap-3 mb-2"><FileSpreadsheet size={28} className="text-primary" /> Reports & Data Export</h1>
          <p className="text-muted">Analyze financial data and export statements securely.</p>
        </div>
        <div className="flex gap-4">
          <select className="form-control mb-0" style={{ width: '150px' }} value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select className="form-control mb-0" style={{ width: '120px' }} value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card glass-panel flex flex-col justify-center items-center text-center p-8">
          <p className="text-muted text-sm font-semibold uppercase tracking-wider mb-2">Total Monthly Revenue</p>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--success)', margin: 0 }}>₹{data.total.toLocaleString()}</h2>
        </div>

        <div className="card glass-panel" style={{ gridColumn: 'span 2' }}>
          <h3 className="mb-6 flex items-center gap-2"><Activity size={20} /> Revenue Breakdown</h3>
          
          <div className="flex justify-between text-sm font-medium mb-2">
            <span style={{ color: 'var(--primary-color)' }}>UPI (₹{data.upiTotal.toLocaleString()})</span>
            <span style={{ color: '#f59e0b' }}>Cash (₹{data.cashTotal.toLocaleString()})</span>
          </div>
          
          <div style={{ height: '24px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '12px', overflow: 'hidden', display: 'flex', marginBottom: '1.5rem' }}>
            <div style={{ width: `${upiPercentage}%`, backgroundColor: 'var(--primary-color)', height: '100%', transition: 'width 0.5s ease' }}></div>
            <div style={{ width: `${cashPercentage}%`, backgroundColor: '#f59e0b', height: '100%', transition: 'width 0.5s ease' }}></div>
          </div>

          <div className="flex justify-between text-muted text-sm">
            <span>{upiPercentage}% Digital</span>
            <span>{cashPercentage}% Cash</span>
          </div>
        </div>
      </div>

      <div className="card glass-panel">
        <div className="flex justify-between items-center mb-6">
          <h3>Transaction History</h3>
          <button className="btn btn-primary flex items-center gap-2" onClick={handleExportCSV}>
            <Download size={18} /> Export Excel (CSV)
          </button>
        </div>

        {data.rows.length === 0 ? (
          <div className="text-center p-8 text-muted border-dashed border-2" style={{ borderColor: 'var(--border-color)', borderRadius: '12px' }}>
            No transactions found for this month.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th className="text-left p-3 text-muted font-medium">Date</th>
                  <th className="text-left p-3 text-muted font-medium">Patient Name</th>
                  <th className="text-left p-3 text-muted font-medium">Diagnosis</th>
                  <th className="text-left p-3 text-muted font-medium">Payment Type</th>
                  <th className="text-right p-3 text-muted font-medium">Method</th>
                  <th className="text-right p-3 text-muted font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td className="p-3">{row.date}</td>
                    <td className="p-3 font-medium">{row.patientName}</td>
                    <td className="p-3 text-sm text-muted">{row.diagnosis}</td>
                    <td className="p-3 text-sm text-muted">{row.type}</td>
                    <td className="p-3 text-right">
                      <span className={`badge ${row.method === 'UPI' ? 'badge-primary' : 'badge-warning'}`}>
                        {row.method}
                      </span>
                    </td>
                    <td className="p-3 text-right font-medium text-success">₹{row.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
