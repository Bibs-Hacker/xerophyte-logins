const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

admin.initializeApp();
const db = admin.firestore();

const SENDGRID_API_KEY = functions.config().sendgrid?.key; // set via `firebase functions:config:set sendgrid.key="..."`
if (SENDGRID_API_KEY) sgMail.setApiKey(SENDGRID_API_KEY);

/**
 * Callable function: sendSignInEmail
 * Expects { uid, email, name }
 */
exports.sendSignInEmail = functions.https.onCall(async (data, context) => {
  try {
    // Basic validation
    if (!data || !data.email || !data.uid) {
      return { success: false, error: 'Missing parameters.' };
    }

    // Optionally: ensure the caller is the same user (if you require auth)
    // if (!context.auth || context.auth.uid !== data.uid) {
    //   return { success: false, error: 'Not authorized.' };
    // }

    const name = data.name || '';
    const email = data.email;

    // Compose warm & personal message — your chosen tone
    const subject = 'Successful Sign-In Confirmation';
    const plain = `
Hey ${name || ''},

Your login to Xenocrypt (Tech Brian Team) was successful — we’re glad to have you here.

If this wasn’t you, please ignore this message or secure your account.

Cheers,
The Xenocrypt Team/ Merabs' Team🥰
    `;

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; color:#111;">
        <h2>Hey ${name || ''},</h2>
        <p>Your login to <strong>Xenocrypt (Tech Brian Team)</strong> was successful — we’re glad to have you here.</p>
        <p>If this wasn’t you, please ignore this message or secure your account.</p>
        <p style="margin-top:18px;">Cheers,<br/><strong>The Xenocrypt Team/Merabs, Team🥰</strong></p>
      </div>
    `;

    // If sendgrid configured, use it. Otherwise return an error instructing to set up sendgrid.
    if (!SENDGRID_API_KEY) {
      console.warn('SendGrid API key not set.');
      return { success: false, error: 'SendGrid not configured on functions. Run: firebase functions:config:set sendgrid.key="YOUR_KEY"' };
    }

    const msg = {
      to: email,
      from: 'no-reply@xenocrypt.app', // must be a verified sender in SendGrid
      subject,
      text: plain,
      html
    };

    await sgMail.send(msg);

    // record that a sign-in email was sent (optional)
    await db.collection('emailLogs').add({
      type: 'signInConfirmation',
      uid: data.uid,
      email,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (err) {
    console.error('Error sending sign-in email:', err);
    return { success: false, error: err.message || String(err) };
  }
});
