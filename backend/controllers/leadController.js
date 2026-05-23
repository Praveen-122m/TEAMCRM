const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const MetaAdsLead = require('../models/MetaAdsLead');
const MetaAdsCampaign = require('../models/MetaAdsCampaign');
const Client = require('../models/Client');
const Member = require('../models/Member');
const User = require('../models/User');
const { createNotification } = require('../utils/notifyHelper');

const normalizeStatus = (s) => {
  if (!s) return 'NEW';
  const u = s.toString().toUpperCase();
  const map = { NEW: 'NEW', CONTACTED: 'CONTACTED', QUALIFIED: 'QUALIFIED', CONVERTED: 'CONVERTED', LOST: 'LOST' };
  return map[u] || 'NEW';
};

const formatLead = (lead) => {
  const j = lead.toJSON ? lead.toJSON() : lead;
  j.status = normalizeStatus(j.status);
  j.leadName = j.name;
  j.clientName = j.client?.companyName || j.client?.user?.name || '—';
  j.campaignName = j.campaign?.name || '—';
  j.assignedMemberName =
    j.assignedMember?.user?.name || j.assignedMember?.designation || 'Unassigned';
  j.leadSource = j.source || j.platform || 'Meta Ads';
  j.date = j.submittedAt || j.createdAt;
  return j;
};

const getClientProfileId = async (userId) => {
  const c = await Client.findOne({ where: { userId } });
  return c?._id || null;
};

const getMemberProfileId = async (userId) => {
  const m = await Member.findOne({ where: { userId } });
  return m?._id || null;
};

const buildLeadWhere = async (req, query) => {
  const where = {};
  const { workspaceId, clientId, campaignId, status, source, search, dateFrom, dateTo } = query;

  if (workspaceId) where.workspaceId = workspaceId;

  if (req.user.role === 'Client') {
    const cid = await getClientProfileId(req.user._id);
    if (!cid) return { denied: true };
    where.clientId = cid;
  } else if (req.user.role === 'Member') {
    const mid = await getMemberProfileId(req.user._id);
    if (!mid) return { denied: true, empty: true };
    where.assignedMemberId = mid;
  } else if (clientId) {
    where.clientId = clientId;
  }

  if (campaignId) where.campaignId = campaignId;
  if (status) where.status = normalizeStatus(status);
  if (source) where.source = source;

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
    ];
  }

  if (dateFrom || dateTo) {
    where.submittedAt = {};
    if (dateFrom) where.submittedAt[Op.gte] = new Date(dateFrom);
    if (dateTo) where.submittedAt[Op.lte] = new Date(dateTo + 'T23:59:59');
  }

  return { where };
};

const leadIncludes = [
  {
    model: Client,
    as: 'client',
    include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'email'] }],
  },
  { model: MetaAdsCampaign, as: 'campaign', attributes: ['_id', 'name'] },
  {
    model: Member,
    as: 'assignedMember',
    include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'email', 'profileImage'] }],
  },
];

const emitLeadEvent = (req, lead, type = 'lead_received') => {
  const io = req.app.get('socketio');
  if (!io) return;
  const payload = formatLead(lead);
  io.to(payload.workspaceId?.toString()).emit(type, payload);
  io.emit(type, payload);
};

const notifyNewLead = async (req, lead, campaignName) => {
  const io = req.app.get('socketio');
  if (!io) return;
  const formatted = formatLead(lead);
  const workspace = await require('../models/Workspace').findByPk(lead.workspaceId, {
    include: [{ model: User, as: 'members', attributes: ['_id', 'role'] }],
  });
  const members = workspace?.members || [];
  const msg = `New lead received from ${campaignName || formatted.campaignName || 'Campaign'}`;
  for (const u of members) {
    if (u._id.toString() === req.user?._id?.toString()) continue;
    if (u.role === 'Admin' || u.role === 'Member') {
      await createNotification(io, {
        recipientId: u._id,
        senderId: req.user?._id,
        type: 'lead',
        content: msg,
        payload: { workspaceId: lead.workspaceId, leadId: lead._id, isLead: true },
      });
    }
  }
  if (lead.clientId) {
    const client = await Client.findByPk(lead.clientId);
    if (client?.userId) {
      await createNotification(io, {
        recipientId: client.userId,
        senderId: req.user?._id,
        type: 'lead',
        content: msg,
        payload: { workspaceId: lead.workspaceId, leadId: lead._id, isLead: true },
      });
    }
  }
};

