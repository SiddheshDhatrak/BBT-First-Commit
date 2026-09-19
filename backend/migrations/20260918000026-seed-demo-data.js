/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  const now = new Date().toISOString();

  pgm.sql(`
    INSERT INTO disasters (id, name, type, state, district, declared_at, delivery_policy, created_at, updated_at)
    VALUES (
      '2584c146-4bcd-5ef7-88a7-1f23b7a8da36',
      'Assam Flood Response 2026',
      'FLOOD',
      'Assam',
      'Dhubri',
      '${now}',
      '{"proofDeadlineHours": 72, "randomAuditRate": 0.08, "allowedBounds": {"minLat": 25.8, "maxLat": 26.2, "minLng": 89.7, "maxLng": 90.1}}'::jsonb,
      '${now}',
      '${now}'
    )
    ON CONFLICT DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO campaigns (id, disaster_id, name, target_amount, status, created_at, updated_at)
    VALUES (
      'af97d970-d33f-5577-86ea-cc96b990b17b',
      '2584c146-4bcd-5ef7-88a7-1f23b7a8da36',
      'Assam Flood Relief Fund',
      100000000,
      'OPEN',
      '${now}',
      '${now}'
    )
    ON CONFLICT DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO organizations (id, name, darpan_id, gstin, status, created_at, updated_at)
    VALUES (
      '990968b6-0e2c-5fcb-8d6a-dc9847a210c2',
      'RahatSetu Demo Relief NGO',
      'SYNTHETIC-DARPAN-001',
      'SYNTHETIC-GSTIN',
      'ACTIVE',
      '${now}',
      '${now}'
    )
    ON CONFLICT DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO programs (id, organization_id, campaign_id, name, status, created_at, updated_at)
    VALUES (
      '42a567ca-bfd8-5467-8a40-0db3963a4a19',
      '990968b6-0e2c-5fcb-8d6a-dc9847a210c2',
      'af97d970-d33f-5577-86ea-cc96b990b17b',
      'Emergency Food Kit Distribution',
      'ACTIVE',
      '${now}',
      '${now}'
    )
    ON CONFLICT DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO budgets (id, program_id, total_amount, created_at, updated_at)
    VALUES (
      '5bb06d3d-d678-559f-8217-b3c2f636ed87',
      '42a567ca-bfd8-5467-8a40-0db3963a4a19',
      2000000,
      '${now}',
      '${now}'
    )
    ON CONFLICT DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO budget_categories (id, budget_id, category, cap_amount, spent_amount, created_at, updated_at)
    VALUES (
      '3f2eb263-14bb-55b6-8efa-943adb8c80b4',
      '5bb06d3d-d678-559f-8217-b3c2f636ed87',
      'FOOD_KITS',
      1500000,
      0,
      '${now}',
      '${now}'
    )
    ON CONFLICT DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO reference_locations (id, disaster_id, district, bounds, created_at, updated_at)
    VALUES (
      '3b3bbd33-ac5f-5ac2-87aa-256f15e67e93',
      '2584c146-4bcd-5ef7-88a7-1f23b7a8da36',
      'Dhubri',
      '{"minLat": 25.8, "maxLat": 26.2, "minLng": 89.7, "maxLng": 90.1}'::jsonb,
      '${now}',
      '${now}'
    )
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DELETE FROM reference_locations WHERE id = '3b3bbd33-ac5f-5ac2-87aa-256f15e67e93';`);
  pgm.sql(`DELETE FROM budget_categories WHERE id = '3f2eb263-14bb-55b6-8efa-943adb8c80b4';`);
  pgm.sql(`DELETE FROM budgets WHERE id = '5bb06d3d-d678-559f-8217-b3c2f636ed87';`);
  pgm.sql(`DELETE FROM programs WHERE id = '42a567ca-bfd8-5467-8a40-0db3963a4a19';`);
  pgm.sql(`DELETE FROM organizations WHERE id = '990968b6-0e2c-5fcb-8d6a-dc9847a210c2';`);
  pgm.sql(`DELETE FROM campaigns WHERE id = 'af97d970-d33f-5577-86ea-cc96b990b17b';`);
  pgm.sql(`DELETE FROM disasters WHERE id = '2584c146-4bcd-5ef7-88a7-1f23b7a8da36';`);
};