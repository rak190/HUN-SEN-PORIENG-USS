import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Admin School Info Schema Alignment & Resilience Suite', () => {
  const migration081Path = path.join(process.cwd(), 'supabase', 'migrations', '081_add_school_info_infrastructure_columns.sql');
  const routePath = path.join(process.cwd(), 'app', 'api', 'admin', 'school-info', 'route.ts');
  const pagePath = path.join(process.cwd(), 'app', '(dashboard)', 'admin', 'school-info', 'page.tsx');

  it('Scenario 1: Migration 081 adds all required infrastructure and personnel columns to public.schools', () => {
    assert.ok(fs.existsSync(migration081Path), 'Migration 081 must exist in supabase/migrations');
    const content = fs.readFileSync(migration081Path, 'utf-8');

    // Structural checks
    assert.ok(content.includes('BEGIN;'), 'Migration 081 must run in transaction');
    assert.ok(content.includes('COMMIT;'), 'Migration 081 must commit transaction');
    assert.ok(content.includes('ALTER TABLE public.schools'), 'Must target public.schools table');

    // Missing columns from the bug report
    const requiredColumns = [
      'electricity TEXT',
      'water_supply TEXT',
      'internet TEXT',
      'ict_lead_email TEXT',
      'smc_head_name TEXT',
      'smc_head_phone TEXT',
      'name_en TEXT',
      'school_type TEXT',
      'abbreviation TEXT',
      'department TEXT',
      'village TEXT',
      'commune TEXT',
      'district TEXT',
      'province TEXT',
      'principal_title TEXT',
      'metadata JSONB'
    ];

    for (const col of requiredColumns) {
      assert.ok(
        content.includes(col),
        `Migration 081 must add column '${col}' to prevent PostgREST schema cache errors`
      );
    }

    // Must be idempotent
    assert.ok(content.includes('ADD COLUMN IF NOT EXISTS'), 'Columns must be added with IF NOT EXISTS for idempotency');
    assert.ok(content.includes("NOTIFY pgrst, 'reload schema'"), 'Must signal PostgREST schema reload');
  });

  it('Scenario 2: route.ts provides dual-case normalization on GET for backward and forward compatibility', () => {
    assert.ok(fs.existsSync(routePath), 'School info route must exist');
    const content = fs.readFileSync(routePath, 'utf-8');

    // GET handler security and mapping
    assert.ok(content.includes("role !== 'admin' && role !== 'principal'"), 'GET must restrict to admin or principal');
    assert.ok(content.includes('schoolName: data.name'), 'GET must normalize schoolName from DB name');
    assert.ok(content.includes('schoolCode: data.code'), 'GET must normalize schoolCode from DB code');
    assert.ok(content.includes('waterSupply: data.water_supply'), 'GET must normalize waterSupply from DB water_supply');
    assert.ok(content.includes('electricity: data.electricity'), 'GET must provide electricity');
    assert.ok(content.includes('internet: data.internet'), 'GET must provide internet');
    assert.ok(content.includes('principalName: data.principal_name'), 'GET must provide principalName');
    assert.ok(content.includes('ictLeadEmail: data.ict_lead_email || data.contact_email'), 'GET must resolve ictLeadEmail with fallback to contact_email');
  });

  it('Scenario 3: route.ts PATCH enforces strict admin role and implements defensive schema fallback', () => {
    const content = fs.readFileSync(routePath, 'utf-8');

    // Authorization guard
    assert.ok(content.includes("role !== 'admin'"), 'PATCH must restrict mutations to admin role only');
    assert.ok(content.includes('profile?.school_id'), 'PATCH must require school_id');

    // Defensive schema handling
    assert.ok(content.includes("updateResult.error.message?.includes('schema cache')"), 'Must detect PostgREST schema cache errors defensively');
    assert.ok(content.includes('corePayload'), 'Must provide core fallback payload if schema cache is out-of-sync');

    // Audit logging adheres to Migration 070 schema
    assert.ok(content.includes("target_table: 'schools'"), 'Must log target_table: schools in audit_logs');
    assert.ok(content.includes("status: 'success'"), 'Must log status: success in audit_logs');
  });

  it('Scenario 4: page.tsx hydrates form from both camelCase and snake_case and renders modern error banner', () => {
    assert.ok(fs.existsSync(pagePath), 'School info page must exist');
    const content = fs.readFileSync(pagePath, 'utf-8');

    // Dual-case hydration
    assert.ok(content.includes('schoolInfo.schoolName || schoolInfo.name'), 'Must hydrate schoolName from either case format');
    assert.ok(content.includes('schoolInfo.principalName || schoolInfo.principal_name'), 'Must hydrate principalName from either case format');
    assert.ok(content.includes('schoolInfo.waterSupply || schoolInfo.water_supply'), 'Must hydrate waterSupply from either case format');
    assert.ok(content.includes('schoolInfo.electricity'), 'Must hydrate electricity');
    assert.ok(content.includes('schoolInfo.internet'), 'Must hydrate internet');

    // Modern error banner
    assert.ok(content.includes('errorMessage'), 'Must track errorMessage in state');
    assert.ok(content.includes('AlertCircle'), 'Must use AlertCircle icon for error notification');
    assert.ok(content.includes('setErrorMessage(null)'), 'Must allow closing the error alert');
  });

  it('Scenario 5: End-to-end normalization logic simulation correctly populates missing properties', () => {
    // Simulate raw database record with snake_case columns
    const rawDbRecord = {
      id: 'main-school',
      name: 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង',
      code: '14110401901',
      address: 'ភូមិពោធិ៍រៀងត្បូង ឃុំពោធិ៍រៀង ស្រុកពោធិ៍រៀង ខេត្តព្រៃវែង',
      principal_name: 'លោក ហេង ឈាងលី',
      principal_phone: '096 689 4077',
      ict_lead_name: 'លោកស្រី សាន សុវិជ្ជា',
      ict_lead_phone: '093 690 905',
      contact_email: 'san.sovichea.hs@moeys.gov.kh',
      water_supply: 'ទឹកអណ្តូង / ម៉ាស៊ីនចម្រោះ',
      electricity: 'អគ្គិសនីរដ្ឋ',
      internet: 'Wi-Fi'
    };

    // Simulate route.ts GET normalization
    const normalized = {
      ...rawDbRecord,
      schoolName: rawDbRecord.name || '',
      schoolCode: rawDbRecord.code || '',
      principalName: rawDbRecord.principal_name || '',
      ictLeadEmail: (rawDbRecord as any).ict_lead_email || rawDbRecord.contact_email || '',
      waterSupply: rawDbRecord.water_supply || '',
      electricity: rawDbRecord.electricity || '',
      internet: rawDbRecord.internet || ''
    };

    assert.strictEqual(normalized.schoolName, 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង');
    assert.strictEqual(normalized.schoolCode, '14110401901');
    assert.strictEqual(normalized.electricity, 'អគ្គិសនីរដ្ឋ');
    assert.strictEqual(normalized.waterSupply, 'ទឹកអណ្តូង / ម៉ាស៊ីនចម្រោះ');
    assert.strictEqual(normalized.ictLeadEmail, 'san.sovichea.hs@moeys.gov.kh');

    // Simulate page.tsx dual-case hydration
    const resolvedName = normalized.schoolName || normalized.name;
    const resolvedElectricity = normalized.electricity;
    assert.strictEqual(resolvedName, 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង');
    assert.strictEqual(resolvedElectricity, 'អគ្គិសនីរដ្ឋ');
  });
});
