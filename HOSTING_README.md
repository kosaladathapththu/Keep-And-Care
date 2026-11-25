# Keep & Care — fresh cPanel hosting guide

Target: **https://knc.supuncompanies.com**

Prepared 25 November 2026 for the Node.js + MySQL edition of this repository.
Use **Keep-And-Care-knc-cPanel.zip**, not the older Keep-And-Care-cPanel.zip.

## 1. Understand the two folders

The screenshots show two directories, not two interchangeable files:

| Purpose | Existing directory | Fresh deployment directory |
|---|---|---|
| Private Node application root | /home/supuvkex/keep-and-care-app | /home/supuvkex/keep-and-care-v2 |
| Subdomain document root | /home/supuvkex/knc.supuncompanies.com | Keep the same document root |

The account name above comes from your screenshot. If cPanel shows a different home path, use its actual value. Do not touch knk.supuncompanies.com, public_html, it.supuncompanies.com or other applications.

The application root contains app.js, app.cjs, package.json and dist. The document root can legitimately contain only .htaccess, .well-known and cgi-bin: Passenger connects the URL to the private application. Copying the application into both folders does not fix a 503.

## 2. Back up before changing the old registration

1. In File Manager, compress/download the existing keep-and-care-app folder. Download the existing subdomain .htaccess as well; enable Settings → Show Hidden Files if needed.
2. Export any existing production application database using phpMyAdmin.
3. Record the old Setup Node.js App settings and environment variable names privately. Do not post passwords or setup tokens.
4. Leave the old application folder and database intact. This procedure uses a new folder and new database. It does not reset or migrate your old data.

## 3. Confirm the subdomain and HTTPS

1. cPanel → Domains: confirm **knc.supuncompanies.com** exists and its document root is /home/supuvkex/knc.supuncompanies.com.
2. Confirm its DNS points to the hosting account's server IP shown in cPanel/your provider instructions. Do not use your computer's local IP.
3. Use cPanel SSL/TLS Status → Run AutoSSL, or ask the host to issue the certificate. Preserve .well-known so validation can work.
4. The final URL must be **https://knc.supuncompanies.com**, with no spelling changes. This guide does not use knk or supuncompaines.

## 4. Create a fresh hosted MySQL database

1. Open MySQL Database Wizard (or Manage My Databases).
2. Create a NEW database, for example suffix knc_v2. Copy the full database name cPanel displays, including its account prefix.
3. Create a dedicated database user, for example suffix kncapp, with a strong generated password. Save the full prefixed username and password privately.
4. Assign this user to the NEW database with ALL PRIVILEGES on that database only.
5. Open phpMyAdmin, select the new database in the left sidebar, choose Import, and import **database/schema.mysql.sql** from the extracted package. Five tables should appear: app_state, auth_users, auth_sessions, auth_limits, auth_audit.

Do not import an unrelated AeroSoft360 dump or an old relational-schema dump into this database. This app uses the five-table schema supplied in the package. A fresh database starts with no jobs, financial transactions, customers or staff; service and payment settings are provided. Existing records are not automatically migrated. A compatible Keep & Care system backup can be restored later by a Developer; restoration replaces records and users.

XAMPP runs on your PC only. On hosting, DB_HOST=localhost normally means the HOSTING server's MySQL service, not your PC. Use a different host/port only if the provider specifies it. Never use the local root account or a blank password on hosting.

## 5. Upload the prepared application

1. File Manager → Home (/home/supuvkex). Create **keep-and-care-v2**.
2. Upload **Keep-And-Care-knc-cPanel.zip** into that new folder and extract it there.
3. Confirm these paths exist directly, without an extra nested folder:

```
/home/supuvkex/keep-and-care-v2/app.js
/home/supuvkex/keep-and-care-v2/app.cjs
/home/supuvkex/keep-and-care-v2/package.json
/home/supuvkex/keep-and-care-v2/package-lock.json
/home/supuvkex/keep-and-care-v2/dist/package.json
/home/supuvkex/keep-and-care-v2/dist/server/index.js
/home/supuvkex/keep-and-care-v2/dist/client/
/home/supuvkex/keep-and-care-v2/database/schema.mysql.sql
```

This is a prebuilt package. Do not run a build on shared hosting. Do not upload Windows node_modules, .env.local, logs or your source repository. Remove the uploaded ZIP after extraction if desired; leave the extracted files.

## 6. Register the Node.js application correctly

