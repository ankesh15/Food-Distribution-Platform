// Lazy-initialized Twilio client to avoid crashes when env vars are missing

let client = null;

const getClient = () => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }
  if (!client) {
    const twilio = require('twilio');
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
};

// Send SMS notification
const sendSMS = async (to, message) => {
  try {
    const twilioClient = getClient();
    if (!twilioClient) {
      console.log('Twilio credentials not configured, skipping SMS');
      return;
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    console.log('SMS sent successfully:', result.sid);
    return result;
  } catch (error) {
    console.error('SMS sending error:', error);
    // Don't throw — SMS failures shouldn't break the app
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