import { databaseSettings } from './database-config';
import { createPool,type Pool,type PoolConnection,type RowDataPacket,type ResultSetHeader } from 'mysql2/promise';

export type DatabaseValue=string|number|boolean|Date|Buffer|null;
let pool:Pool|undefined;
let schemaSetup:Promise<void>|undefined;

export function database(){
 if(pool)return pool;
 pool=createPool(databaseSettings(process.env));
 return pool;
}

export async function queryRows<T extends RowDataPacket>(sql:string,values:DatabaseValue[]=[]){
 const [rows]=await database().execute<T[]>(sql,values);
 return rows;
}

export async function executeSql(sql:string,values:DatabaseValue[]=[]){
 const [result]=await database().execute<ResultSetHeader>(sql,values);
 return result;
}

export async function withTransaction<T>(work:(connection:PoolConnection)=>Promise<T>){
 const connection=await database().getConnection();
 try{
  await connection.beginTransaction();
  const result=await work(connection);
  await connection.commit();
  return result;
 }catch(error){
  await connection.rollback();
  throw error;
 }finally{
  connection.release();
 }
}

export async function ensureDatabase(){
 if(schemaSetup)return schemaSetup;
 schemaSetup=(async()=>{
 await database().query(`CREATE TABLE IF NOT EXISTS app_state (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  payload LONGTEXT NOT NULL,
  updated_at VARCHAR(32) NOT NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
 await database().query(`CREATE TABLE IF NOT EXISTS auth_users (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  role VARCHAR(32) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at VARCHAR(32) NOT NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
 await database().query(`CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  INDEX auth_sessions_user_id_idx (user_id),
  INDEX auth_sessions_expires_at_idx (expires_at)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
 await database().query(`CREATE TABLE IF NOT EXISTS auth_limits (
  bucket CHAR(64) NOT NULL PRIMARY KEY,
  attempts INT UNSIGNED NOT NULL,
  reset_at BIGINT NOT NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
 await database().query(`CREATE TABLE IF NOT EXISTS auth_audit (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  actor_id VARCHAR(36) NULL,
  action VARCHAR(64) NOT NULL,
  target_id VARCHAR(36) NULL,
  created_at VARCHAR(32) NOT NULL,
  INDEX auth_audit_created_at_idx (created_at)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
 })();
 try{await schemaSetup}catch(error){schemaSetup=undefined;throw error}
}
