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
            <p>Your Legal Journey Starts Here</p>
          </div>
          <div class="content">
            <div class="success-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2>Congratulations, ${lawyer.name}!</h2>
            <p>Your lawyer account application has been <strong>approved</strong>. You are now part of the KanoonSathi family - Nepal's premier AI-powered legal consultation platform.</p>
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/lawyer/login" class="cta">Access Your Dashboard</a>
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
                <span>Track your appointments and earnings</span>
              </div>
            </div>
            <p>You can now log in to your dashboard and start helping people with their legal needs. Together, let's make legal help accessible to everyone in Nepal!</p>
          </div>
          <div class="footer">
            <p>KanoonSathi - Your Trusted Legal Partner in Nepal</p>
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
    subject: 'Application Update - KanoonSathi',
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
            <p>KanoonSathi - Your Trusted Legal Partner in Nepal</p>
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

const sendAppointmentConfirmationEmail = async (appointment, user, lawyer) => {
  const meetingDate = new Date(appointment.dateTime);
  const formattedDate = meetingDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedTime = meetingDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const userMailOptions = {
    from: `"KanoonSathi" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: 'Appointment Confirmed - KanoonSathi',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); padding: 40px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 40px; }
          .appointment-card { background: #F8FAFC; padding: 24px; border-radius: 12px; margin: 24px 0; }
          .appointment-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #E2E8F0; }
          .appointment-row:last-child { border-bottom: none; }
          .label { color: #64748B; font-size: 14px; }
          .value { color: #1E293B; font-weight: 600; }
          .meeting-link { display: inline-block; background: #10B981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
          .footer { background: #1E3A5F; padding: 24px; text-align: center; }
          .footer p { color: rgba(255,255,255,0.8); font-size: 14px; margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment Confirmed!</h1>
          </div>
          <div class="content">
            <p>Dear ${user.name},</p>
            <p>Your legal consultation appointment has been confirmed. Here are your appointment details:</p>
            <div class="appointment-card">
              <div class="appointment-row">
                <span class="label">Lawyer</span>
                <span class="value">${lawyer.name}</span>
              </div>
              <div class="appointment-row">
                <span class="label">Specialization</span>
                <span class="value">${lawyer.specialization}</span>
              </div>
              <div class="appointment-row">
                <span class="label">Date</span>
                <span class="value">${formattedDate}</span>
              </div>
              <div class="appointment-row">
                <span class="label">Time</span>
                <span class="value">${formattedTime}</span>
              </div>
              <div class="appointment-row">
                <span class="label">Duration</span>
                <span class="value">${appointment.duration} minutes</span>
              </div>
            </div>
            ${appointment.meetingLink ? `<p style="text-align: center;"><a href="${appointment.meetingLink}" class="meeting-link">Join Video Consultation</a></p>` : ''}
            <p><strong>Important:</strong> Please ensure you have a stable internet connection and a quiet space for your consultation. Have all relevant documents ready before the meeting.</p>
          </div>
          <div class="footer">
            <p>KanoonSathi - Your Trusted Legal Partner in Nepal</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  const lawyerMailOptions = {
    from: `"KanoonSathi" <${process.env.SMTP_USER}>`,
    to: lawyer.email,
    subject: 'New Appointment - KanoonSathi',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%); padding: 40px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 40px; }
          .appointment-card { background: #F8FAFC; padding: 24px; border-radius: 12px; margin: 24px 0; }
          .appointment-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #E2E8F0; }
          .appointment-row:last-child { border-bottom: none; }
          .label { color: #64748B; font-size: 14px; }
          .value { color: #1E293B; font-weight: 600; }
          .meeting-link { display: inline-block; background: #10B981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
          .footer { background: #1E3A5F; padding: 24px; text-align: center; }
          .footer p { color: rgba(255,255,255,0.8); font-size: 14px; margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Appointment Request</h1>
          </div>
          <div class="content">
            <p>Dear ${lawyer.name},</p>
            <p>You have a new appointment booking. Here are the details:</p>
            <div class="appointment-card">
              <div class="appointment-row">
                <span class="label">Client</span>
                <span class="value">${user.name}</span>
              </div>
              <div class="appointment-row">
                <span class="label">Contact</span>
                <span class="value">${user.phone || 'N/A'}</span>
              </div>
              <div class="appointment-row">
                <span class="label">Date</span>
                <span class="value">${formattedDate}</span>
              </div>
              <div class="appointment-row">
                <span class="label">Time</span>
                <span class="value">${formattedTime}</span>
              </div>
              <div class="appointment-row">
                <span class="label">Duration</span>
                <span class="value">${appointment.duration} minutes</span>
              </div>
            </div>
            ${appointment.meetingLink ? `<p style="text-align: center;"><a href="${appointment.meetingLink}" class="meeting-link">Join Video Consultation</a></p>` : ''}
            <p><strong>Note:</strong> ${appointment.notes || 'No additional notes provided.'}</p>
          </div>
          <div class="footer">
            <p>KanoonSathi - Your Trusted Legal Partner in Nepal</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(userMailOptions);
    await transporter.sendMail(lawyerMailOptions);
    console.log(`Appointment confirmation emails sent for appointment ${appointment.id}`);
  } catch (error) {
    console.error('Error sending appointment confirmation emails:', error);
  }
};

const sendUserRegistrationEmail = async (user) => {
  const mailOptions = {
    from: `"KanoonSathi" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: 'Welcome to KanoonSathi! Registration Successful',
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
            <p>Your Account Has Been Created Successfully</p>
          </div>
          <div class="content">
            <div class="success-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2>Hello ${user.name}!</h2>
            <p>Thank you for registering with <strong>KanoonSathi</strong> — Nepal's premier AI-powered legal consultation platform.</p>
            <p>If you ever have any legal concerns, our platform is here to help you every step of the way. You can:</p>
            <div class="features">
              <div class="feature">
                <div class="feature-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"></path>
                  </svg>
                </div>
                <span><strong>Chat with our AI Legal Assistant</strong> — Get instant answers to your legal questions in Nepali or English, 24/7</span>
              </div>
              <div class="feature">
                <div class="feature-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                </div>
                <span><strong>Connect with Expert Lawyers</strong> — Browse and consult with Nepal's top verified legal professionals</span>
              </div>
              <div class="feature">
                <div class="feature-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <span><strong>Book Appointments</strong> — Schedule video consultations at your convenience</span>
              </div>
            </div>
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'https://frontend-iota-six-33.vercel.app'}/dashboard" class="cta">Go to Your Dashboard</a>
            </p>
            <p>We are committed to making legal help accessible, affordable, and understandable for everyone in Nepal. If you have any questions, our AI assistant is always ready to help!</p>
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
    console.log(`Welcome email sent to ${user.email}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
};

const sendLawyerRegistrationEmail = async (lawyer) => {
  const mailOptions = {
    from: `"KanoonSathi" <${process.env.SMTP_USER}>`,
    to: lawyer.email,
    subject: 'Application Received — KanoonSathi',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%); padding: 40px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; }
          .content { padding: 40px; }
          .clock-icon { width: 80px; height: 80px; background: #F59E0B; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
          .clock-icon svg { width: 40px; height: 40px; color: white; }
          h2 { color: #1E293B; margin: 0 0 20px; font-size: 24px; text-align: center; }
          p { color: #64748B; line-height: 1.8; margin: 0 0 16px; }
          .info-box { background: #FEF3C7; border-radius: 12px; padding: 24px; margin: 24px 0; }
          .info-box p { color: #92400E; margin: 0; }
          .footer { background: #1E3A5F; padding: 24px; text-align: center; }
          .footer p { color: rgba(255,255,255,0.8); font-size: 14px; margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Received!</h1>
            <p>Thank You for Joining KanoonSathi</p>
          </div>
          <div class="content">
            <div class="clock-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"></path>
              </svg>
            </div>
            <h2>Dear ${lawyer.name},</h2>
            <p>We have received your application to join KanoonSathi as a ${lawyer.specialization} lawyer. Our team is reviewing your documents and credentials.</p>
            <div class="info-box">
              <p><strong>Your application is currently under review.</strong></p>
              <p style="margin-top: 8px;">Once approved, you will receive an email notification with instructions to access your lawyer dashboard and start receiving client appointments.</p>
            </div>
            <p><strong>What happens next?</strong></p>
            <p>Our admin team will verify your credentials and documents. This process typically takes 1-2 business days. You will be notified via email once your account is approved.</p>
            <p>If you have any questions in the meantime, please reach out to our support team at support@kanoonsathi.np</p>
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
    console.log(`Lawyer registration acknowledgment sent to ${lawyer.email}`);
  } catch (error) {
    console.error('Error sending lawyer registration email:', error);
  }
};

module.exports = {
  sendUserRegistrationEmail,
  sendLawyerRegistrationEmail,
  sendLawyerApprovalEmail,
  sendLawyerRejectionEmail,
  sendAppointmentConfirmationEmail
};
