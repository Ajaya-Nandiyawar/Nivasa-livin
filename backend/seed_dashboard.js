const { Client } = require('pg');

async function seed() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres?schema=public'
  });
  await client.connect();
  console.log('Connected to database.');

  try {
    // 1. Get the admin user ID
    const userRes = await client.query("SELECT id FROM users WHERE email = 'admin@nivasalivin.com'");
    if (userRes.rows.length === 0) {
      throw new Error("Admin user not found. Please run seed_user.js first.");
    }
    const adminId = userRes.rows[0].id;
    console.log('Found Admin User ID:', adminId);

    // Clean up existing data (excluding users and expense_categories)
    console.log('Cleaning up existing tables...');
    await client.query('TRUNCATE TABLE audit_logs, visitors, maintenance_tickets, payments, rent_records, bookings, tenants, beds, rooms, floors, properties CASCADE');
    console.log('Existing tables truncated.');

    // 2. Insert Property
    const propRes = await client.query(`
      INSERT INTO properties (name, address, city, pincode, owner_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, ['Nivasa Elite PG', '123, Koramangala 4th Block, Near Sony Signal', 'Bangalore', '560034', adminId]);
    const propertyId = propRes.rows[0].id;
    console.log('Created Property:', propertyId);

    // 3. Insert Floors (Floor 1 and 2)
    const floor1Res = await client.query(`
      INSERT INTO floors (property_id, floor_number, floor_name)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [propertyId, 1, 'First Floor']);
    const floor1Id = floor1Res.rows[0].id;

    const floor2Res = await client.query(`
      INSERT INTO floors (property_id, floor_number, floor_name)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [propertyId, 2, 'Second Floor']);
    const floor2Id = floor2Res.rows[0].id;
    console.log('Created Floors:', floor1Id, floor2Id);

    // 4. Insert Rooms
    // Room 101 - Double Sharing
    const r101Res = await client.query(`
      INSERT INTO rooms (floor_id, room_number, room_type, monthly_rent, status)
      VALUES ($1, $2, 'DOUBLE', '12000', 'OCCUPIED')
      RETURNING id
    `, [floor1Id, '101']);
    const r101Id = r101Res.rows[0].id;

    // Room 102 - Single sharing
    const r102Res = await client.query(`
      INSERT INTO rooms (floor_id, room_number, room_type, monthly_rent, status)
      VALUES ($1, $2, 'SINGLE', '18000', 'OCCUPIED')
      RETURNING id
    `, [floor1Id, '102']);
    const r102Id = r102Res.rows[0].id;

    // Room 201 - Triple sharing
    const r201Res = await client.query(`
      INSERT INTO rooms (floor_id, room_number, room_type, monthly_rent, status)
      VALUES ($1, $2, 'TRIPLE', '8000', 'OCCUPIED')
      RETURNING id
    `, [floor2Id, '201']);
    const r201Id = r201Res.rows[0].id;

    // Room 202 - Double sharing (Partially Occupied)
    const r202Res = await client.query(`
      INSERT INTO rooms (floor_id, room_number, room_type, monthly_rent, status)
      VALUES ($1, $2, 'DOUBLE', '12000', 'AVAILABLE')
      RETURNING id
    `, [floor2Id, '202']);
    const r202Id = r202Res.rows[0].id;
    console.log('Created Rooms:', r101Id, r102Id, r201Id, r202Id);

    // 5. Insert Beds
    // Room 101 beds
    const b101ARes = await client.query(`INSERT INTO beds (room_id, bed_label, status) VALUES ($1, '101-A', 'OCCUPIED') RETURNING id`, [r101Id]);
    const b101BRes = await client.query(`INSERT INTO beds (room_id, bed_label, status) VALUES ($1, '101-B', 'OCCUPIED') RETURNING id`, [r101Id]);
    const b101A = b101ARes.rows[0].id;
    const b101B = b101BRes.rows[0].id;

    // Room 102 bed
    const b102ARes = await client.query(`INSERT INTO beds (room_id, bed_label, status) VALUES ($1, '102-A', 'OCCUPIED') RETURNING id`, [r102Id]);
    const b102A = b102ARes.rows[0].id;

    // Room 201 beds
    const b201ARes = await client.query(`INSERT INTO beds (room_id, bed_label, status) VALUES ($1, '201-A', 'OCCUPIED') RETURNING id`, [r201Id]);
    const b201BRes = await client.query(`INSERT INTO beds (room_id, bed_label, status) VALUES ($1, '201-B', 'VACANT') RETURNING id`, [r201Id]);
    const b201CRes = await client.query(`INSERT INTO beds (room_id, bed_label, status) VALUES ($1, '201-C', 'VACANT') RETURNING id`, [r201Id]);
    const b201A = b201ARes.rows[0].id;
    const b201B = b201BRes.rows[0].id;
    const b201C = b201CRes.rows[0].id;

    // Room 202 beds
    const b202ARes = await client.query(`INSERT INTO beds (room_id, bed_label, status) VALUES ($1, '202-A', 'OCCUPIED') RETURNING id`, [r202Id]);
    const b202BRes = await client.query(`INSERT INTO beds (room_id, bed_label, status) VALUES ($1, '202-B', 'MAINTENANCE') RETURNING id`, [r202Id]);
    const b202A = b202ARes.rows[0].id;
    const b202B = b202BRes.rows[0].id;
    console.log('Created Beds.');

    // 6. Insert Tenants
    const tenants = [
      { name: 'Aarav Sharma', phone: '9876543210', email: 'aarav@gmail.com' },
      { name: 'Aditi Rao', phone: '9876543211', email: 'aditi@gmail.com' },
      { name: 'Kabir Mehta', phone: '9876543212', email: 'kabir@gmail.com' },
      { name: 'Riya Sen', phone: '9876543213', email: 'riya@gmail.com' },
      { name: 'Vikram Malhotra', phone: '9876543214', email: 'vikram@gmail.com' }
    ];

    const tenantIds = [];
    for (const t of tenants) {
      const tRes = await client.query(`
        INSERT INTO tenants (full_name, email, phone, permanent_address, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [t.name, t.email, t.phone, '123 Test Street, Bangalore', adminId]);
      tenantIds.push(tRes.rows[0].id);
    }
    console.log('Created Tenants:', tenantIds);

    // 7. Insert Bookings
    // Aarav: Bed 101A, monthly_rent: 12000, deposit: 24000, check-in: 2026-01-05
    const book1Res = await client.query(`
      INSERT INTO bookings (tenant_id, bed_id, check_in_date, monthly_rent, security_deposit, billing_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
      RETURNING id
    `, [tenantIds[0], b101A, new Date('2026-01-05'), '12000', '24000', 5]);
    const book1 = book1Res.rows[0].id;

    // Aditi: Bed 102A, monthly_rent: 18000, deposit: 36000, check-in: 2026-02-10
    const book2Res = await client.query(`
      INSERT INTO bookings (tenant_id, bed_id, check_in_date, monthly_rent, security_deposit, billing_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
      RETURNING id
    `, [tenantIds[1], b102A, new Date('2026-02-10'), '18000', '36000', 10]);
    const book2 = book2Res.rows[0].id;

    // Kabir: Bed 201A, monthly_rent: 8000, deposit: 16000, check-in: 2026-03-01
    const book3Res = await client.query(`
      INSERT INTO bookings (tenant_id, bed_id, check_in_date, monthly_rent, security_deposit, billing_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
      RETURNING id
    `, [tenantIds[2], b201A, new Date('2026-03-01'), '8000', '16000', 1]);
    const book3 = book3Res.rows[0].id;

    // Riya: Bed 202A, monthly_rent: 12000, deposit: 24000, check-in: 2026-04-15
    const book4Res = await client.query(`
      INSERT INTO bookings (tenant_id, bed_id, check_in_date, monthly_rent, security_deposit, billing_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
      RETURNING id
    `, [tenantIds[3], b202A, new Date('2026-04-15'), '12000', '24000', 15]);
    const book4 = book4Res.rows[0].id;

    // Vikram: Bed 101B, monthly_rent: 12000, deposit: 24000, check-in: 2026-05-01
    const book5Res = await client.query(`
      INSERT INTO bookings (tenant_id, bed_id, check_in_date, monthly_rent, security_deposit, billing_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
      RETURNING id
    `, [tenantIds[4], b101B, new Date('2026-05-01'), '12000', '24000', 1]);
    const book5 = book5Res.rows[0].id;
    console.log('Created Bookings.');

    // Helper to insert rent records & payments
    const addRentAndPayment = async (bookingId, tenantId, month, year, rent, paid, status, dueDate, pDate) => {
      const balance = (rent - paid).toString();
      const rentRecordRes = await client.query(`
        INSERT INTO rent_records (booking_id, tenant_id, period_month, period_year, rent_amount, paid_amount, balance, due_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [bookingId, tenantId, month, year, rent.toString(), paid.toString(), balance, dueDate, status]);
      const recordId = rentRecordRes.rows[0].id;

      if (paid > 0) {
        const referenceNumber = 'TXN' + Math.floor(Math.random()*1000000);
        await client.query(`
          INSERT INTO payments (rent_record_id, amount, payment_date, payment_mode, reference_number, receipt_url, collected_by)
          VALUES ($1, $2, $3, 'UPI', $4, null, $5)
        `, [recordId, paid.toString(), pDate, referenceNumber, adminId]);
      }
    };

    // 8. Generate Rent Records and Payments (January to June 2026)
    // Aarav: January - June
    await addRentAndPayment(book1, tenantIds[0], 1, 2026, 12000, 12000, 'PAID', new Date('2026-01-05'), new Date('2026-01-05'));
    await addRentAndPayment(book1, tenantIds[0], 2, 2026, 12000, 12000, 'PAID', new Date('2026-02-05'), new Date('2026-02-05'));
    await addRentAndPayment(book1, tenantIds[0], 3, 2026, 12000, 12000, 'PAID', new Date('2026-03-05'), new Date('2026-03-05'));
    await addRentAndPayment(book1, tenantIds[0], 4, 2026, 12000, 12000, 'PAID', new Date('2026-04-05'), new Date('2026-04-05'));
    await addRentAndPayment(book1, tenantIds[0], 5, 2026, 12000, 12000, 'PAID', new Date('2026-05-05'), new Date('2026-05-05'));
    await addRentAndPayment(book1, tenantIds[0], 6, 2026, 12000, 6000, 'PARTIAL', new Date('2026-06-05'), new Date('2026-06-05'));

    // Aditi: February - June
    await addRentAndPayment(book2, tenantIds[1], 2, 2026, 18000, 18000, 'PAID', new Date('2026-02-10'), new Date('2026-02-10'));
    await addRentAndPayment(book2, tenantIds[1], 3, 2026, 18000, 18000, 'PAID', new Date('2026-03-10'), new Date('2026-03-10'));
    await addRentAndPayment(book2, tenantIds[1], 4, 2026, 18000, 18000, 'PAID', new Date('2026-04-10'), new Date('2026-04-10'));
    await addRentAndPayment(book2, tenantIds[1], 5, 2026, 18000, 18000, 'PAID', new Date('2026-05-10'), new Date('2026-05-10'));
    // Overdue for June
    await addRentAndPayment(book2, tenantIds[1], 6, 2026, 18000, 0, 'OVERDUE', new Date('2026-06-10'), null);

    // Kabir: March - June
    await addRentAndPayment(book3, tenantIds[2], 3, 2026, 8000, 8000, 'PAID', new Date('2026-03-01'), new Date('2026-03-01'));
    await addRentAndPayment(book3, tenantIds[2], 4, 2026, 8000, 8000, 'PAID', new Date('2026-04-01'), new Date('2026-04-01'));
    await addRentAndPayment(book3, tenantIds[2], 5, 2026, 8000, 8000, 'PAID', new Date('2026-05-01'), new Date('2026-05-01'));
    await addRentAndPayment(book3, tenantIds[2], 6, 2026, 8000, 8000, 'PAID', new Date('2026-06-01'), new Date('2026-06-01'));

    // Riya: April - June
    await addRentAndPayment(book4, tenantIds[3], 4, 2026, 12000, 12000, 'PAID', new Date('2026-04-15'), new Date('2026-04-15'));
    await addRentAndPayment(book4, tenantIds[3], 5, 2026, 12000, 12000, 'PAID', new Date('2026-05-15'), new Date('2026-05-15'));
    await addRentAndPayment(book4, tenantIds[3], 6, 2026, 12000, 12000, 'PAID', new Date('2026-06-15'), new Date('2026-06-15'));

    // Vikram: May - June
    await addRentAndPayment(book5, tenantIds[4], 5, 2026, 12000, 12000, 'PAID', new Date('2026-05-01'), new Date('2026-05-01'));
    await addRentAndPayment(book5, tenantIds[4], 6, 2026, 12000, 12000, 'PAID', new Date('2026-06-01'), new Date('2026-06-02'));

    console.log('Created Rent Records and Payments.');

    // 9. Insert Maintenance Tickets
    await client.query(`
      INSERT INTO maintenance_tickets (property_id, room_id, bed_id, title, description, priority, status, reported_by, created_at)
      VALUES ($1, $2, $3, $4, $5, 'HIGH', 'OPEN', $6, $7)
    `, [propertyId, r101Id, b101A, tenantIds[0], 'AC Water Leakage: Water leaking from the split AC unit. Need immediate fix.', adminId, new Date('2026-06-12')]);

    await client.query(`
      INSERT INTO maintenance_tickets (property_id, room_id, bed_id, title, description, priority, status, reported_by, created_at)
      VALUES ($1, $2, $3, $4, $5, 'URGENT', 'IN_PROGRESS', $6, $7)
    `, [propertyId, r102Id, b102A, tenantIds[1], 'Bathroom Geyser Not Working: Geyser is not heating water. Affecting morning bath.', adminId, new Date('2026-06-13')]);

    await client.query(`
      INSERT INTO maintenance_tickets (property_id, room_id, bed_id, title, description, priority, status, reported_by, created_at)
      VALUES ($1, $2, $3, $4, $5, 'MEDIUM', 'OPEN', $6, $7)
    `, [propertyId, r201Id, b201A, tenantIds[2], 'WiFi connectivity issues: Very slow internet speed in room 201.', adminId, new Date('2026-06-14')]);

    await client.query(`
      INSERT INTO maintenance_tickets (property_id, room_id, bed_id, title, description, priority, status, reported_by, created_at, resolved_at, resolution_notes, cost_incurred)
      VALUES ($1, $2, $3, $4, $5, 'LOW', 'RESOLVED', $6, $7, $8, $9, $10)
    `, [propertyId, r202Id, b202A, tenantIds[3], 'Broken window latch: Window latch is loose.', adminId, new Date('2026-06-10'), new Date('2026-06-12'), 'Latch replaced.', '450.00']);

    console.log('Created Maintenance Tickets.');

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await client.end();
  }
}

seed().catch(console.error);
