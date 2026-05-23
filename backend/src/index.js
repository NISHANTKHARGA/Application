require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize, User, Lawyer } = require('./models');

const authRoutes = require('./routes/auth');
const lawyerRoutes = require('./routes/lawyer');
const appointmentRoutes = require('./routes/appointment');
const chatRoutes = require('./routes/chat');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/lawyer', lawyerRoutes);
app.use('/api/appointment', appointmentRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'KanoonSathi API is running',
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

const seedDatabase = async () => {
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
    }

    const demoLawyers = [
      { name: 'Adv. Ram Sharma', email: 'ram@demo.com', specialization: 'Criminal', experience: 8, bio: 'Senior criminal lawyer with expertise in criminal defense and FIR cases.', rating: 4.8, totalRatings: 24 },
      { name: 'Adv. Sita Poudel', email: 'sita@demo.com', specialization: 'Family', experience: 6, bio: 'Family law specialist handling divorce, custody and domestic violence cases.', rating: 4.7, totalRatings: 18 },
      { name: 'Adv. Hari Karki', email: 'hari@demo.com', specialization: 'Property', experience: 10, bio: 'Property law expert for land registration, dispute resolution and inheritance.', rating: 4.9, totalRatings: 31 },
      { name: 'Adv. Gita Thapa', email: 'gita@demo.com', specialization: 'Business', experience: 7, bio: 'Corporate lawyer specializing in company registration, tax and contract law.', rating: 4.6, totalRatings: 15 },
      { name: 'Adv. Suman Rai', email: 'suman@demo.com', specialization: 'Labor', experience: 4, bio: 'Labor law expert handling employment disputes, termination and social security.', rating: 4.3, totalRatings: 9 },
      { name: 'Adv. Nisha Gurung', email: 'nisha@demo.com', specialization: 'Constitutional', experience: 12, bio: 'Constitutional lawyer experienced in fundamental rights and writ petitions.', rating: 4.9, totalRatings: 42 },
    ];

    for (const dl of demoLawyers) {
      const existing = await Lawyer.findOne({ where: { email: dl.email } });
      if (!existing) {
        await Lawyer.create({
          name: dl.name,
          email: dl.email,
          password: 'demo123',
          phone: `+977 9800${String(Math.floor(Math.random() * 900000) + 100000)}`,
          specialization: dl.specialization,
          licenseNumber: `LA-DEMO-${String(Math.random()).slice(2, 8)}`,
          experience: dl.experience,
          bio: dl.bio,
          status: 'approved',
          rating: dl.rating,
          totalRatings: dl.totalRatings
        });
        console.log(`Demo ${dl.specialization} lawyer created: ${dl.email} / demo123`);
      }
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully');

    await sequelize.sync({ force: false });
    console.log('Database models synchronized');

    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`KanoonSathi Backend Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('\n--- Demo Accounts ---');
      console.log('User:   demo@user.com / demo123');
      console.log('Lawyer: demo@lawyer.com / demo123');
      console.log('-------------------\n');
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer();
