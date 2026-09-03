import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy · Brand my Body",
  description: "Privacy policy for Brand my Body.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" description="Last updated September 2, 2026.">
      <p>
        This policy describes how Brand my Body collects, uses, and shares
        information when you use the site. Payments are handled by Stripe. See
        also our <a href="/terms">Terms of use</a>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          Account: email address, login session, and optional name on the
          account.
        </li>
        <li>
          Listings: display name, photos you upload, social links, spot prices,
          wear time, auction length, and Connect payout status.
        </li>
        <li>
          Bids: brand name, bid amount, optional website and X handle, optional
          message to the lister, logo file, and payment identifiers from
          Stripe (Checkout session and PaymentIntent ids). We do not store full
          card numbers.
        </li>
        <li>
          Technical: cookies needed to keep you signed in, and standard server
          logs (IP address, browser, pages) from our host.
        </li>
      </ul>

      <h2>How we use it</h2>
      <p>
        We use this information to run the marketplace: create listings, take
        deposits, refund outbid or removed bids, close auctions, email winners
        a payment link, show live bids and logos, prevent abuse, and improve
        the site. We do not sell your personal information.
      </p>

      <h2>What is public</h2>
      <p>
        Live and closed listings are public: display name, photos, socials,
        time left, current bid amount, winning brand name, and paid logos.
        Bidder email and the optional message to the lister are not shown on
        the public listing. The lister can see the message on their Account
        page. Winner email is used to send the remaining-balance payment link.
      </p>

      <h2>Processors</h2>
      <p>We use other companies to operate the site:</p>
      <ul>
        <li>
          <a href="https://stripe.com/privacy">Stripe</a> — Checkout, refunds,
          Payment Links, and Connect payouts.
        </li>
        <li>
          <a href="https://supabase.com/privacy">Supabase</a> — database, login,
          and file storage (photos and logos).
        </li>
        <li>
          <a href="https://vercel.com/legal/privacy-policy">Vercel</a> — hosting
          and delivery of the site.
        </li>
        <li>
          <a href="https://resend.com/legal/privacy-policy">Resend</a> — winner
          payment emails, when that is configured.
        </li>
      </ul>
      <p>
        Those providers process data under their own policies. Card details go
        to Stripe, not to our servers.
      </p>

      <h2>Cookies</h2>
      <p>
        We use cookies and similar storage to keep your session after login and
        to finish magic-link sign-in. We do not use advertising cookies.
      </p>

      <h2>Retention</h2>
      <p>
        We keep account, listing, and bid records as long as needed to run
        payouts, refunds, and disputes, then for a reasonable period for
        records and legal claims. You may ask us to close your account. We may
        keep information we must retain (for example paid bids and Stripe ids).
      </p>

      <h2>Your choices</h2>
      <p>
        You can update listing details you control, remove a listing that is
        still live (which refunds live deposits), and log out. To access,
        correct, or delete personal information we hold, contact us from the
        email on your account. You can also use rights available under laws
        that apply to you (for example access or deletion requests).
      </p>

      <h2>Children</h2>
      <p>
        The site is not for anyone under 18. We do not knowingly collect
        personal information from children.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy. The date at the top is the latest version.
        Continued use after a change means you accept the new policy.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions: use the site while signed in, or write to us at the
        email on your account.
      </p>
    </LegalPage>
  );
}
