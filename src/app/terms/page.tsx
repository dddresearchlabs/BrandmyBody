import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms · Brand my Body",
  description: "Terms of use for Brand my Body.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" description="Last updated September 2, 2026.">
      <p>
        These terms govern your use of Brand my Body (the “site”), including
        browsing, listing a body, bidding, and paying. By creating an account,
        listing, or placing a bid, you agree to them. If you do not agree, do
        not use the site.
      </p>

      <h2>The service</h2>
      <p>
        Brand my Body is a marketplace where people list their bodies and brands
        bid on logo spots. Winning logos are meant to be printed as ink tattoos
        and worn for the listing’s stated wear time. A spot is paid placement.
        It is not an endorsement, not employment, and not a promise of
        impressions, followers, or any particular audience.
      </p>

      <h2>Eligibility</h2>
      <p>
        You must be at least 18 years old. Listers must be able to enter a
        payout agreement with Stripe. You are responsible for following tattoo,
        advertising, and tax laws that apply to you.
      </p>

      <h2>Accounts</h2>
      <p>
        You need an account to list or connect payouts. Keep your login details
        to yourself. We may suspend or close an account that breaks these terms
        or creates risk for other users.
      </p>

      <h2>Listings</h2>
      <p>
        If you list a body, you promise that the photos and details are yours to
        publish, that you can wear the winning logos for the wear time you
        choose, and that you will complete placements for spots that close with
        a paid winner. You may remove a live listing; live deposits are then
        refunded. You may close early only when there are no live bids. We may
        remove a listing or refuse a bid that we find offensive, unlawful, or
        otherwise unfit.
      </p>

      <h2>Bidding and deposits</h2>
      <p>
        A bid must beat the current price by $25. When you bid, you pay a 20%
        deposit through Stripe Checkout. That deposit stays on the platform. It
        is refunded if you are outbid or if the listing is removed before close.
        A bid in the last 10 minutes extends close by 10 minutes. Unpaid
        checkout sessions do not create a bid. Paid bids can appear on the
        listing with the brand name and logo.
      </p>

      <h2>Close, remaining payment, and fees</h2>
      <p>
        When a listing closes, each live high bid wins that spot. The winner
        owes the remaining 80% of the bid. We send a payment link (and email it
        when email is configured). The winner has 7 days to pay. If they do not,
        they forfeit the 20% deposit; it is not refunded, and the remaining
        payment is cancelled. Outbid bids are not charged the remaining 80%.
      </p>
      <p>
        There is no platform fee on the deposit. On the remaining payment we
        take 10% of the full winning bid. Payouts to listers run through Stripe
        Connect. Stripe’s fees may also apply. Amounts are in US dollars.
      </p>

      <h2>Logos and messages</h2>
      <p>
        Logos and bidder messages must be lawful and not offensive. We can
        refuse any bid or logo. You grant Brand my Body and the lister a
        license to display the logo on the site and, if you win, on the body
        for the wear period, including photos and video of the placement.
      </p>

      <h2>Payments</h2>
      <p>
        Payments are processed by Stripe. We do not store full card numbers.
        Refunds of deposits follow the rules above and Stripe’s processing
        times. Chargebacks and disputes may reverse a payout or deposit.
      </p>

      <h2>No professional advice</h2>
      <p>
        The site is a marketplace, not a law firm, bank, or medical service.
        Listings and bids are between listers and bidders. We are not a party
        to the tattoo itself beyond operating the auction and payment flow
        described here.
      </p>

      <h2>Disclaimers</h2>
      <p>
        The site is provided as is. We do not warrant uninterrupted access,
        that a listing will meet a price goal, or that a winner will pay the
        remaining 80% on time. To the fullest extent allowed by law, Brand my
        Body is not liable for lost profits, lost data, or indirect damages,
        and our total liability for a claim is limited to the fees we actually
        received on the related listing in the 12 months before the claim.
      </p>

      <h2>Indemnity</h2>
      <p>
        You will defend and hold harmless Brand my Body from claims that arise
        from your listings, bids, logos, messages, or your breach of these
        terms.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. The date at the top is the latest version.
        Continued use after a change means you accept the new terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: use the site while signed in, or write to
        us at the email on your account. See also our{" "}
        <a href="/privacy">Privacy policy</a>.
      </p>
    </LegalPage>
  );
}
