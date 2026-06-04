const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendLawyerApprovalEmail = async (lawyer) => {
  const mailOptions = {
    from: `"KanoonSathi" <${process.env.SMTP_USER}>`,
    to: lawyer.email,
    subject: 'Welcome to KanoonSathi! Your Account Has Been Approved',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); padding: 40px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; }
          .content { padding: 40px; }
          .success-icon { width: 80px; height: 80px; background: #10B981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
          .success-icon svg { width: 40px; height: 40px; color: white; }
          h2 { color: #1E293B; margin: 0 0 20px; font-size: 24px; text-align: center; }
          p { color: #64748B; line-height: 1.8; margin: 0 0 16px; }
          .cta { display: inline-block; background: #DC2626; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0; }
          .features { background: #F8FAFC; padding: 24px; border-radius: 12px; margin: 24px 0; }
          .feature { display: flex; align-items: center; margin: 12px 0; }
          .feature-icon { width: 32px; height: 32px; background: #DC2626; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px; }
          .feature-icon svg { width: 16px; height: 16px; color: white; }
          .footer { background: #1E3A5F; padding: 24px; text-align: center; }
          .footer p { color: rgba(255,255,255,0.8); font-size: 14px; margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to KanoonSathi!</h1>
            <p>Your Account Has Been Approved</p>
          </div>
          <div class="content">
            <div class="success-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2>Congratulations, ${lawyer.name}!</h2>
            <p>We are pleased to inform you that your application to join KanoonSathi has been <strong>approved</strong>! You are now officially part of our growing network of legal professionals.</p>
            <p>As a KanoonSathi lawyer, you can now help people across Nepal access quality legal guidance. Your expertise matters, and we are excited to have you on board.</p>
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'https://frontend-iota-six-33.vercel.app'}/lawyer/login" class="cta">Access Your Dashboard</a>
            </p>
            <div class="features">
              <div class="feature">
                <div class="feature-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                </div>
                <span>Start receiving appointment requests from clients</span>
              </div>
              <div class="feature">
                <div class="feature-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <span>Conduct video consultations seamlessly</span>
              </div>
              <div class="feature">
                <div class="feature-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                </div>
                <span>Track your appointments and grow your practice</span>
              </div>
            </div>
            <p>Log in now to set up your profile, manage your availability, and start connecting with clients. Together, let's make legal help accessible to everyone in Nepal!</p>
          </div>
          <div class="footer">
            <p>KanoonSathi — Your Trusted Legal Partner in Nepal</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Approval email sent to ${lawyer.email}`);
  } catch (error) {
    console.error('Error sending approval email:', error);
  }
};

const sendLawyerRejectionEmail = async (lawyer, reason = '') => {
  const mailOptions = {
    from: `"KanoonSathi" <${process.env.SMTP_USER}>`,
    to: lawyer.email,
    subject: 'Application Update — KanoonSathi',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #64748B 0%, #475569 100%); padding: 40px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 40px; }
          .sad-icon { width: 80px; height: 80px; background: #EF4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
          .sad-icon svg { width: 40px; height: 40px; color: white; }
          h2 { color: #1E293B; margin: 0 0 20px; font-size: 24px; text-align: center; }
          p { color: #64748B; line-height: 1.8; margin: 0 0 16px; }
          .support { background: #FEF3C7; padding: 16px; border-radius: 8px; margin: 24px 0; }
          .footer { background: #1E3A5F; padding: 24px; text-align: center; }
          .footer p { color: rgba(255,255,255,0.8); font-size: 14px; margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Update</h1>
          </div>
          <div class="content">
            <div class="sad-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2>We're Sorry, ${lawyer.name}</h2>
            <p>Thank you for your interest in joining KanoonSathi. After careful review, we regret to inform you that we are unable to approve your application at this time.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <div class="support">
              <p style="margin: 0;"><strong>Need Help?</strong><br>
              If you believe this was a mistake or would like to discuss this further, please contact our support team at support@kanoonsathi.np</p>
            </div>
            <p>We encourage you to continue your legal practice and wish you the best in your career.</p>
          </div>
          <div class="footer">
            <p>KanoonSathi — Your Trusted Legal Partner in Nepal</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Rejection email sent to ${lawyer.email}`);
  } catch (error) {
    console.error('Error sending rejection email:', error);
  }
};

module.exports = {
  sendLawyerApprovalEmail,
  sendLawyerRejectionEmail
};