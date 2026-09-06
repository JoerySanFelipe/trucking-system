import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBtss4Q9_vN6abz3HPrjTOv84wYwERGQ2E",
  authDomain: "porbido-trucking-de12b.firebaseapp.com",
  projectId: "porbido-trucking-de12b",
  storageBucket: "porbido-trucking-de12b.firebasestorage.app",
  messagingSenderId: "401033441463",
  appId: "1:401033441463:web:0dd07184f1bfcf03fd5d32",
  measurementId: "G-KX400BWST5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log('Fetching dispatches collection...');
  const snapshot = await getDocs(collection(db, 'dispatches'));
  console.log(`Found ${snapshot.docs.length} dispatch documents.`);

  for (const d of snapshot.docs) {
    const data = d.data();
    const id = d.id;

    // 1. Calculate Operating Expenses (COH debits or fallback flat expenses)
    const cohEntries = data.cashLedger?.entries || data.cohEntries || [];
    const cohDebits = cohEntries
      .filter(e => e.type === 'DEBIT')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    
    const flatExpenses = (Number(data.travelExpenses) || 0) + (Number(data.dieselExpenses) || 0) + (Number(data.foodExpenses) || 0);
    const operatingExpenses = cohDebits > 0 ? cohDebits : (flatExpenses > 0 ? flatExpenses : (Number(data.cost) || 0));

    // 2. Calculate Crew Payroll
    const dSal = Number(data.payroll?.driverSalary ?? data.driverSalary ?? 0);
    const hSal = Number(data.payroll?.helperSalary ?? data.helperSalary ?? 0);
    const crewPayroll = Number(data.payroll?.totalCrewPayroll ?? (dSal + hSal));

    // 3. Calculate Total Trip Cost
    const totalTripCost = Math.round((operatingExpenses + crewPayroll) * 100) / 100;

    // 4. Calculate Gross Freight
    const grossFreight = Number(data.pricing?.grossFreight ?? data.totalFreightCharge ?? data.freightRevenue ?? 0);

    // 5. Calculate Net Income
    const netIncome = Math.round((grossFreight - totalTripCost) * 100) / 100;

    console.log(`Trip ID ${id} (TLO #${data.tloNumber || data.tripNumber}):`);
    console.log(`  Operating Expenses: ₱${operatingExpenses}`);
    console.log(`  Crew Payroll: ₱${crewPayroll} (Driver: ₱${dSal}, Helper: ₱${hSal})`);
    console.log(`  Total Trip Cost: ₱${totalTripCost}`);
    console.log(`  Gross Freight: ₱${grossFreight}`);
    console.log(`  Net Income: ₱${netIncome}`);

    // Update in Firestore
    const docRef = doc(db, 'dispatches', id);
    await updateDoc(docRef, {
      operatingExpenses,
      totalTripCost,
      netIncome
    });
    console.log(`  -> Successfully updated doc ${id} in Firestore.`);
  }

  console.log('Done migrating all trips in Firestore!');
  process.exit(0);
}

run().catch(err => {
  console.error('Error migrating trips:', err);
  process.exit(1);
});
