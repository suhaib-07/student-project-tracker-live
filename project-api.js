import express from 'express';
export function createApp(db) {
  const app = express();
  app.use(express.json({ limit: '10kb' }));
  app.use(express.static('public'));
  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.get('/api/projects', async (req, res) => res.json(await db.list()));
  function readId(req, res) {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ error: 'Invalid project id.' }); return null; }
    return id;
  }
  function readProject(req, res) {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const status = req.body?.status;
    if (name.length < 1 || name.length > 80 || !['Planned', 'In Progress', 'Completed'].includes(status)) {
      res.status(400).json({ error: 'Use a name of 1-80 characters and a valid status.' }); return null;
    }
    return { name, status };
  }
  app.post('/api/projects', async (req, res) => {
    const project = readProject(req, res);
    if (project) res.status(201).json(await db.create(project));
  });
  app.put('/api/projects/:id', async (req, res) => {
    const id = readId(req, res); if (id === null) return;
    const project = readProject(req, res); if (!project) return;
    const row = await db.update(id, project);
    if (!row) return res.status(404).json({ error: 'Project not found.' });
    res.json(row);
  });
  app.delete('/api/projects/:id', async (req, res) => {
    const id = readId(req, res); if (id === null) return;
    if (!await db.remove(id)) return res.status(404).json({ error: 'Project not found.' });
    res.json({ deleted: true });
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large.' });
    console.error('Request failed:', error.code || error.name);
    res.status(500).json({ error: 'Server error. Check the server terminal.' });
  });
  return app;
}
