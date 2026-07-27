// followup-customer.ts
// Generates the post-service thank-you email HTML for Andrew’s Auto Detail & Car Wash

export function getFollowupEmailHtml(firstName: string): { subject: string; html: string } {
  const subject = "Thank you for choosing Andrew’s Auto Detail & Car Wash";
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; background: #f7f7fa; padding: 0; margin: 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background: #f7f7fa; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); overflow: hidden;">
              <tr>
                <td style="background: #1e293b; padding: 32px 0; text-align: center;">
                  <h1 style="color: #fff; margin: 0; font-size: 2rem; letter-spacing: 1px;">Andrew’s Auto Detail & Car Wash</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px 40px 24px 40px; color: #222; font-size: 1.1rem;">
                  <p style="margin: 0 0 16px 0;">Hello ${firstName},</p>
                  <p style="margin: 0 0 16px 0;">Thank you for choosing Andrew’s Auto Detail & Car Wash for your recent service. We appreciate the opportunity to take care of your vehicle.</p>
                  <p style="margin: 0 0 16px 0;">If you were satisfied with your experience, we would greatly appreciate it if you could take a moment to leave us a review:</p>
                  <ul style="margin: 0 0 16px 24px; padding: 0;">
                    <li style="margin-bottom: 8px;"><a href="https://www.google.com/maps/place//data=!4m3!3m2!1s0x80dd332dce73a7b3:0x818b5457de9ebb8d!12e1?source=g.page.m.kd._&laa=lu-desktop-review-solicitation" style="color: #2563eb; text-decoration: underline;">Google Review</a></li>
                    <li><a href="https://www.yelp.com/biz/andrews-auto-detail-and-car-wash-lakewood" style="color: #2563eb; text-decoration: underline;">Yelp Review</a></li>
                  </ul>
                  <p style="margin: 0 0 16px 0;"><strong>Customer Rewards Program</strong></p>
                  <p style="margin: 0 0 8px 0;">Referral Benefit: Receive $20 off when someone you refer completes a car wash with us. If you were referred by someone, please mention their name in the Notes section when you create your booking.</p>
                  <p style="margin: 0 0 16px 0;">Loyalty Reward: Your 5th car wash is 50% off as a thank you for your continued business.</p>
                  <p style="margin: 0 0 16px 0;">Thank you again for your trust and support.</p>
                  <p style="margin: 0 0 4px 0;">Sincerely,</p>
                  <p style="margin: 0 0 4px 0;">Andrew Dietrich</p>
                  <p style="margin: 0 0 16px 0;">Andrew’s Auto Detail & Car Wash<br>andrewsdetail.com</p>
                </td>
              </tr>
              <tr>
                <td style="background: #f1f5f9; padding: 20px 40px; text-align: center; color: #64748b; font-size: 0.95rem;">
                  &copy; ${new Date().getFullYear()} Andrew’s Auto Detail & Car Wash
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
  return { subject, html };
}
