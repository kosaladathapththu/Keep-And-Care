export function databaseSettings(values:Record<string,string|undefined>){
 const missing=['DB_HOST','DB_USER','DB_NAME'].filter(key=>!values[key]?.trim());if(missing.length)throw Object.assign(Error('Missing database settings: '+missing.join(', ')),{code:'DB_CONFIG_MISSING'});
 const port=Number(values.DB_PORT||3306),connectionLimit=Number(values.DB_CONNECTION_LIMIT||5);
 if(!Number.isInteger(port)||port<1||port>65535)throw Object.assign(Error('DB_PORT must be a valid TCP port.'),{code:'DB_CONFIG_INVALID'});
 if(!Number.isInteger(connectionLimit)||connectionLimit<1||connectionLimit>20)throw Object.assign(Error('DB_CONNECTION_LIMIT must be between 1 and 20.'),{code:'DB_CONFIG_INVALID'});
 return {host:values.DB_HOST!.trim(),user:values.DB_USER!.trim(),password:values.DB_PASSWORD||'',database:values.DB_NAME!.trim(),port,connectionLimit,connectTimeout:10000,waitForConnections:true,queueLimit:25,charset:'utf8mb4',decimalNumbers:true,enableKeepAlive:true,keepAliveInitialDelay:0};
}
export function databaseFailureCode(error:unknown){const code=error&&typeof error==='object'&&'code'in error?String(error.code):'DATABASE_ERROR';return /^[A-Z0-9_]{1,60}$/.test(code)?code:'DATABASE_ERROR'}
export function databaseFailureMessage(error:unknown){switch(databaseFailureCode(error)){
 case 'DB_CONFIG_MISSING':return 'Database settings are missing. Configure DB_HOST, DB_PORT, DB_NAME, DB_USER and DB_PASSWORD, then restart the application.';
 case 'DB_CONFIG_INVALID':return 'A database environment setting is invalid. Check DB_PORT and DB_CONNECTION_LIMIT, then restart.';
 case 'ECONNREFUSED':case 'ETIMEDOUT':return 'The database server cannot be reached. Check DB_HOST and DB_PORT. For local development, confirm XAMPP MySQL is running.';
 case 'ER_ACCESS_DENIED_ERROR':return 'MySQL rejected the database login. Check DB_USER and DB_PASSWORD and assign that user to the application database.';
 case 'ER_DBACCESS_DENIED_ERROR':return 'The database user has no access to this database. Grant privileges on the application database.';
 case 'ER_BAD_DB_ERROR':return 'The configured database does not exist. Create DB_NAME in MySQL/cPanel and import database/schema.mysql.sql.';
 default:return 'The database is unavailable. Check the application server log and database configuration.';
}}
