import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getPatientById } from '../lib/storage';
import { numberToWordsRupees } from '../lib/numberToWords';
import { format } from 'date-fns';
import logo from '../assets/logo.png';

export default function Invoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [patient, setPatient] = useState(null);
  const [invoiceUniqueId] = useState(() => format(new Date(), 'ddHHmmss'));
  
  const billMode = searchParams.get('billMode') || 'current';
  
  useEffect(() => {
    async function load() {
      const data = await getPatientById(id);
      setPatient(data);
    }
    load();
  }, [id]);

  if (!patient) return <div className="p-8">Loading Invoice...</div>;

  let totalAmount = 0;
  let dateRange = format(new Date(patient.startDate || new Date()), 'dd/MM/yyyy');
  let allAttendance = [];

  const billItems = [];

  if (billMode === 'all' && patient.packageHistory) {
    patient.packageHistory.forEach((hist) => {
        const activeHistSessions = (hist.sessions || []).filter(s => !s.isHidden);
        if (activeHistSessions.length > 0) {
          if (hist.packageDays === 'daily') {
            activeHistSessions.forEach(s => billItems.push({...s, isSession: true, packageDays: 'daily', diagnosis: patient.diagnosis}));
          } else {
            billItems.push({...hist, isPackage: true, isHistory: true});
          }
          allAttendance = [...allAttendance, ...activeHistSessions];
        }
    });
  }

  const activeSessions = (patient.sessions || []).filter(s => !s.isHidden);

  if (patient.packageDays === 'daily' && activeSessions.length > 0) {
    activeSessions.forEach(s => billItems.push({...s, isSession: true, packageDays: 'daily', diagnosis: patient.diagnosis}));
    allAttendance = [...allAttendance, ...activeSessions];
  } else if (patient.packageDays !== 'daily') {
    billItems.push({...patient, isPackage: true});
    if (activeSessions.length > 0) allAttendance = [...allAttendance, ...activeSessions];
  }

  // Calculate totals and dates
  totalAmount = billItems.reduce((sum, item) => sum + Number(item.isSession ? (item.amountPaid || 0) : (item.paymentAmount || 0)), 0);
  
  if (billItems.length > 0) {
    const dates = billItems.map(item => new Date(item.isSession ? item.date : item.startDate).getTime()).sort();
    if (dates.length > 0) {
      const firstDate = format(new Date(dates[0]), 'dd/MM/yyyy');
      const lastDate = format(new Date(dates[dates.length - 1]), 'dd/MM/yyyy');
      dateRange = firstDate === lastDate ? firstDate : `${firstDate} - ${lastDate}`;
    }
  }

  const handlePrint = () => {
    // Remove focus from the button so CSS active/focus states don't cause layout thrashing
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    // Double requestAnimationFrame guarantees the browser has fully painted the neutral state
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  };

  return (
    <div className="invoice-container">
      {/* Non-printable back button */}
      <div className="no-print" style={{ padding: '20px', textAlign: 'center', marginBottom: '20px' }}>
        <button className="btn btn-outline mr-4" style={{ marginRight: '1rem' }} onClick={() => navigate(-1)}>Back to Profile</button>
        <button className="btn btn-primary" onClick={handlePrint}>Print / Save as PDF</button>
      </div>

      {/* Strict A4 Container */}
      <div className="invoice-page" style={{ 
        width: '210mm',
        minHeight: '297mm',
        display: 'flex', 
        flexDirection: 'column', 
        boxSizing: 'border-box', 
        backgroundColor: '#fff', 
        color: '#1e3a5f', 
        padding: '15mm 20mm', 
        margin: '0 auto', 
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)', 
        fontFamily: 'Arial, sans-serif' 
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <img src={logo} alt="Gyromotion Logo" style={{ height: '70px', objectFit: 'contain' }} />
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.9rem', fontStyle: 'italic', color: '#1e3a5f' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Dr. Prajakta Joshi</div>
            <div>Consultant Physiotherapist</div>
            <div>MPT-Neuro, COMT, CTE, CDRS</div>
            <div>Reg. No. 2023/12/PT/012154</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.9rem', fontStyle: 'italic', color: '#334155', marginBottom: '25px' }}>
          www.gyromotionphysio.in | +91 9518554022 | gyromotion.physio@gmail.com
        </div>

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '1.15rem', marginBottom: '5px' }}>
            PHYSIOTHERAPY TREATMENT BILL CUM RECIEPT
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
            Invoice No: {patient.regNo ? patient.regNo.replace('GPC/', 'INV/') + `-${invoiceUniqueId}` : `INV/${patient.id.slice(-4)}-${invoiceUniqueId}`}
          </div>
        </div>

        <div style={{ marginBottom: '25px', fontSize: '1.05rem', lineHeight: '1.6', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div><strong style={{ color: '#0f172a' }}>Name:</strong> {patient.name}</div>
            <div><strong style={{ color: '#0f172a' }}>Patient Reg. No.:</strong> {patient.regNo || 'GPC/000000'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div><strong style={{ color: '#0f172a' }}>Date:</strong> {dateRange}</div>
            {patient.packageDays !== 'daily' && (
              <div><strong style={{ color: '#0f172a' }}>Sessions Completed:</strong> {activeSessions.length} / {patient.packageDays}</div>
            )}
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #93c5fd', padding: '12px', textAlign: 'left', backgroundColor: '#eff6ff', width: '60px', color: '#1e3a8a' }}>Sr.No.</th>
              <th style={{ border: '1px solid #93c5fd', padding: '12px', textAlign: 'left', backgroundColor: '#eff6ff', color: '#1e3a8a' }}>Date</th>
              <th style={{ border: '1px solid #93c5fd', padding: '12px', textAlign: 'left', backgroundColor: '#eff6ff', color: '#1e3a8a' }}>Service provided</th>
              <th style={{ border: '1px solid #93c5fd', padding: '12px', textAlign: 'left', backgroundColor: '#eff6ff', color: '#1e3a8a' }}>Per Session<br/>Charges(Rupees)</th>
              <th style={{ border: '1px solid #93c5fd', padding: '12px', textAlign: 'left', backgroundColor: '#eff6ff', color: '#1e3a8a' }}>No. of Sessions</th>
              <th style={{ border: '1px solid #93c5fd', padding: '12px', textAlign: 'left', backgroundColor: '#eff6ff', color: '#1e3a8a' }}>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {billItems.map((item, index) => {
              if (item.isSession) {
                return (
                  <tr key={index} style={{ pageBreakInside: 'avoid' }}>
                    <td style={{ border: '1px solid #93c5fd', padding: '12px', textAlign: 'center' }}>
                      <span style={{ backgroundColor: '#eff6ff', padding: '4px 12px', borderRadius: '12px', fontSize: '0.9rem' }}>{index + 1}</span>
                    </td>
                    <td style={{ border: '1px solid #93c5fd', padding: '12px' }}>
                      <span style={{ backgroundColor: '#eff6ff', padding: '4px 10px', borderRadius: '12px', fontSize: '0.9rem' }}>{format(new Date(item.date), 'dd/MM/yyyy')}</span>
                    </td>
                    <td style={{ border: '1px solid #93c5fd', padding: '12px' }}>{item.protocol || item.diagnosis || 'Consultation & Treatment'}</td>
                    <td style={{ border: '1px solid #93c5fd', padding: '12px' }}>{item.amountPaid}/-</td>
                    <td style={{ border: '1px solid #93c5fd', padding: '12px', textAlign: 'center' }}>1</td>
                    <td style={{ border: '1px solid #93c5fd', padding: '12px' }}>{item.amountPaid}/-</td>
                  </tr>
                );
              } else {
                return (
                  <tr key={index} style={{ pageBreakInside: 'avoid' }}>
                    <td style={{ border: '1px solid #93c5fd', padding: '12px', textAlign: 'center' }}>
                      <span style={{ backgroundColor: '#eff6ff', padding: '4px 12px', borderRadius: '12px', fontSize: '0.9rem' }}>{index + 1}</span>
                    </td>
                    <td style={{ border: '1px solid #93c5fd', padding: '12px' }}>
                      <span style={{ backgroundColor: '#eff6ff', padding: '4px 10px', borderRadius: '12px', fontSize: '0.9rem' }}>{format(new Date(item.startDate || new Date()), 'dd/MM/yyyy')}</span>
                    </td>
                    <td style={{ border: '1px solid #93c5fd', padding: '12px' }}>{item.diagnosis || 'Package Payment'}</td>
                    <td style={{ border: '1px solid #93c5fd', padding: '12px' }}>
                      {item.paymentAmount ? (item.paymentAmount / parseInt(item.packageDays)).toFixed(0) : 0}/-
                    </td>
                    <td style={{ border: '1px solid #93c5fd', padding: '12px', textAlign: 'center' }}>{item.packageDays}</td>
                    <td style={{ border: '1px solid #93c5fd', padding: '12px' }}>{item.paymentAmount}/-</td>
                  </tr>
                );
              }
            })}
            <tr>
              <td colSpan="4" style={{ border: '1px solid #93c5fd', padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Total</td>
              <td style={{ border: '1px solid #93c5fd', padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                {billItems.reduce((sum, item) => sum + (item.isSession ? 1 : Number(item.packageDays || 0)), 0)}
              </td>
              <td style={{ border: '1px solid #93c5fd', padding: '12px', fontWeight: 'bold' }}>{totalAmount}/-</td>
            </tr>
          </tbody>
        </table>

        <div style={{ border: '1px solid #93c5fd', padding: '15px', marginBottom: '40px', fontSize: '1rem', backgroundColor: '#eff6ff' }}>
          <strong style={{ color: '#0f172a' }}>Total Amount in Words:</strong> {numberToWordsRupees(totalAmount)}
        </div>

        {/* Spacer to perfectly stretch the A4 page */}
        <div style={{ flexGrow: 1, minHeight: '50px' }}></div>

        {/* Footer sticks exactly to bottom margin */}
        <div style={{ position: 'relative', width: '100%', marginTop: 'auto', paddingTop: '40px' }}>
          
          <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '15px', textAlign: 'center', fontStyle: 'italic', fontSize: '0.95rem', color: '#1e3a8a', position: 'relative', zIndex: 10 }}>
            Plot no. 01, Shree Siddhiviinayak Society, Nr. Pawar Hospital, Vatan Nagar,<br/>
            Talegaon Dabhade, Pune- 410507
          </div>

          {/* Swoosh Design */}
          <svg className="print-swoosh" style={{ position: 'absolute', bottom: 0, right: 0, zIndex: 0, width: '350px', height: '350px', pointerEvents: 'none' }} viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M400,400 L400,200 C300,250 150,300 0,400 Z" fill="#93c5fd" opacity="0.4" />
            <path d="M400,400 L400,250 C250,280 100,350 0,400 Z" fill="#1e3a8a" opacity="0.15" />
          </svg>

        </div>
      </div>
    </div>
  );
}
