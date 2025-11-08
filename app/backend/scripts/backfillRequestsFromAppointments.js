import { ensurePatientAndLinkRequestsForEmail } from '../src/modules/appointment_requests/appointment_requests.repository.js';
import pool from '../src/db/pool.js';

const [, , emailArg, fullNameArg] = process.argv;

if (!emailArg) {
  console.error(
    'Usage: node -r dotenv/config scripts/backfillRequestsFromAppointments.js <patient-email> [full-name]',
  );
  process.exit(1);
}

(async () => {
  try {
    await ensurePatientAndLinkRequestsForEmail({
      email: emailArg,
      fullName: fullNameArg ?? undefined,
    });
    console.log(`Backfill complete for ${emailArg}.`);
  } catch (error) {
    console.error('Failed to backfill appointment requests:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
