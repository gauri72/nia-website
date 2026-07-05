const Notification = require('../models/Notification');
const AdminUser = require('../models/AdminUser');
const Member = require('../models/Member');

async function notifyAdmins(title, body, link) {
  const admins = await AdminUser.find({ isActive: true }).select('_id');
  if (admins.length === 0) return;
  await Notification.insertMany(admins.map((a) => ({
    recipientKind: 'admin', recipientModel: 'AdminUser', recipient: a._id, title, body, link,
  })));
}

async function notifyMember(memberId, title, body, link) {
  await Notification.create({ recipientKind: 'member', recipientModel: 'Member', recipient: memberId, title, body, link });
}

async function notifyAllActiveMembers(title, body, link) {
  const members = await Member.find({ status: 'active' }).select('_id');
  if (members.length === 0) return;
  await Notification.insertMany(members.map((m) => ({
    recipientKind: 'member', recipientModel: 'Member', recipient: m._id, title, body, link,
  })));
}

module.exports = { notifyAdmins, notifyMember, notifyAllActiveMembers };
