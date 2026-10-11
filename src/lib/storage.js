import { db } from './firebase';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

const COLLECTION_NAME = 'patients';

export const getPatients = async () => {
  const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getPatientById = async (id) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const savePatient = async (patient) => {
  let id = patient.id;
  if (!id) {
    id = Date.now().toString();
    patient.id = id;
    patient.sessions = patient.sessions || [];
    
    if (!patient.regNo) {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const sequence = Math.floor(100 + Math.random() * 900);
      patient.regNo = `GPC/${month}${year}${sequence}`;
    }
  }
  await setDoc(doc(db, COLLECTION_NAME, id), patient);
  return patient;
};

export const deletePatient = async (id) => {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
};

export const getDashboardStats = async (targetMonth = new Date().getMonth(), targetYear = new Date().getFullYear()) => {
  const patients = await getPatients();
  const totalPatients = patients.length;
  
  const isDailyPatient = (p) => p.packageDays === 'daily' || p.packageDays === 'per_session';

  // Active patients are those who haven't finished their package (excluding daily)
  const activePatients = patients.filter(p => {
    if (isDailyPatient(p)) return false;
    const activeSessions = (p.sessions || []).filter(s => !s.isHidden);
    return activeSessions.length < Number(p.packageDays);
  }).length;
  
  const isTargetMonth = (dateString) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return false;
    return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
  };

  const totalRevenue = patients.reduce((sum, p) => {
    let patientTotal = 0;
    const isDaily = isDailyPatient(p);

    if (isDaily) {
      // 1. Daily session payments (only active, non-hidden sessions)
      const activeSessions = (p.sessions || []).filter(s => !s.isHidden);
      const sessionTotal = activeSessions.reduce((sSum, s) => {
        if (isTargetMonth(s.date)) {
          return sSum + Number(s.amountPaid || 0);
        }
        return sSum;
      }, 0);
      patientTotal += sessionTotal;

      // 2. Initial payment for daily: if patient paid initial amount at registration
      // and has NO active sessions yet (prevents double-counting when first session is logged)
      if (p.paymentReceived && activeSessions.length === 0) {
        const pDate = p.paymentDate || p.startDate;
        if (isTargetMonth(pDate)) {
          patientTotal += Number(p.paymentAmount || 0);
        }
      }
    } else {
      // Package patient:
      // Current package payment: check paymentDate, fallback to startDate
      if (p.paymentReceived) {
        const pDate = p.paymentDate || p.startDate;
        if (isTargetMonth(pDate)) {
          patientTotal += Number(p.paymentAmount || 0);
        }
      }

      // Any additional session payments made during package (non-hidden)
      const activeSessions = (p.sessions || []).filter(s => !s.isHidden);
      activeSessions.forEach(s => {
        if (s.amountPaid && Number(s.amountPaid) > 0 && isTargetMonth(s.date)) {
          patientTotal += Number(s.amountPaid);
        }
      });
    }

    // 3. Package History renewals:
    if (p.packageHistory && p.packageHistory.length > 0) {
      p.packageHistory.forEach(hist => {
        const isHistDaily = hist.packageDays === 'daily' || hist.packageDays === 'per_session';
        if (isHistDaily) {
          const histActiveSessions = (hist.sessions || []).filter(s => !s.isHidden);
          histActiveSessions.forEach(s => {
            if (isTargetMonth(s.date)) {
              patientTotal += Number(s.amountPaid || 0);
            }
          });
        } else {
          const histDate = hist.paymentDate || hist.startDate || hist.endDate;
          if (hist.paymentAmount && isTargetMonth(histDate)) {
            patientTotal += Number(hist.paymentAmount || 0);
          }
        }
      });
    }
    
    return sum + patientTotal;
  }, 0);

  return { totalPatients, activePatients, totalRevenue, patients };
};

const APPOINTMENTS_COL = 'appointments';

export const getAppointments = async () => {
  const querySnapshot = await getDocs(collection(db, APPOINTMENTS_COL));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const saveAppointment = async (appointment) => {
  let id = appointment.id;
  if (!id) {
    id = Date.now().toString();
    appointment.id = id;
  }
  await setDoc(doc(db, APPOINTMENTS_COL, id), appointment);
  return appointment;
};

export const deleteAppointment = async (id) => {
  await deleteDoc(doc(db, APPOINTMENTS_COL, id));
};
