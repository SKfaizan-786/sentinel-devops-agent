const express = require('express');
const router = express.Router();

// Try to require nodemailer, but make it optional
let nodemailer;
let transporter = null;

try {
  nodemailer = require('nodemailer');
  
  // Configure nodemailer (update with actual email service)
  // For demo, we'll just log the message
  if (process.env.EMAIL_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
} catch (err) {
  console.log('Note: nodemailer is not installed. Email sending is disabled.');
  console.log('To enable email notifications, install nodemailer: npm install nodemailer');
}

/**
 * POST /api/contact
 * Handle contact form submissions
 */
router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required',
      });
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address',
      });
    }

    // Message length validation
    if (message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Message must be at least 10 characters long',
      });
    }

    // Log the message (for demo purposes)
    console.log('New Contact Form Submission:');
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Message: ${message}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('---');

    // If email is configured, send email
    if (transporter) {
      try {
        // Send email to admin
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || 'noreply@sentinel-devops.com',
          to: process.env.CONTACT_EMAIL_TO || 'contact@sentinel-devops.com',
          subject: `New Contact Form: ${subject}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
          `,
        });

        // Send confirmation email to user
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || 'noreply@sentinel-devops.com',
          to: email,
          subject: 'We received your message - Sentinel DevOps',
          html: `
            <h2>Thank you for contacting us!</h2>
            <p>Hi ${name},</p>
            <p>We have received your message and will get back to you as soon as possible.</p>
            <p><strong>Your submission details:</strong></p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
            <br>
            <p>Best regards,<br>The Sentinel Team</p>
          `,
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Continue even if email fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'Thank you for your message. We will get back to you soon!',
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while processing your request. Please try again later.',
    });
  }
});

module.exports = router;
