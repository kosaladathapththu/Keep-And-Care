# Simplified Reports and automatic workbook reports

## Install on your current hosting application

1. Download a system backup and keep a hosting database backup.
2. Upload Keep-And-Care-Reports-Update.zip into /home/supuvkex/keep-and-care-v2.
3. Extract into that directory, allowing replacement of the included application files.
4. Restart keep-and-care-v2 in Setup Node.js App, then refresh the website.

No application reinstallation, NPM installation, .htaccess changes or environment-variable changes are needed. This update includes the earlier roles and historical-upload features. If historical uploads were not installed previously, the new table is created automatically; the included historical-reports SQL migration is available if your hosting user lacks CREATE privileges.

## Use the simplified Reports page

Open Reports and use:

- Data source: System records or Uploaded workbooks.
- Month: All periods or a specific month for system records; an uploaded reporting month for workbook reports.
- Report type: The report you want to see.

If a month has several uploaded workbooks, choose the file using the Workbook filter. The page shows one report at a time, with one format selector and one Preview / Print / Download button. Preview all reports includes the reports available for the selected source and month. Exported PDF, Excel and JSON retain the selected period, source and source-specific notes. PDF downloads include full reconciliation notes on additional pages where needed. CSV contains the selected report's rows.

Click Upload previous reports to add monthly Excel files. Previously saved uploads work automatically and do not need to be uploaded again. You can also use Generate reports beside any file in the workbook library.

## Generated reports from the supplied workbook format

The October-style workbook can generate:

1. Cash flow: all dated cash entries, merged dates included, opening cash separated from receipts, and balances recalculated from detail rows.
2. Trial balance: saved account debit/credit balances; unbalanced totals and an inconsistent source heading are flagged.
3. Income and expenses: job-costing detail from AC REPAIR and the selected month's SUPUN CENTER rows, plus payroll allocation. Summary totals are checked against the detail rather than posted again.
4. Outstanding balances: period-level billed/received/pending totals from OUTSTANDING FROM SUPUN CENTER, including earlier balances carried in that workbook.
5. Salary and commission: payroll allocations from the summary and separately identified cash commission payments.
6. Job register: job references, descriptions, technicians and recorded costing details. Missing job dates or collections remain identified as missing.

Recognized worksheets use names and headers from the supplied format (CASH FLOW, TB, SUMMERY/SUMMARY, AC REPAIR, SUPUN CENTER, OUTSTANDING FROM SUPUN CENTER). A different workbook may support fewer report types; unavailable reports are disabled. Unrecognized layouts remain available in the original workbook preview, without invented report values.

Generated workbook reports are separate from System records. Uploading does not create duplicate receipts, payroll payments, customers or live jobs. Per-job collection allocations and cash payment status are not invented where the source provides only monthly totals. Source differences appear under Notes & reconciliation and in exports.

## System-record month filters

Jobs and transactions use complete recorded dates. Legacy job dates without a year are excluded from month-filtered job reports and flagged. Outstanding balances use current received values for jobs dated on or before the selected month; historical collection snapshots are not available. Payroll reports use current base salary, advances and unpaid commission, with cash commission payments filtered by month. These limits are stated in the report notes.

The original workbook remains available for download. No customer workbook is bundled in this update, and no financial records are imported by installing it.