Open **cPanel → Setup Node.js App** (the Namecheap/CloudLinux interface).

If the old application registration already owns knc.supuncompanies.com at /, stop it and remove its registration AFTER completing the backups above. Read the confirmation carefully; do not delete your preserved application files or database. Only one application should own this URL. If this interface offers a different registration workflow, ask the host to detach the old mapping and attach the new one.

Create Application with:

| Field | Value |
|---|---|
| Node.js version | 24.x recommended, or 22.13.0 or newer |
| Application mode | Production |
| Application root | keep-and-care-v2 (relative to your home directory) |
| Application URL | knc.supuncompanies.com |
| URL path/URI | root / (leave the extra path empty if the form uses a suffix field) |
| Application startup file | app.js |

Use the package's generated **CommonJS app.js** and app.cjs loader. They load the compiled ES-module application with import(). dist/package.json must stay in place. Do not replace these with the old ESM startup file.

Let cPanel generate the Passenger .htaccess configuration in the subdomain document root. Do not copy an old .htaccess with paths to keep-and-care-app, guess a PassengerNodejs path, or add ProxyPass to port 3000. Passenger manages the listener. Preserve .well-known and cgi-bin. If stale Passenger directives remain after removing the old registration, keep their backup and ask the host to regenerate this subdomain's mapping; do not clear unrelated domain rules.

## 7. Set the environment variables

In that application's environment-variable editor, add the following and save:

| Name | Value |
|---|---|
| NODE_ENV | production |
| APP_URL | https://knc.supuncompanies.com |
| DB_HOST | localhost, unless your host specifies another hostname |
| DB_PORT | 3306, unless your host specifies another port |
| DB_NAME | Exact NEW full prefixed database name from step 4 |
| DB_USER | Exact full prefixed user assigned in step 4 |
| DB_PASSWORD | That user's private password |
| DB_CONNECTION_LIMIT | 5 |
| AUTH_SETUP_TOKEN | A new private random value, at least 64 hexadecimal characters |
| VINEXT_TRUSTED_HOSTS | knc.supuncompanies.com |

You can generate the setup token LOCALLY with:

