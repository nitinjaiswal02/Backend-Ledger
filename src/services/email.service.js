require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Backend Ledger" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

async function sendRegistrationEmail(to, name) {
  const subject = 'Welcome to Backend Ledger!';
  const text = `Hi ${name},\n\nThank you for registering with Backend Ledger. We're excited to have you on board!\n\nBest regards,\nThe Backend Ledger Team`;
  const html = `<p>Hi ${name},</p><p>Thank you for registering with Backend Ledger. We're excited to have you on board!</p><p>Best regards,<br>The Backend Ledger Team</p>`;

  await sendEmail(to, subject, text, html);
}

async function sendTransactionEmail(userEmail,name,amount,toAccount){
  const subject = "Transaction Successful";
  const text = `Hi ${name},

Your transaction of ₹${amount} to ${toAccount} was completed successfully.

Best regards,
The Backend Ledger Team`;

  const html = `
    <p>Hi ${name},</p>
    <p>Your transaction of <strong>₹${amount}</strong> to <strong>${toAccount}</strong> was completed successfully.</p>
    <p>Best regards,<br>The Backend Ledger Team</p>
  `;

  await sendEmail(userEmail, subject, text, html);

}

async function sendTransactionFailureEmail(userEmail,name,amount,toAccount){
    const subject = "Transaction Failed";

  const text = `Hi ${name},

Your transaction of ₹${amount} to ${toAccount} could not be completed.

Please try again later.

Best regards,
The Backend Ledger Team`;

  const html = `
    <p>Hi ${name},</p>
    <p>Your transaction of <strong>₹${amount}</strong> to <strong>${toAccount}</strong> could not be completed.</p>
    <p>Please try again later.</p>
    <p>Best regards,<br>The Backend Ledger Team</p>
  `;

  await sendEmail(userEmail, subject, text, html);
  
}

module.exports = {
  sendRegistrationEmail,
  sendTransactionEmail,
  sendTransactionFailureEmail,
};
