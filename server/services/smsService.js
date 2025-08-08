const twilio = require('twilio');

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Send SMS notification
const sendSMS = async (to, message) => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log('Twilio credentials not configured, skipping SMS');
      return;
    }

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    console.log('SMS sent successfully:', result.sid);
    return result;
  } catch (error) {
    console.error('SMS sending error:', error);
    throw error;
  }
};

// Send donation notification SMS
const sendDonationNotificationSMS = async (recipient, donation) => {
  try {
    const message = `New food donation available: ${donation.title} - ${donation.quantity.amount} ${donation.quantity.unit} of ${donation.foodType}. Pickup window: ${new Date(donation.pickupWindow.startTime).toLocaleString()}. Log in to claim!`;
    
    await sendSMS(recipient.profile.phone, message);
  } catch (error) {
    console.error('Donation notification SMS error:', error);
  }
};

// Send claim notification SMS
const sendClaimNotificationSMS = async (donor, donation, recipient) => {
  try {
    const message = `Your donation "${donation.title}" has been claimed by ${recipient.profile.firstName} ${recipient.profile.lastName}. Please prepare for pickup during the scheduled window.`;
    
    await sendSMS(donor.profile.phone, message);
  } catch (error) {
    console.error('Claim notification SMS error:', error);
  }
};

// Send pickup reminder SMS
const sendPickupReminderSMS = async (recipient, donation) => {
  try {
    const message = `Reminder: Your food donation pickup is scheduled for today. Donation: ${donation.title}. Pickup window: ${new Date(donation.pickupWindow.startTime).toLocaleString()} - ${new Date(donation.pickupWindow.endTime).toLocaleString()}.`;
    
    await sendSMS(recipient.profile.phone, message);
  } catch (error) {
    console.error('Pickup reminder SMS error:', error);
  }
};

// Send urgent reminder SMS
const sendUrgentReminderSMS = async (user, message) => {
  try {
    await sendSMS(user.profile.phone, message);
  } catch (error) {
    console.error('Urgent reminder SMS error:', error);
  }
};

module.exports = {
  sendSMS,
  sendDonationNotificationSMS,
  sendClaimNotificationSMS,
  sendPickupReminderSMS,
  sendUrgentReminderSMS
}; 