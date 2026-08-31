const { User, Lawyer } = require('./models');

const seedDemoData = async () => {
  try {
    const existingDemoUser = await User.findOne({ where: { email: 'demo@user.com' } });
    if (!existingDemoUser) {
      await User.create({
        name: 'Demo User',
        email: 'demo@user.com',
        password: 'demo123',
        phone: '+977 9800000000'
      });
      console.log('Demo user created: demo@user.com / demo123');
    } else {
      console.log('Demo user already exists');
    }

    const existingDemoLawyer = await Lawyer.findOne({ where: { email: 'demo@lawyer.com' } });
    if (!existingDemoLawyer) {
      await Lawyer.create({
        name: 'Demo Lawyer',
        email: 'demo@lawyer.com',
        password: 'demo123',
        phone: '+977 9800000001',
        specialization: 'Civil',
        licenseNumber: 'LA-DEMO-001',
        experience: 5,
        bio: 'Experienced civil lawyer specializing in property and business law.',
        status: 'approved',
        rating: 4.5,
        totalRatings: 12
      });
      console.log('Demo lawyer created: demo@lawyer.com / demo123');
    } else {
      console.log('Demo lawyer already exists');
    }

    return true;
  } catch (error) {
    console.error('Error seeding demo data:', error);
    return false;
  }
};

if (require.main === module) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedDemoData };
