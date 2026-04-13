'use client'

import React from 'react'
import '../terms-of-service/terms.css'

const LAST_MODIFIED = 'April 13, 2026'

export default function PrivacyPolicyPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <a href="/" className="legal-back">
          &larr; Back to Ring Wallet
        </a>
        <h1 className="legal-title">Ring Labs Privacy Policy</h1>
        <p className="legal-date">Last modified: {LAST_MODIFIED}</p>

        <p>
          This Privacy Policy (the &ldquo;Policy&rdquo;) explains how BOTBOT
          LTD. (&ldquo;Ring Labs&rdquo;, the &ldquo;Company&rdquo;,
          &ldquo;we&rdquo;, &ldquo;us&rdquo; or &ldquo;our&rdquo;) collects,
          uses, and shares data in connection with Ring Wallet, a self-custody
          cryptocurrency wallet available as a progressive web application at{' '}
          <a href="https://wallet.ring.exchange">
            https://wallet.ring.exchange
          </a>{' '}
          and as a browser extension, and all of our other properties, products,
          and services (the &ldquo;Services&rdquo;). Your use of the Services is
          subject to this Policy as well as our{' '}
          <a href="/terms-of-service">Terms of Service</a>.
        </p>

        <h2>High Level Summary</h2>
        <ul className="legal-summary-list">
          <li>
            Ring Labs is an incorporated company based in the United States.
            Ring Labs complies with applicable U.S. laws and regulations.
          </li>
          <li>
            Ring Wallet is a self-custody wallet. Your private keys and master
            seed are generated and stored locally on your device. Ring Labs
            never has access to, stores, or transmits your private keys, master
            seed, or Passkey credentials.
          </li>
          <li>
            Ring Labs does not collect and store personal data such as first
            name, last name, street address, date of birth, or similar
            identifying profile data in connection with normal use of the
            Services.
          </li>
          <li>
            Ring Labs collects non-identifiable data such as limited off-chain
            data (for example, browser type and device context) to improve
            products and user experience.
          </li>
          <li>
            When you submit a blockchain transaction, your wallet address is
            shared with the RPC provider that processes the request. This is
            inherent to how blockchain networks operate and is not controlled by
            Ring Labs.
          </li>
          <li>
            If you sign up for emails, Ring Labs stores your email address for
            those communications. You can unsubscribe at any time.
          </li>
          <li>
            Material privacy updates are reflected in an updated privacy policy.
          </li>
        </ul>

        <h2>Data We Collect</h2>
        <p>
          Privacy is central to everything we do at the Company. Ring Wallet is
          designed as a self-custody wallet where sensitive cryptographic
          material never leaves your device. We do not maintain user accounts
          and do not collect or store personal data such as your name or
          internet protocol (&ldquo;IP&rdquo;) address.
        </p>

        <h3>What We Do NOT Collect</h3>
        <p>
          Ring Wallet is architected so that the following data never reaches
          Ring Labs servers:
        </p>
        <ul className="legal-list">
          <li>
            <strong>Private keys and master seed.</strong> Your cryptographic
            keys are derived locally in the browser from your master seed and
            held in memory only during your active session. They are never
            transmitted to any server.
          </li>
          <li>
            <strong>Passkey credentials.</strong> Your WebAuthn Passkey
            credential (including the embedded master seed) is managed by your
            device&rsquo;s platform authenticator and/or cloud keychain. Ring
            Labs does not have access to this data.
          </li>
          <li>
            <strong>Mnemonic phrases.</strong> Ring Wallet does not use or
            generate mnemonic seed phrases.
          </li>
          <li>
            <strong>Transaction signing data.</strong> All transaction signing
            occurs locally on your device. The signed transaction is broadcast
            directly to the blockchain network via RPC providers.
          </li>
        </ul>

        <h3>What We May Collect</h3>
        <p>When you interact with the Services, we may collect:</p>
        <ul className="legal-list">
          <li>
            <strong>Publicly-available blockchain data.</strong> When you use
            the Wallet to interact with blockchain networks, your
            publicly-available blockchain address and transaction data become
            part of the public blockchain ledger. We may access this
            publicly-available data to provide features of the Services. Note
            that blockchain addresses are publicly-available data that are not
            created or assigned by us or any central party, and by themselves
            are not personally identifying.
          </li>
          <li>
            <strong>
              Information from localStorage and similar technologies.
            </strong>{' '}
            The Wallet stores certain preferences and non-sensitive data in your
            browser&rsquo;s localStorage, including: your preferred language,
            selected chain, COSE-format public key for signature verification,
            and imported token addresses. This data remains on your device and
            is not transmitted to Ring Labs servers.
          </li>
          <li>
            <strong>Device and browser information.</strong> We may collect
            non-identifiable device context such as browser type, browser
            version, operating system, device type, and screen resolution to
            improve the Services and diagnose technical issues. We group and
            analyze this data in aggregate, not as individual user profiles.
          </li>
          <li>
            <strong>Information from other sources.</strong> We may receive
            information about wallet addresses or transactions made through the
            Services from our service providers in order to comply with our
            legal obligations and prevent the use of our Services in connection
            with fraudulent or other illicit activities.
          </li>
          <li>
            <strong>Correspondence.</strong> We will receive any communications
            and information you provide directly to us via email, customer
            support, social media, or another support channel (such as Twitter
            or Discord), or when you participate in any surveys or
            questionnaires.
          </li>
          <li>
            <strong>Information you specifically provide us.</strong> If you
            specifically provide us with information (such as your email
            address), we may use that information for the purposes described
            when you provide it to us. We will not attempt to link any
            information you provide to your wallet address, IP address, or other
            personal data. You do not need to provide us with any personal data
            to use the Services.
          </li>
        </ul>

        <h2>How We Use Data</h2>
        <p>
          We use the data we collect in accordance with your instructions,
          including any applicable terms in our{' '}
          <a href="/terms-of-service">Terms of Service</a>, and as required by
          law. We may also use data for the following purposes:
        </p>
        <ul className="legal-list">
          <li>
            <strong>Providing the Services.</strong> We use the data we collect
            to provide, maintain, customize and improve our Services and
            features of our Services.
          </li>
          <li>
            <strong>Customer support.</strong> We may use information to provide
            customer support for and answer inquiries about the Services.
          </li>
          <li>
            <strong>Safety and security.</strong> We may use data to protect
            against, investigate, and stop fraudulent, unauthorized, or illegal
            activity. We may also use it to address security risks, solve
            potential security issues such as bugs, enforce our agreements, and
            protect our users and Company.
          </li>
          <li>
            <strong>Legal compliance.</strong> We may use the information we
            collect as needed or requested by regulators, government entities,
            and law enforcement to comply with applicable laws and regulations.
          </li>
          <li>
            <strong>Aggregated data.</strong> We may use some of the information
            we collect or access to compile aggregated data that helps us learn
            more about how users use the Services and where we can improve your
            experience.
          </li>
        </ul>

        <h2>How We Share Data</h2>
        <p>We may share or disclose the data we collect:</p>
        <ul className="legal-list">
          <li>
            <strong>With RPC providers.</strong> When you submit a blockchain
            transaction or query, your wallet address and transaction data are
            sent to the RPC node provider that processes the request. This is
            inherent to how blockchain networks operate. Ring Labs does not
            control how RPC providers handle this data.
          </li>
          <li>
            <strong>With service providers.</strong> We may share information
            with our service providers and vendors to assist us in providing,
            delivering, and improving the Services.
          </li>
          <li>
            <strong>To comply with our legal obligations.</strong> We may share
            your data in the course of litigation, regulatory proceedings,
            compliance measures, and when compelled by subpoena, court order, or
            other legal procedure. We may also share data when we believe it is
            necessary to prevent harm to our users, our Company, or others, and
            to enforce our agreements and policies, including our{' '}
            <a href="/terms-of-service">Terms of Service</a>.
          </li>
          <li>
            <strong>Safety and security.</strong> We may share data to protect
            against, investigate, and stop fraudulent, unauthorized, or illegal
            activity. We may also use it to address security risks, solve
            potential security issues such as bugs, enforce our agreements, and
            protect our users, Company, and ecosystem.
          </li>
          <li>
            <strong>Business changes.</strong> We may transfer or share data to
            another entity in the event of a merger, acquisition, bankruptcy,
            dissolution, reorganization, asset or stock sale, or other business
            transaction.
          </li>
          <li>
            <strong>With your consent.</strong> We may share your information
            any other time you provide us with your consent to do so.
          </li>
        </ul>
        <p>
          We do not share your information with any third parties for any
          marketing purposes whatsoever.
        </p>

        <h2>Third-Party Cookies</h2>
        <p>
          We may use services provided by Google and other third parties that
          use tracking technology such as cookies, deviceID, and localStorage,
          to collect information about your use of the Services and our
          interactions with you. You can opt out of having your online activity
          and device data collected through these third-party services,
          including by:
        </p>
        <ul className="legal-list">
          <li>
            Blocking cookies in your browser by following the instructions in
            your browser settings. For more information about cookies, including
            how to see the cookies on your device, manage them, and delete them,
            visit www.allaboutcookies.org.
          </li>
          <li>
            Blocking or limiting the use of your advertising ID on your mobile
            device through the device settings.
          </li>
          <li>
            Using privacy plug-ins or browsers. Certain browsers and browser
            extensions can be configured to block third-party cookies and
            trackers.
          </li>
          <li>
            Using the platform opt-out provided by Google at
            https://adssettings.google.com. You can learn more about how Google
            uses your information by reviewing Google&rsquo;s privacy policy at
            https://policies.google.com/privacy.
          </li>
          <li>
            Using advertising industry opt-out tools on each device or browser
            where you use the Services, available at http://optout.aboutads.info
            and http://optout.networkadvertising.org.
          </li>
        </ul>

        <h2>Third-Party Links and Sites</h2>
        <p>
          We may integrate technologies operated or controlled by other parties
          into parts of the Services. The Wallet&rsquo;s DApp browser allows you
          to access third-party decentralized applications. Please note that
          when you interact with these other parties, including when you access
          DApps through the built-in browser, those parties may independently
          collect information about you and solicit information from you. You
          can learn more about how those parties collect and use your data by
          consulting their privacy policies and other terms.
        </p>

        <h2>Security</h2>
        <p>
          We implement and maintain reasonable administrative, physical, and
          technical security safeguards to help protect data from loss, theft,
          misuse, unauthorized access, disclosure, alteration, and destruction.
          Nevertheless, transmission via the internet is not completely secure
          and we cannot guarantee the security of information about you. You are
          responsible for all of your activity on the Services, including the
          security of your Passkey credentials, blockchain network addresses,
          and the cryptographic keys derived from your master seed.
        </p>

        <h2>Age Requirements</h2>
        <p>
          The Services are intended for a general audience and are not directed
          at children. We do not knowingly receive personal information (as
          defined by the U.S. Children&rsquo;s Privacy Protection Act, or
          &ldquo;COPPA&rdquo;) from children. If you believe we have received
          personal information about a child under the age of 18, please contact
          us at{' '}
          <a href="mailto:hello@ringprotocol.com">hello@ringprotocol.com</a>.
        </p>

        <h2>
          Additional Notice to California Residents (&ldquo;CCPA Notice&rdquo;)
        </h2>
        <p>
          The California Consumer Privacy Act of 2018 (&ldquo;CCPA&rdquo;)
          requires certain businesses to provide a CCPA Notice to California
          residents to explain how we collect, use, and share their personal
          information, and the rights and choices we offer California residents
          regarding our handling of their information.
        </p>
        <ul className="legal-list">
          <li>
            <strong>Privacy Practices.</strong> We do not &ldquo;sell&rdquo;
            personal information as defined under the CCPA. Please review the
            &ldquo;How We Share Data&rdquo; section above for further details
            about the categories of parties with whom we share information.
          </li>
          <li>
            <strong>Privacy Rights.</strong> The CCPA gives individuals the
            right to request information about how we have collected, used, and
            shared your personal information. It also gives you the right to
            request a copy of any information we may maintain about you. You may
            also ask us to delete any personal information that we may have
            received about you. Please note that the CCPA limits these rights,
            for example, by prohibiting us from providing certain sensitive
            information in response to access requests and limiting the
            circumstances under which we must comply with a deletion request. We
            will respond to requests for information, access, and deletion only
            to the extent we are able to associate, with a reasonable effort,
            the information we maintain with the identifying details you provide
            in your request. If we deny the request, we will communicate the
            decision to you. You are entitled to exercise the rights described
            above free from discrimination.
          </li>
          <li>
            <strong>Submitting a Request.</strong> You can submit a request for
            information, access, or deletion to{' '}
            <a href="mailto:hello@ringprotocol.com">hello@ringprotocol.com</a>.
          </li>
          <li>
            <strong>Identity Verification.</strong> The CCPA requires us to
            collect and verify the identity of any individual submitting a
            request to access or delete personal information before providing a
            substantive response.
          </li>
          <li>
            <strong>Authorized Agents.</strong> California residents can
            designate an &ldquo;authorized agent&rdquo; to submit requests on
            their behalf. We will require the authorized agent to have a written
            authorization confirming their authority.
          </li>
        </ul>

        <h2>Disclosures for European Union Data Subjects</h2>
        <p>
          We process personal data for the purposes described in the section
          titled &ldquo;How We Use Data&rdquo; above. Our bases for processing
          your data include: (i) you have given consent to the process to us or
          our service providers for one or more specific purposes; (ii)
          processing is necessary for the performance of a contract with you;
          (iii) processing is necessary for compliance with a legal obligation;
          and/or (iv) processing is necessary for the purposes of the legitimate
          interests pursued by us or a third party, and your interests and
          fundamental rights and freedoms do not override those interests.
        </p>
        <p>
          Your rights under the General Data Protection Regulation
          (&ldquo;GDPR&rdquo;) include the right to (i) request access and
          obtain a copy of your personal data, (ii) request rectification or
          erasure of your personal data, (iii) object to or restrict the
          processing of your personal data; and (iv) request portability of your
          personal data. Additionally, you may withdraw your consent to our
          collection at any time. Nevertheless, we cannot edit or delete
          information that is stored on a particular blockchain. Information
          such as your transaction data, blockchain wallet address, and assets
          held by your address that may be related to the data we collect is
          beyond our control.
        </p>
        <p>
          To exercise any of your rights under the GDPR, please contact us at{' '}
          <a href="mailto:hello@ringprotocol.com">hello@ringprotocol.com</a>. We
          may require additional information from you to process your request.
          Please note that we may retain information as necessary to fulfill the
          purpose for which it was collected and may continue to do so even
          after a data subject request in accordance with our legitimate
          interests, including to comply with our legal obligations, resolve
          disputes, prevent fraud, and enforce our agreements.
        </p>

        <h2>Changes to this Policy</h2>
        <p>
          If we make material changes to this Policy, we will notify you via the
          Services. Nevertheless, your continued use of the Services reflects
          your periodic review of this Policy and other Company terms, and
          indicates your consent to them.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have any questions about this Policy or how we collect, use, or
          share your information, please contact us at{' '}
          <a href="mailto:hello@ringprotocol.com">hello@ringprotocol.com</a>.
        </p>
      </div>
    </div>
  )
}
