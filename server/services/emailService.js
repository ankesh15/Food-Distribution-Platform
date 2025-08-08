const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  // Check if email configuration is complete
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Email configuration incomplete, skipping email service');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS.trim(), // Trim any whitespace
    },
  });
};

// Send welcome email
const sendWelcomeEmail = async (email, firstName) => {
  try {
    const transporter = createTransporter();
    
    // If email is not configured, skip sending
    if (!transporter) {
      console.log('Email service not configured, skipping welcome email');
      return;
    }
    
    const mailOptions = {
      from: `"Food Distribution Platform" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Food Distribution Platform!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">Welcome to Food Distribution Platform!</h2>
          <p>Hi ${firstName},</p>
          <p>Thank you for joining our community dedicated to reducing food waste and helping those in need.</p>
          <p>You can now:</p>
          <ul>
            <li>Create and manage food donation posts</li>
            <li>Browse available donations in your area</li>
            <li>Connect with local organizations</li>
            <li>Track your donation history</li>
          </ul>
          <p>If you have any questions, feel free to reach out to our support team.</p>
          <p>Best regards,<br>The Food Distribution Platform Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent to:', email);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error, just log it
    console.log('Continuing without email service');
  }
};

// Send donation notification to nearby recipients
const sendDonationNotification = async (recipients, donation) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Food Distribution Platform" <${process.env.EMAIL_USER}>`,
      bcc: recipients.map(r => r.email),
      subject: 'New Food Donation Available in Your Area!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">New Food Donation Available!</h2>
          <p>A new food donation has been posted in your area:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3>${donation.title}</h3>
            <p><strong>Description:</strong> ${donation.description}</p>
            <p><strong>Food Type:</strong> ${donation.foodType}</p>
            <p><strong>Quantity:</strong> ${donation.quantity.amount} ${donation.quantity.unit}</p>
            <p><strong>Pickup Window:</strong> ${new Date(donation.pickupWindow.startTime).toLocaleString()} - ${new Date(donation.pickupWindow.endTime).toLocaleString()}</p>
            <p><strong>Location:</strong> ${donation.location.address.street}, ${donation.location.address.city}, ${donation.location.address.state}</p>
          </div>
          <p>Log in to your account to claim this donation!</p>
          <p>Best regards,<br>The Food Distribution Platform Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Donation notification sent to', recipients.length, 'recipients');
  } catch (error) {
    console.error('Error sending donation notification:', error);
    throw error;
  }
};

// Send claim notification to donor
const sendClaimNotification = async (donor, donation, recipient) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Food Distribution Platform" <${process.env.EMAIL_USER}>`,
      to: donor.email,
      subject: 'Your Food Donation Has Been Claimed!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">Donation Claimed!</h2>
          <p>Great news! Your food donation has been claimed by a recipient.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3>${donation.title}</h3>
            <p><strong>Claimed by:</strong> ${recipient.profile.firstName} ${recipient.profile.lastName}</p>
            <p><strong>Organization:</strong> ${recipient.profile.organization || 'N/A'}</p>
            <p><strong>Claimed at:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p>Please prepare the donation for pickup during the scheduled window.</p>
          <p>Thank you for helping reduce food waste!</p>
          <p>Best regards,<br>The Food Distribution Platform Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Claim notification sent to donor:', donor.email);
  } catch (error) {
    console.error('Error sending claim notification:', error);
    throw error;
  }
};

// Send pickup reminder
const sendPickupReminder = async (donation, recipient) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Food Distribution Platform" <${process.env.EMAIL_USER}>`,
      to: recipient.email,
      subject: 'Reminder: Food Donation Pickup Today',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">Pickup Reminder</h2>
          <p>This is a friendly reminder about your scheduled food donation pickup.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3>${donation.title}</h3>
            <p><strong>Pickup Window:</strong> ${new Date(donation.pickupWindow.startTime).toLocaleString()} - ${new Date(donation.pickupWindow.endTime).toLocaleString()}</p>
            <p><strong>Location:</strong> ${donation.location.address.street}, ${donation.location.address.city}, ${donation.location.address.state}</p>
            <p><strong>Special Instructions:</strong> ${donation.location.instructions || 'None'}</p>
          </div>
          <p>Please arrive within the pickup window to ensure the food is still available.</p>
          <p>Best regards,<br>The Food Distribution Platform Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Pickup reminder sent to:', recipient.email);
  } catch (error) {
    console.error('Error sending pickup reminder:', error);
    throw error;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendDonationNotification,
  sendClaimNotification,
  sendPickupReminder
}; 