```
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Do not use a token printed in a public guide. Do not put passwords in public_html, .htaccess, screenshots or support messages. The included hosting.env.example is a placeholder checklist, not working credentials. Environment variables in cPanel take priority over .env. No .env file is needed if every value is set in the editor.

Leave PORT unset unless the hosting provider explicitly requires it. There is no need to open port 3000. APP_URL provides the canonical HTTPS origin so login, secure session cookies and form submissions work behind Passenger's reverse proxy.

## 8. Install server dependencies and restart

1. Save the Node.js application settings.
2. Use **Run NPM Install** in Setup Node.js App. Wait for successful completion. Production mode should omit development dependencies.
3. If using cPanel Terminal instead, FIRST copy and execute the exact Node environment activation command displayed by YOUR Setup Node.js App page, then enter the application root and run:

```
cd /home/supuvkex/keep-and-care-v2
npm ci --omit=dev
npm run db:check
```

The database check reads cPanel variables only if the terminal session exports them; otherwise create a PRIVATE .env in the application root from hosting.env.example and fill it privately, or use the HTTP check below. Do not assume the Node-selector UI variables are automatically exported to every Terminal session.

4. Click Restart in Setup Node.js App.

Keep CloudLinux's node_modules symlink as managed by cPanel. Never chmod it to 777 or replace it with a Windows copy. Use ordinary files 0644 and folders 0755 unless your hosting provider requires otherwise. No global PM2 process or manual npm start session is needed for Passenger hosting.

## 9. Verify before creating accounts

Open these HTTPS addresses:

1. **https://knc.supuncompanies.com/api/health** must return HTTP 200 with status ok and database connected.
2. **https://knc.supuncompanies.com/api/auth/session** must return HTTP 200, user null and setupRequired true on the fresh database.
3. **https://knc.supuncompanies.com/login** must display account setup.
4. Create your first **Developer** account with your own email/password and the AUTH_SETUP_TOKEN from step 7. There are no default login credentials.
5. Sign in. Create **CFO** and **Assistant GM** users from the application's access management. Verify each role with its own account.
6. Once the first Developer exists, remove/rotate AUTH_SETUP_TOKEN in cPanel and Restart. It is only for first-account bootstrap.
7. Verify a customer/job can be saved, reports can be previewed/downloaded, and the record survives a reload and application restart. Use a clearly named test record and remove it afterwards.
8. Enable regular hosting database backups and keep a secure application system backup. System backups include password hashes; protect them like private data.

Do not consider hosting complete just because the homepage opens. Check database connectivity, login, saving, reports and restart persistence.

## 10. Fix errors by the layer that failed

| Symptom | Meaning and action |
|---|---|
| Branded hosting HTML 503, like your screenshot | Passenger could not serve the Node application. Inspect the NEW application's stderr.log and Node.js App status. Confirm Node version, root, startup file, dependencies and dist files. The screenshot alone does not identify the exact startup error. |
| require() of ES Module / ERR_REQUIRE_ESM | Old startup file or wrong package type. Use the supplied CommonJS root package/app.js/app.cjs and keep dist/package.json with type module. |
| Cannot find package vinext/mysql2/react | Dependencies were not installed in the correct Node application environment. Run NPM Install for keep-and-care-v2. |
| Build output is missing | ZIP was incompletely extracted or nested an extra folder deep. Check dist/server/index.js directly under the application root. |
| Node syntax/engine error | Switch to Node 24 or 22.13+, reinstall dependencies in that environment and restart. |
| /api/health returns JSON 503 with ECONNREFUSED/ETIMEDOUT | Database host/port is unreachable from the hosting server. Confirm provider settings. Starting XAMPP on your PC will not fix hosted MySQL. |
| ER_ACCESS_DENIED_ERROR | Wrong full prefixed DB_USER/password or user not assigned to DB_NAME. Correct cPanel database settings and restart. |
| ER_DBACCESS_DENIED_ERROR | Assign the user privileges on the exact application database. |
| ER_BAD_DB_ERROR | DB_NAME is wrong or missing; copy the full name from cPanel. |
| DB_CONFIG_MISSING | Environment variables were not saved on this application. Set them and restart. |
| Login/form says invalid origin or repeatedly signs out | APP_URL must be exactly https://knc.supuncompanies.com; use HTTPS and verify proxy mapping/trusted hostname. |
| Pages load without styling/assets | Ensure the entire dist/client folder was extracted and old document-root rewrite rules are not interfering. |

For persistent HTML 503, download/read the last 50 lines of **/home/supuvkex/keep-and-care-v2/stderr.log** (or the log path shown by the host). Redact secrets before sharing. Also check cPanel resource usage for memory/process limits. A useful hosting-support request is:

“Please check the Passenger mapping and startup error for knc.supuncompanies.com. Application root is /home/supuvkex/keep-and-care-v2, startup file app.js, Node 24, production mode. The document root is /home/supuvkex/knc.supuncompanies.com. Dependencies are installed. Please confirm the generated Passenger configuration and resource limits. Redacted startup log is attached.”

## Local development after the fix

Start MySQL from XAMPP. This project now uses a dedicated keepcare_dev database and private .env.local; the pre-existing keep_and_care database was preserved. Run npm run db:check, then npm run dev. If moving the project to a NEW PC, run npm install and npm run setup:local once with XAMPP running; that command refuses to overwrite an existing .env.local. It assumes XAMPP's default local administrator settings, with LOCAL_DB_ADMIN_USER, LOCAL_DB_ADMIN_PASSWORD and LOCAL_DB_PORT overrides supported when needed. Never upload .env.local.

## Rebuild a future hosting package

On the development computer, from this repository:

```
npm ci
npm run build
npm run package:hosting
```

Upload the newly generated Keep-And-Care-knc-cPanel.zip. Do not mix old dist files and new startup files. For future upgrades, take a backup and use another fresh application directory so rollback remains possible.

## Official hosting references

- Namecheap Setup Node.js App: https://www.namecheap.com/support/knowledgebase/article.aspx/10047/2182/how-to-work-with-nodejs-app/
- Namecheap JavaScript application deployment: https://www.namecheap.com/support/knowledgebase/article.aspx/10686/29/how-to-deploy-reactjs-vitejs-react-native-and-nextjs-applications-in-cpanel/
- cPanel Passenger port handling: https://support.cpanel.net/hc/en-us/articles/4420354935703-Do-cPanel-s-NodeJS-apps-all-run-on-the-same-port-3000
- cPanel Passenger applications: https://docs.cpanel.net/knowledge-base/web-services/using-passenger-applications/

This package was built and tested locally. It has not been uploaded to or verified on your hosting account; complete the checks above after deployment.
