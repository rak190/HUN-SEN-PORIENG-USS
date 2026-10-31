import { POST as createUsers } from '../route';
import { NextResponse } from 'next/server';
export async function POST(req:Request){const response=await createUsers(req);const data=await response.json();if(!response.ok)return NextResponse.json(data,{status:response.status});return NextResponse.json({...data,users:[...data.users,...data.errors],message:`បានបង្កើត ${data.successCount} គណនី · បរាជ័យ ${data.failCount}`});}
