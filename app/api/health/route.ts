import { queryRows } from '../../../lib/database';
import { databaseFailureCode } from '../../../lib/database-config';
export async function GET(){try{await queryRows<import('mysql2/promise').RowDataPacket>('SELECT 1 AS ok');return Response.json({status:'ok',database:'connected'},{headers:{'cache-control':'no-store'}})}catch(error){console.error('[Keep & Care database] '+databaseFailureCode(error));return Response.json({status:'unavailable',database:'unavailable',code:databaseFailureCode(error)},{status:503,headers:{'cache-control':'no-store'}})}}
