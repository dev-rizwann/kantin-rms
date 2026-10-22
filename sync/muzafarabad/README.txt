MUZAFARABAD (AJK) - CLEAN LAUNCH AND AUTOMATIC REPORTING

Only for the existing KantinPOS-Clean installation under the Lenovo account
on the MUZAFARABAD POS. NOT for H-8, Chak Shahzad, or an original Mutfak POS.
All existing Muzafarabad sales were confirmed to be tests. Do not use this
package if any real sales have started since that confirmation.

1. Copy this ZIP to the POS Desktop. Right-click it and Extract All.
   Keep internet connected, the Windows clock correct, and the time zone
   set to Islamabad/Karachi. Run from the normal Lenovo POS account.
2. Open '1 - Clear Test Sales.cmd'. Type exactly:
   CLEAR MUZAFARABAD TEST SALES
   Save any menu edits first. The script backs up, closes the Kantin apps,
   clears test transactions in one database transaction, verifies the menu
   and settings are unchanged, saves a new backup, and reopens the apps.
   Leave the apps at their PIN screens until step 3 finishes.
3. Open '2 - Bring Muzafarabad Online.cmd'. Wait for SUCCESS.
   This installs/repairs reporting, activates only this clean installation,
   verifies the first portal sync, then verifies an actual scheduled run.
4. Unlock normally. Real trading may begin only after step 3 says SUCCESS.
   Portal: https://kantin.iespl.org/kashmir
   Display name: MUZAFARABAD (AJK)

PRESERVED: menu, prices, categories (including any QA menu items), stock setup,
staff/PINs, customer/vendor records, device/printer routes, settings, app files.
CLEARED: all sales/unpaid tickets, item sales, payments/prepayments, refunds,
cancellations, payouts, shifts and their dependent transaction records.
Receipt and other ID counters are NOT reset: this prevents old test receipts
from colliding with future real sales. Existing backup ZIPs retain the old
test history for recovery; the active POS database is cleared, not the backups.
QA/test/demo/training menu categories or titles stay excluded from reporting.
Rename real menu items/categories appropriately before real trading.

SAFETY AND RECOVERY
- Verified backups: %LOCALAPPDATA%\KantinPOS-Clean\backups
- Cleanup record: %LOCALAPPDATA%\KantinPOS-Clean\.kantin\muzafarabad-cleanup.json
- A permanent database marker also prevents cleanup on a repeated run,
  including after a missing cleanup-record file. Do not remove these markers.
- If step 1 fails, stop. No success is printed; a database transaction rolls
  back failures before commit. Keep all backups. Do not restore automatically.
- If step 2 fails, fix the indicated issue and rerun ONLY step 2. It never
  deletes sales. Reporting may already be active if a later task check fails.
- Diagnostic status/logs: %LOCALAPPDATA%\KantinReportingKashmir\status.json
  and the logs folder beside it. Status contains no passwords or sale details.
- Reporting task: Kantin-Kashmir-Reporting. Runs hourly and at login while the
  Lenovo POS user is logged in, with three five-minute retries on failure.
  Leave Kantin Server running so its verified backups stay fresh (10 minutes).
  It needs internet for sync; POS sales themselves continue to work offline.
- No H-8 or Chak Shahzad data, credentials, tasks or settings are changed.

PRIVATE PACKAGE: provisioning.json contains a location-scoped credential and
a launch permit that expires after seven days. Do not post/share publicly.
An expired permit needs a refreshed package before first activation; the
installed hourly sync does not depend on the permit after activation.