const getLeads = async (req, res) => {
  try {
    const built = await buildLeadWhere(req, req.query);
    if (built.denied) return res.status(403).json({ message: 'Access denied' });
    if (built.empty) return res.json([]);

    const leads = await MetaAdsLead.findAll({
      where: built.where,
      include: leadIncludes,
      order: [['submittedAt', 'DESC']],
    });
    res.json(leads.map(formatLead));
  } catch (error) {
    console.error('[GET_LEADS_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getLeadById = async (req, res) => {
  try {
    const lead = await MetaAdsLead.findByPk(req.params.id, { include: leadIncludes });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    if (req.user.role === 'Client') {
      const cid = await getClientProfileId(req.user._id);
      if (!cid || !lead.clientId || lead.clientId.toString() !== cid.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    if (req.user.role === 'Member') {
      const mid = await getMemberProfileId(req.user._id);
      if (lead.assignedMemberId?.toString() !== mid?.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json(formatLead(lead));
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const createLead = async (req, res) => {
  try {
    const {
      workspaceId,
      clientId,
      campaignId,
      name,
      email,
      phone,
      source,
      status,
      notes,
      assignedMemberId,
    } = req.body;

    if (!workspaceId || !name) {
      return res.status(400).json({ message: 'Workspace and lead name are required' });
    }

    if (req.user.role === 'Member') {
      return res.status(403).json({ message: 'Members cannot create leads' });
    }

    let finalClientId = clientId;
    if (req.user.role === 'Client') {
      finalClientId = await getClientProfileId(req.user._id);
    }

    const lead = await MetaAdsLead.create({
      workspaceId,
      clientId: finalClientId,
      campaignId: campaignId || null,
      assignedMemberId: assignedMemberId || null,
      name,
      email: email || '',
      phone: phone || '',
      source: source || 'Website',
      status: normalizeStatus(status),
      notes: notes || '',
      submittedAt: new Date(),
    });

    const full = await MetaAdsLead.findByPk(lead._id, { include: leadIncludes });
    emitLeadEvent(req, full);
    await notifyNewLead(req, full, full.campaign?.name);
    res.status(201).json(formatLead(full));
  } catch (error) {
    console.error('[CREATE_LEAD_ERR]', error);
    res.status(500).json({ message: 'Failed to create lead' });
  }
};

const updateLeadStatus = async (req, res) => {
  try {
    const lead = await MetaAdsLead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    if (req.user.role === 'Client') {
      return res.status(403).json({ message: 'Clients cannot change status via this route' });
    }
    if (req.user.role === 'Member') {
      const mid = await getMemberProfileId(req.user._id);
      if (lead.assignedMemberId?.toString() !== mid?.toString()) {
        return res.status(403).json({ message: 'Not your assigned lead' });
      }
    }

    const { status, notes } = req.body;
    if (status) lead.status = normalizeStatus(status);
    if (notes !== undefined) lead.notes = notes;
    await lead.save();

    const full = await MetaAdsLead.findByPk(lead._id, { include: leadIncludes });
    emitLeadEvent(req, full, 'lead_updated');
    res.json(formatLead(full));
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const assignLead = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only admins can assign leads' });
    }

    const { memberId } = req.body;
    const lead = await MetaAdsLead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    if (memberId) {
      const member = await Member.findByPk(memberId);
      if (!member) return res.status(404).json({ message: 'Member not found' });
    }

    lead.assignedMemberId = memberId || null;
    await lead.save();

    const full = await MetaAdsLead.findByPk(lead._id, { include: leadIncludes });
    emitLeadEvent(req, full, 'lead_updated');

    const io = req.app.get('socketio');
    if (memberId && io) {
      const member = await Member.findByPk(memberId, {
        include: [{ model: User, as: 'user' }],
      });
      if (member?.user) {
        await createNotification(io, {
          recipientId: member.user._id,
          senderId: req.user._id,
          type: 'lead',
          content: `Lead assigned to you: ${lead.name}`,
          payload: { workspaceId: lead.workspaceId, leadId: lead._id, isLead: true },
        });
      }
    }

    res.json(formatLead(full));
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const updateLead = async (req, res) => {
  try {
    const lead = await MetaAdsLead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    if (req.user.role === 'Member') {
      const mid = await getMemberProfileId(req.user._id);
      if (lead.assignedMemberId?.toString() !== mid?.toString()) {
        return res.status(403).json({ message: 'Not your assigned lead' });
      }
      const { status, notes } = req.body;
      if (status) lead.status = normalizeStatus(status);
      if (notes !== undefined) lead.notes = notes;
    } else if (req.user.role === 'Admin') {
      const { status, notes, name, email, phone, source, assignedMemberId } = req.body;
      if (status) lead.status = normalizeStatus(status);
      if (notes !== undefined) lead.notes = notes;
      if (name) lead.name = name;
      if (email !== undefined) lead.email = email;
      if (phone !== undefined) lead.phone = phone;
      if (source) lead.source = source;
      if (assignedMemberId !== undefined) lead.assignedMemberId = assignedMemberId || null;
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    await lead.save();
    const full = await MetaAdsLead.findByPk(lead._id, { include: leadIncludes });
    emitLeadEvent(req, full, 'lead_updated');
    res.json(formatLead(full));
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const deleteLead = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only admins can delete leads' });
    }
    const lead = await MetaAdsLead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    await lead.destroy();
    const io = req.app.get('socketio');
    if (io) io.to(lead.workspaceId.toString()).emit('lead_deleted', { _id: req.params.id });
    res.json({ message: 'Lead deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const fetchLeadsForExport = async (req) => {
  const built = await buildLeadWhere(req, req.query);
  if (built.denied || built.empty) return [];
  return MetaAdsLead.findAll({
    where: built.where,
    include: leadIncludes,
    order: [['submittedAt', 'DESC']],
  });
};

const exportCsv = async (req, res) => {
  try {
    const leads = await fetchLeadsForExport(req);
    const rows = leads.map((l) => {
      const f = formatLead(l);
      return [
        f.name || '',
        f.phone || '',
        f.email || '',
        f.clientName || '',
        f.campaignName || '',
        f.assignedMemberName || '',
        f.leadSource || '',
        f.status || '',
        f.date ? new Date(f.date).toLocaleDateString() : '',
        (f.notes || '').replace(/(\r\n|\n|\r)/gm, ' ')
      ];
    });
    
    const headers = ['Lead Name', 'Phone', 'Email', 'Client', 'Campaign', 'Assigned Member', 'Source', 'Status', 'Date', 'Notes'];
    const escapeCsv = (str) => `"${String(str).replace(/"/g, '""')}"`;
    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\n');

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename=leads-export.csv');
    res.send(csvContent);
  } catch (error) {
    console.error('CSV Export Error:', error);
    res.status(500).json({ message: 'Export failed' });
  }
};

const exportExcel = async (req, res) => {
  try {
    const leads = await fetchLeadsForExport(req);
    const rows = leads.map((l) => {
      const f = formatLead(l);
      return [
        f.name || '',
        f.phone || '',
        f.email || '',
        f.clientName || '',
        f.campaignName || '',
        f.assignedMemberName || '',
        f.leadSource || '',
        f.status || '',
        f.date ? new Date(f.date).toLocaleDateString() : ''
      ];
    });

    const headers = ['Lead Name', 'Phone', 'Email', 'Client', 'Campaign', 'Member', 'Source', 'Status', 'Date'];
    const escapeCsv = (str) => `"${String(str).replace(/"/g, '""')}"`;
    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\n');

    res.header('Content-Type', 'application/vnd.ms-excel');
    res.header('Content-Disposition', 'attachment; filename=leads-export.xls');
    res.send(csvContent);
  } catch (error) {
    console.error('Excel Export Error:', error);
    res.status(500).json({ message: 'Export failed' });
  }
};

const exportPdf = async (req, res) => {
  try {
    const leads = await fetchLeadsForExport(req);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=leads-export.pdf');
    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);
    doc.fontSize(18).text('Lead Center Export', { underline: true });
    doc.moveDown();
    leads.forEach((l, i) => {
      const f = formatLead(l);
      doc.fontSize(11).text(`${i + 1}. ${f.name} — ${f.status}`);
      doc.fontSize(9).text(`Phone: ${f.phone || '—'} | Email: ${f.email || '—'}`);
      doc.text(`Client: ${f.clientName} | Campaign: ${f.campaignName} | Source: ${f.leadSource}`);
      doc.moveDown(0.5);
    });
    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'PDF export failed' });
  }
};

module.exports = {
  getLeads,
  getLeadById,
  createLead,
  updateLeadStatus,
  assignLead,
  updateLead,
  deleteLead,
  exportCsv,
  exportExcel,
  exportPdf,
  formatLead,
  notifyNewLead,
  emitLeadEvent,
};
