# Monthly historical report uploads

This update adds an upload library for previous monthly Excel workbooks. It includes the GM and Assistant role update.

## Update the current hosting application

1. Download a system backup and keep a cPanel database backup.
2. Upload Keep-And-Care-History-Update.zip into /home/supuvkex/keep-and-care-v2.
3. Extract into that same folder and allow replacement of the included application files.
4. In Setup Node.js App, restart keep-and-care-v2.
5. Sign out and sign in again. Open Reports and click Previous reports near the page heading.

The existing database, .htaccess, environment variables and Node.js registration stay in place. No NPM installation or application reinstallation is needed. The application creates a new historical_reports table automatically using the existing database user's CREATE privilege. If the host prevents this, select the existing database in phpMyAdmin and import ONLY database/migrations/2026-11-historical-reports.sql from this ZIP. It creates the table without deleting data.

## Upload many months

1. Reports > Previous reports > Upload workbooks.
2. Select one or several .xlsx files, up to 10 files per batch.
3. Confirm the reporting month and year for every file. Suggested dates are editable; missing dates must be selected.
4. Click Preview to browse every worksheet. Formula results are the values last saved by Excel; missing cached values are labeled. External links and formulas are not executed.
5. Click Save workbooks. Repeat for other months or years.

Maximum 5 MB per workbook and 20 MB per batch. Monthly libraries can contain many batches and multiple files per month. Exact duplicate workbook contents are skipped, even if the file was renamed. Use Edit month if a saved workbook needs a different reporting month.

The files remain historical references. Uploading does not create or change live customer balances, jobs, receipts, expenses, commissions or payroll. Summary tabs are not posted as extra financial transactions. All worksheets, previous-month details, formatting and formulas remain in the original download.

Use the year filter or search by month, filename or worksheet. Click View to preview sheets, then Original Excel to download the byte-for-byte original workbook. Preview pages show 15 populated rows and five columns at a time to avoid horizontal scrolling. Previous/Next column controls expose the remaining columns.

GM, Assistant, Developer and CFO can use this finance-report library. The files are stored in MySQL and served only to signed-in authorized users; they are not uploaded into public_html. Delete requires confirmation. Download an original before deleting it if you need a copy.

## Backups

New system backups include the historical workbooks with file-integrity checks. Restoring a new backup replaces the historical library with that backup's files. Restoring an older backup with no historicalReports field preserves existing uploads. The JSON system backup size limit remains 20 MB; use a full cPanel database backup as the archive grows.

No user workbook or business records are bundled in this update. The October workbook was inspected locally to verify preview compatibility; it was not imported into the database or included in the ZIP.
