const mongoose = require('mongoose');
const svc = require('../../services/moderationService');
const { clientStrings } = require('../../utils/i18n');

const notFound = (next) => { const e = new Error('Not found'); e.status = 404; next(e); };

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
    const reason = String(req.body.reason || '').trim().slice(0, 500);
    if (!['approve', 'reject'].includes(decision)) { const e = new Error('Bad request'); e.status = 400; return next(e); }

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

exports.audit = async (req, res, next) => {
  try {
    res.render('admin/audit', { pageTitle: 'admin.audit', entries: await svc.recentAudit() });
  } catch (err) { next(err); }
};