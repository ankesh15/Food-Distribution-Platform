const nodemailer = require('nodemailer');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let transporter;

// Create transporter
const createTransporter = () => {
  // Check if email configuration is complete
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    if (process.env.NODE_ENV !== 'test') console.warn('Email is not configured');
    return null;
  }

  if (!transporter) transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: Number(process.env.EMAIL_PORT || 587) === 465,
    requireTLS: process.env.NODE_ENV === 'production' && Number(process.env.EMAIL_PORT || 587) !== 465,
    connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000,
    disableFileAccess: true, disableUrlAccess: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
  return transporter;
};

// Send welcome email
const sendWelcomeEmail = async (email, firstName) => {
  try {
    const transporter = createTransporter();
    
    // If email is not configured, skip sending
    if (!transporter) {
      console.log('Email service not configured, skipping welcome email');
      return false;
    }
    
    const mailOptions = {
      from: `"Food Distribution Platform" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Food Distribution Platform!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">Welcome to Food Distribution Platform!</h2>
          <p>Hi ${escapeHtml(firstName)},</p>
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

    const result = await transporter.sendMail(mailOptions);
    return Array.isArray(result.accepted) ? result.accepted.length > 0 : Boolean(result.messageId);
  } catch (error) {
    console.error('Welcome email failed:', error.name);
    // Don't throw error, just log it
    console.log('Continuing without email service');
  }
};

// Send donation notification to nearby recipients
const sendDonationNotification = async (recipients, donation) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.log('Email service not configured, skipping donation notification');
      return false;
    }
    
    const mailOptions = {
      from: `"Food Distribution Platform" <${process.env.EMAIL_USER}>`,
      bcc: recipients.map(r => r.email),
      subject: 'New Food Donation Available in Your Area!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">New Food Donation Available!</h2>
          <p>A new food donation has been posted in your area:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3>${escapeHtml(donation.title)}</h3>
            <p><strong>Description:</strong> ${escapeHtml(donation.description)}</p>
            <p><strong>Food Type:</strong> ${escapeHtml(donation.foodType)}</p>
            <p><strong>Quantity:</strong> ${donation.quantity.amount} ${escapeHtml(donation.quantity.unit)}</p>
            <p><strong>Pickup Window:</strong> ${new Date(donation.pickupWindow.startTime).toLocaleString()} - ${new Date(donation.pickupWindow.endTime).toLocaleString()}</p>
            <p><strong>Location:</strong> ${escapeHtml(donation.location.address.street)}, ${escapeHtml(donation.location.address.city)}, ${escapeHtml(donation.location.address.state)}</p>
          </div>
          <p>Log in to your account to claim this donation!</p>
          <p>Best regards,<br>The Food Distribution Platform Team</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    return Array.isArray(result.accepted) ? result.accepted.length > 0 : Boolean(result.messageId);
  } catch (error) {
    console.error('Error sending donation notification:', error.message);
  }
};

// Send claim notification to donor
const sendClaimNotification = async (donor, donation, recipient) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.log('Email service not configured, skipping claim notification');
      return false;
    }
    
    const mailOptions = {
      from: `"Food Distribution Platform" <${process.env.EMAIL_USER}>`,
      to: donor.email,
      subject: 'Your Food Donation Has Been Claimed!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">Donation Claimed!</h2>
          <p>Great news! Your food donation has been claimed by a recipient.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3>${escapeHtml(donation.title)}</h3>
            <p><strong>Claimed by:</strong> ${escapeHtml(recipient.profile.firstName)} ${escapeHtml(recipient.profile.lastName)}</p>
            <p><strong>Organization:</strong> ${escapeHtml(recipient.profile.organization || 'N/A')}</p>
            <p><strong>Claimed at:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p>Please prepare the donation for pickup during the scheduled window.</p>
          <p>Thank you for helping reduce food waste!</p>
          <p>Best regards,<br>The Food Distribution Platform Team</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    return Array.isArray(result.accepted) ? result.accepted.length > 0 : Boolean(result.messageId);
  } catch (error) {
    console.error('Error sending claim notification:', error.message);
  }
};

// Send pickup reminder
const sendPickupReminder = async (donation, recipient) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.log('Email service not configured, skipping pickup reminder');
      return false;
    }
    
    const mailOptions = {
      from: `"Food Distribution Platform" <${process.env.EMAIL_USER}>`,
      to: recipient.email,
      subject: 'Reminder: Food Donation Pickup Today',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">Pickup Reminder</h2>
          <p>This is a friendly reminder about your scheduled food donation pickup.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3>${escapeHtml(donation.title)}</h3>
            <p><strong>Pickup Window:</strong> ${new Date(donation.pickupWindow.startTime).toLocaleString()} - ${new Date(donation.pickupWindow.endTime).toLocaleString()}</p>
            <p><strong>Location:</strong> ${escapeHtml(donation.location.address.street)}, ${escapeHtml(donation.location.address.city)}, ${escapeHtml(donation.location.address.state)}</p>
            <p><strong>Special Instructions:</strong> ${escapeHtml(donation.location.instructions || 'None')}</p>
          </div>
          <p>Please arrive within the pickup window to ensure the food is still available.</p>
          <p>Best regards,<br>The Food Distribution Platform Team</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    return Array.isArray(result.accepted) ? result.accepted.length > 0 : Boolean(result.messageId);
  } catch (error) {
    console.error('Error sending pickup reminder:', error.message);
  }
};

module.exports = {
  sendWelcomeEmail,
  sendDonationNotification,
  sendClaimNotification,
  sendPickupReminder
}; 