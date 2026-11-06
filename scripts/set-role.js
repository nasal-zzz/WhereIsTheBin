// Usage: npm run set-role -- you@example.com super-admin
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const ROLES = ['user', 'moderator', 'admin', 'super-admin'];
const [email, role] = process.argv.slice(2);

(async () => {
  if (!email || !ROLES.includes(role)) {
    console.error(`Usage: npm run set-role -- <email> <${ROLES.join('|')}>`);
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOneAndUpdate({ email: email.toLowerCase() }, { role }, { returnDocument: 'after' });
  console.log(user ? `${user.email} is now ${user.role}.` : 'No user with that email. Register first.');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });