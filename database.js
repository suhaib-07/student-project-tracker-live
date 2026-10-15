import postgres from 'postgres';
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL on the server.');
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, ssl: 'require', idle_timeout: 20 });
export const db = {
  async list() { return sql`SELECT id, name, status FROM projects ORDER BY id DESC`; },
  async create({ name, status }) { const [row] = await sql`INSERT INTO projects (name, status) VALUES (${name}, ${status}) RETURNING id, name, status`; return row; },
  async update(id, { name, status }) { const [row] = await sql`UPDATE projects SET name = ${name}, status = ${status} WHERE id = ${id} RETURNING id, name, status`; return row || null; },
  async remove(id) { const rows = await sql`DELETE FROM projects WHERE id = ${id} RETURNING id`; return rows.length > 0; }
};
