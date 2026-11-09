const mongoose = require('mongoose');
const svc = require('../../services/moderationService');
const { clientStrings } = require('../../utils/i18n');
const { FACILITY_TYPES, WASTE_CATEGORIES, ACCESS_TYPES } = require('../../utils/constants');
const { validateFacilityInput } = require('../../utils/facilityInput');

const notFound = (next) => { const e = new Error('Not found'); e.status = 404; next(e); };
const badRequest = (next) => { const e = new Error('Bad request'); e.status = 400; next(e); };
const cleanNote = (v) => String(v || '').trim().slice(0, 500);

exports.dashboard = async (req, res, next) => {
  try {
    res.render('admin/dashboard', { pageTitle: 'admin.title', ...(await svc.dashboardData()) });
  } catch (err) { next(err); }
};

async function renderDetail(req, res, facility, { errors = [], reasonText = '', status = 200 } = {}) {
  res.status(status).render('admin/detail', {
    pageTitle: 'admin.title', f: facility, errors, reasonText,
    clientStrings: clientStrings(req.locale, ['map.locat']),
  });
}

exports.show = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(next);
    const f = await svc.getFacility(req.params.id);
    if (!f) return notFound(next);
    renderDetail(req, res, f);
  } catch (err) { next(err); }
};

exports.decide = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return notFound(next);
    const decision = req.body.decision;
    const reason = cleanNote(req.body.reason);
    if (!['approve', 'reject'].includes(decision)) return badRequest(next);

    if (decision === 'reject' && reason.length < 3) {
      const f = await svc.getFacility(id);
      if (!f) return notFound(next);
      return renderDetail(req, res, f, { errors: ['err.reason'], reasonText: reason, status: 400 });
    }
    const done = await svc.decide({ facilityId: id, actor: req.user, decision, reason });
    req.session.flash = !done ? 'flash.alreadyReviewed' : decision === 'approve' ? 'flash.approved' : 'flash.rejected';
    res.redirect('/admin');
  } catch (err) { next(err); }
};

// ---------- reports ----------
exports.reports = async (req, res, next) => {
  try {
    res.render('admin/reports', { pageTitle: 'admin.reports', reports: await svc.listOpenReports() });
  } catch (err) { next(err); }
};

exports.reportShow = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(next);
    const r = await svc.getReport(req.params.id);
    if (!r) return notFound(next);
    res.render('admin/report', { pageTitle: 'admin.reports', r });
  } catch (err) { next(err); }
};

exports.reportDecide = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return notFound(next);
    const decision = req.body.decision;
    if (!['confirm', 'dismiss'].includes(decision)) return badRequest(next);
    const done = await svc.decideReport({ reportId: id, actor: req.user, decision, note: cleanNote(req.body.note) });
    req.session.flash = !done ? 'flash.reportAlreadyHandled' : decision === 'confirm' ? 'flash.reportConfirmed' : 'flash.reportDismissed';
    res.redirect('/admin/reports');
  } catch (err) { next(err); }
};

exports.setOpStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return notFound(next);
    if (!['available', 'unknown'].includes(req.body.status)) return badRequest(next);
    const done = await svc.setOperationalStatus({ facilityId: id, actor: req.user, status: req.body.status });
    if (!done) return notFound(next);
    req.session.flash = 'flash.statusReset';
    const back = String(req.body.back || '');
    res.redirect(back.startsWith('/admin/') && !back.startsWith('//') ? back : '/admin');
  } catch (err) { next(err); }
};

// ---------- facility management ----------
exports.facilities = async (req, res, next) => {
  try {
    const status = String(req.query.status || '');
    const q = String(req.query.q || '').trim().slice(0, 80);
    res.render('admin/facilities', { pageTitle: 'admin.facilities', items: await svc.listFacilities({ status, q }), status, q });
  } catch (err) { next(err); }
};

function renderEdit(req, res, f, { errors = [], values, status = 200 } = {}) {
  const [lng, lat] = f.location.coordinates;
  const current = {
    name: f.name, facilityType: f.facilityType, waste: f.acceptedWaste, accessType: f.accessType,
    district: f.district || '', localBody: f.localBody || '', address: f.address || '', description: f.description || '', lat, lng,
  };
  res.status(status).render('admin/edit', {
    pageTitle: 'admin.edit.title', f, errors, values: values || current,
    facilityTypes: FACILITY_TYPES, wasteCategories: WASTE_CATEGORIES, accessTypes: ACCESS_TYPES,
    clientStrings: clientStrings(req.locale, ['add.', 'map.locat']),
  });
}

exports.editForm = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(next);
    const f = await svc.getFacility(req.params.id);
    if (!f) return notFound(next);
    renderEdit(req, res, f);
  } catch (err) { next(err); }
};

exports.editSubmit = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return notFound(next);
    const f = await svc.getFacility(id);
    if (!f) return notFound(next);
    const { errors, values } = validateFacilityInput(req.body);
    if (errors.length) return renderEdit(req, res, f, { errors, values, status: 400 });

    const result = await svc.updateFacility({ facilityId: id, actor: req.user, values, markVerified: req.body.markVerified === 'on' });
    if (!result) return notFound(next);
    req.session.flash = result.changed.length || result.stamped ? 'flash.facilityUpdated' : 'admin.edit.noChanges';
    res.redirect(`/admin/facilities/${id}`);
  } catch (err) { next(err); }
};

exports.setState = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return notFound(next);
    const state = req.body.state;
    if (!['archive', 'restore'].includes(state)) return badRequest(next);
    const done = await svc.setFacilityState({ facilityId: id, actor: req.user, state });
    req.session.flash = !done ? 'flash.stateConflict' : state === 'archive' ? 'flash.facilityArchived' : 'flash.facilityRestored';
    res.redirect(`/admin/facilities/${id}`);
  } catch (err) { next(err); }
};

exports.audit = async (req, res, next) => {
  try {
    res.render('admin/audit', { pageTitle: 'admin.audit', entries: await svc.recentAudit() });
  } catch (err) { next(err); }
};