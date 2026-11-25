# GM and Assistant role update

Roles available after this update: GM, Assistant, CFO, Developer.
GM and Assistant have full system access, including user management, finance, reports, settings, backup download and restore. CFO retains its existing finance permissions. Existing Assistant GM accounts automatically become Assistant accounts when the application starts. No accounts or business records are deleted. At least one active Developer must remain.

## Update your existing hosting application

1. Download a system backup from Settings and keep a hosting database backup.
2. Upload Keep-And-Care-Roles-Update.zip into /home/supuvkex/keep-and-care-v2.
3. Extract it into that same directory and allow replacement of the included application files. The ZIP updates dist and public and includes this guide. It contains no .env, node_modules, database data, or .htaccess.
4. Leave your database, cPanel environment variables, application registration, node_modules link and domain .htaccess unchanged. No SQL import or NPM installation is needed for this update.
5. Setup Node.js App > keep-and-care-v2 > Restart.
6. Open https://knc.supuncompanies.com/api/health and confirm database connected.
7. Sign out and sign back in, then open User access. Existing Assistant GM users now show Assistant. Use Add user to create a GM account, or Edit access to assign either role to another account.

No hosting support action or application reinstallation is required. If you restore the previous dist folder to roll back, map Assistant roles back to Assistant GM and GM roles to Developer first; the old application does not recognize the new role names. Keep your Developer account unchanged during upgrades.
