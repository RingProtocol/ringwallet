'use client'

import React from 'react'
import './terms.css'

const LAST_MODIFIED = 'April 13, 2026'

const PROHIBITED_ACTIVITIES = [
  {
    title: 'Intellectual Property Infringement',
    desc: 'Activity that infringes on or violates any copyright, trademark, service mark, patent, right of publicity, right of privacy, or other proprietary or intellectual property rights under the law.',
  },
  {
    title: 'Cyberattack',
    desc: 'Activity that seeks to interfere with or compromise the integrity, security, or proper functioning of any computer, server, network, personal device, or other information technology system, including, but not limited to, the deployment of viruses and denial of service attacks.',
  },
  {
    title: 'Fraud and Misrepresentation',
    desc: 'Activity that seeks to defraud us or any other person or entity, including, but not limited to, providing any false, inaccurate, or misleading information in order to unlawfully obtain the property of another.',
  },
  {
    title: 'Market Manipulation',
    desc: 'Activity that violates any applicable law, rule, or regulation concerning the integrity of trading markets, including, but not limited to, the manipulative tactics commonly known as "rug pulls", pumping and dumping, and wash trading.',
  },
  {
    title: 'Securities and Derivatives Violations',
    desc: 'Activity that violates any applicable law, rule, or regulation concerning the trading of securities or derivatives, including, but not limited to, the unregistered offering of securities and the offering of leveraged and margined commodity products to retail customers in the United States.',
  },
  {
    title: 'Sale of Stolen Property',
    desc: 'Buying, selling, or transferring of stolen items, fraudulently obtained items, items taken without authorization, and/or any other illegally obtained items.',
  },
  {
    title: 'Data Mining or Scraping',
    desc: 'Activity that involves data mining, robots, scraping, or similar data gathering or extraction methods of content or information from any of our Products.',
  },
  {
    title: 'Objectionable Content',
    desc: "Activity that involves soliciting information from anyone under the age of 18 or that is otherwise harmful, threatening, abusive, harassing, tortious, excessively violent, defamatory, vulgar, obscene, pornographic, libelous, invasive of another's privacy, hateful, discriminatory, or otherwise objectionable.",
  },
  {
    title: 'Any Other Unlawful Conduct',
    desc: 'Activity that violates any applicable law, rule, or regulation of the United States or another relevant jurisdiction, including, but not limited to, the restrictions and regulatory requirements imposed by U.S. law.',
  },
]

export default function TermsOfServicePage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <a href="/" className="legal-back">
          &larr; Back to Ring Wallet
        </a>
        <h1 className="legal-title">Ring Labs Terms of Service</h1>
        <p className="legal-date">Last modified: {LAST_MODIFIED}</p>

        <p>
          These Terms of Service (the &ldquo;Agreement&rdquo;) explain the terms
          and conditions by which you may access and use the Products provided
          by BOTBOT LTD., doing business as Ring Labs (referred to herein as
          &ldquo;Ring Labs&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or
          &ldquo;us&rdquo;). The Products shall include, but shall not
          necessarily be limited to, Ring Wallet, a self-custody cryptocurrency
          wallet available as a progressive web application at{' '}
          <a href="https://wallet.ring.exchange">
            https://wallet.ring.exchange
          </a>{' '}
          and as a browser extension (collectively, the &ldquo;Wallet&rdquo; or
          &ldquo;App&rdquo;). You must read this Agreement carefully as it
          governs your use of the Products. By accessing or using any of the
          Products, you signify that you have read, understand, and agree to be
          bound by this Agreement in its entirety. If you do not agree, you are
          not authorized to access or use any of our Products and should not use
          our Products.
        </p>
        <p>
          To access or use any of our Products, you must be able to form a
          legally binding contract with us. Accordingly, you represent that you
          are at least the age of majority in your jurisdiction (e.g., 18 years
          old in the United States) and have the full right, power, and
          authority to enter into and comply with the terms and conditions of
          this Agreement on behalf of yourself and any company or legal entity
          for which you may access or use the Wallet. If you are entering into
          this Agreement on behalf of an entity, you represent to us that you
          have the legal authority to bind such entity.
        </p>
        <p>
          You further represent that you are not (a) the subject of economic or
          trade sanctions administered or enforced by any governmental authority
          or otherwise designated on any list of prohibited or restricted
          parties (including but not limited to the list maintained by the
          Office of Foreign Assets Control of the U.S. Department of the
          Treasury) or (b) a citizen, resident, or organized in a jurisdiction
          or territory that is the subject of comprehensive country-wide,
          territory-wide, or regional economic sanctions by the United States.
          Finally, you represent that your access and use of any of our Products
          will fully comply with all applicable laws and regulations, and that
          you will not access or use any of our Products to conduct, promote, or
          otherwise facilitate any illegal activity.
        </p>
        <p className="legal-notice-block">
          NOTICE: This Agreement contains important information, including a
          binding arbitration provision and a class action waiver, both of which
          impact your rights as to how disputes are resolved. Our Products are
          only available to you &mdash; and you should only access any of our
          Products &mdash; if you agree completely with these terms.
        </p>

        {/* Section 1 */}
        <h2>1. Our Products</h2>

        <h3>1.1 The Wallet</h3>
        <p>
          Ring Wallet is a self-custody cryptocurrency wallet that allows you to
          generate, store, and manage cryptographic key material locally on your
          device. The Wallet supports multiple blockchain networks, including
          but not limited to Ethereum and Ethereum-compatible chains (such as
          Optimism, Arbitrum, and Polygon), Solana, and Bitcoin. Private keys
          are derived from a master seed using industry-standard hierarchical
          deterministic (HD) derivation paths and are held in browser memory
          only during your active session. The Wallet does not transmit your
          private keys, master seed, or mnemonic phrases to any server.
        </p>
        <p>
          Authentication is provided exclusively through Passkey (WebAuthn)
          biometric verification. Your master seed is embedded in the WebAuthn
          credential and is never stored on any Ring Labs server. Ring Labs does
          not have the ability to access, recover, or reset your master seed or
          private keys. You are solely responsible for maintaining access to the
          device and Passkey credentials used to authenticate with the Wallet.
        </p>

        <h3>1.2 DApp Browser</h3>
        <p>
          The Wallet includes a built-in DApp browser that allows you to
          interact with third-party decentralized applications
          (&ldquo;DApps&rdquo;) through an embedded iframe. The DApp browser
          routes read-only blockchain queries to RPC providers and presents
          approval prompts for transactions and signature requests.
        </p>
        <p>
          Third-party DApps accessible through the DApp browser are not
          developed, owned, controlled, or endorsed by Ring Labs. We do not
          audit, verify, or guarantee the security, accuracy, or quality of any
          third-party DApp. Your interactions with any DApp are governed by that
          DApp&rsquo;s own terms and policies. You access third-party DApps
          entirely at your own risk.
        </p>

        <h3>1.3 Third-Party Services and Content</h3>
        <p>
          When you use any of our Products, you may also be using the products,
          services, or content of one or more third parties, including public
          RPC node providers and blockchain data services. Your use of such
          third-party products, services, or content may be subject to separate
          policies, terms of use, and fees of these third parties, and you agree
          to abide by and be responsible for such policies, terms of use, and
          fees, as applicable.
        </p>

        <h3>1.4 Other Products</h3>
        <p>
          We may from time to time in the future offer additional products, and
          such additional products shall be considered a Product as used herein,
          regardless of whether such product is specifically defined in this
          Agreement.
        </p>

        <h3>1.5 Privacy Policy</h3>
        <p>
          Your use of the Products is also governed by our{' '}
          <a href="/privacy-policy">Privacy Policy</a>, which is incorporated
          into this Agreement by reference. Please review the Privacy Policy to
          understand how we collect, use, and share data in connection with the
          Products.
        </p>

        {/* Section 2 */}
        <h2>2. Modifications of this Agreement or our Products</h2>

        <h3>2.1 Modifications of this Agreement</h3>
        <p>
          We reserve the right, in our sole discretion, to modify this Agreement
          from time to time. If we make any material modifications, we will
          notify you by updating the date at the top of the Agreement and by
          maintaining a current version of the Agreement at{' '}
          <a href="https://wallet.ring.exchange/terms-of-service">
            https://wallet.ring.exchange/terms-of-service
          </a>
          . For material modifications, we will use commercially reasonable
          efforts to provide at least thirty (30) days&rsquo; advance notice
          before the changes take effect, through the Products or by other
          reasonable means. All modifications will be effective when they are
          posted (or, for material modifications, at the end of the applicable
          notice period), and your continued accessing or use of any of the
          Products after the effective date will serve as confirmation of your
          acceptance of those modifications. If you do not agree with any
          modifications to this Agreement, you must immediately stop accessing
          and using all of our Products.
        </p>

        <h3>2.2 Modifications of our Products</h3>
        <p>
          We reserve the following rights, which do not constitute obligations
          of ours: (a) with or without notice to you, to modify, substitute,
          eliminate or add to any of the Products; (b) to review, modify,
          filter, disable, delete and remove any and all content and information
          from any of the Products.
        </p>

        {/* Section 3 */}
        <h2>3. Intellectual Property Rights</h2>

        <h3>3.1 IP Rights Generally</h3>
        <p>
          We own all intellectual property and other rights in each of our
          Products and its respective contents, including, but not limited to,
          software, text, images, trademarks, service marks, copyrights,
          patents, designs, and its &ldquo;look and feel.&rdquo; This
          intellectual property is available under the terms of our copyright
          licenses and our Trademark Guidelines. Subject to the terms of this
          Agreement, we grant you a limited, revocable, non-exclusive,
          non-sublicensable, non-transferable license to access and use our
          Products solely in accordance with this Agreement. You agree that you
          will not use, modify, distribute, tamper with, reverse engineer,
          disassemble or decompile any of our Products for any purpose other
          than as expressly permitted pursuant to this Agreement. Except as set
          forth in this Agreement, we grant you no rights to any of our
          Products, including any intellectual property rights.
        </p>
        <p>
          By using any of our Products, you grant us a worldwide, non-exclusive,
          sublicensable, royalty-free license to use, copy, modify, and display
          any content, including but not limited to text, materials, images,
          files, communications, comments, feedback, suggestions, ideas,
          concepts, questions, data, or otherwise, that you post on or through
          any of our Products for our current and future business purposes,
          including to provide, promote, and improve the services. You grant to
          us a non-exclusive, transferable, worldwide, perpetual, irrevocable,
          fully-paid, royalty-free license, with the right to sublicense, under
          any and all intellectual property rights that you own or control to
          use, copy, modify, create derivative works based upon any suggestions
          or feedback for any purpose.
        </p>
        <p>
          You represent and warrant that you have, or have obtained, all rights,
          licenses, consents, permissions, power and/or authority necessary to
          grant the rights granted herein for any material that you submit
          through any of our Products. You represent and warrant that such
          content does not contain material subject to copyright, trademark,
          publicity rights, or other intellectual property rights, unless you
          have necessary permission or are otherwise legally entitled to post
          the material and to grant us the license described above, and that the
          content does not violate any laws.
        </p>

        <h3>3.2 Third-Party Resources and Promotions</h3>
        <p>
          Our Products may contain references or links to third-party resources,
          including, but not limited to, information, materials, products, or
          services, that we do not own or control. In addition, third parties
          may offer promotions related to your access and use of our Products.
          We do not approve, monitor, endorse, warrant or assume any
          responsibility for any such resources or promotions. If you access any
          such resources or participate in any such promotions, you do so at
          your own risk, and you understand that this Agreement does not apply
          to your dealings or relationships with any third parties. You
          expressly relieve us of any and all liability arising from your use of
          any such resources or participation in any such promotions.
        </p>

        <h3>3.3 Additional Rights</h3>
        <p>
          We reserve the right to cooperate with any law enforcement, court or
          government investigation or order or third party requesting or
          directing that we disclose information or content or information that
          you provide.
        </p>

        {/* Section 4 */}
        <h2>4. Your Responsibilities</h2>

        <h3>4.1 Prohibited Activity</h3>
        <p>
          You agree not to engage in, or attempt to engage in, any of the
          following categories of prohibited activity in relation to your access
          and use of the Wallet:
        </p>
        <ul className="legal-list">
          {PROHIBITED_ACTIVITIES.map((item) => (
            <li key={item.title}>
              <strong>{item.title}.</strong> {item.desc}
            </li>
          ))}
        </ul>

        <h3>4.2 Transactions</h3>
        <p>
          You agree and understand that: (a) all transactions you initiate
          through the Wallet are solely initiated by you; (b) you have not
          received any investment advice from us in connection with any
          transactions; and (c) we do not conduct a suitability review of any
          transactions you submit.
        </p>

        <h3>4.3 Self-Custody and No Fiduciary Duties</h3>
        <p>
          The Wallet is a purely self-custodial application, meaning that you
          alone generate, hold, and control the cryptographic private keys to
          your digital asset addresses. Ring Labs never has custody, possession,
          or control of your private keys, master seed, or digital assets at any
          time. You are solely responsible for the security of your Passkey
          credentials and the device on which they are stored. We accept no
          responsibility for, or liability to you, in connection with the loss
          of or unauthorized access to your keys or assets.
        </p>
        <p>
          This Agreement is not intended to, and does not, create or impose any
          fiduciary duties on us. To the fullest extent permitted by law, you
          acknowledge and agree that we owe no fiduciary duties or liabilities
          to you or any other party, and that to the extent any such duties or
          liabilities may exist at law or in equity, those duties and
          liabilities are hereby irrevocably disclaimed, waived, and eliminated.
          You further agree that the only duties and obligations that we owe you
          are those set out expressly in this Agreement.
        </p>

        <h3>4.4 Passkey and Device Responsibility</h3>
        <p>
          Ring Wallet uses Passkey (WebAuthn) as the sole authentication and
          key-protection mechanism. Your master seed is embedded within your
          Passkey credential. Ring Labs does not store, back up, or have any
          ability to recover your master seed or Passkey credentials. You
          acknowledge and accept the following risks:
        </p>
        <ul className="legal-list">
          <li>
            <strong>Device loss or damage.</strong> If you lose access to the
            device on which your Passkey is stored and have not synced your
            Passkey to another device or cloud keychain, your master seed and
            all derived private keys will be permanently and irreversibly lost.
            Ring Labs cannot recover them for you.
          </li>
          <li>
            <strong>Biometric and platform dependency.</strong> Passkey
            functionality depends on your device&rsquo;s biometric hardware and
            operating system support. Changes to your device settings, operating
            system updates, or hardware failures may affect your ability to
            authenticate.
          </li>
          <li>
            <strong>No alternative recovery.</strong> There is no mnemonic
            phrase, recovery email, password reset, or alternative
            authentication method. The Passkey credential is the sole means of
            accessing your wallet.
          </li>
        </ul>

        <h3>4.5 Compliance and Tax Obligations</h3>
        <p>
          One or more of our Products may not be available or appropriate for
          use in your jurisdiction. By accessing or using any of our Products,
          you agree that you are solely and entirely responsible for compliance
          with all laws and regulations that may apply to you.
        </p>
        <p>
          Specifically, your use of our Products may result in various tax
          consequences, such as income or capital gains tax, value-added tax,
          goods and services tax, or sales tax in certain jurisdictions.
        </p>
        <p>
          It is your responsibility to determine whether taxes apply to any
          transactions you initiate or receive and, if so, to report and/or
          remit the correct tax to the appropriate tax authority.
        </p>

        <h3>4.6 Gas Fees</h3>
        <p>
          Blockchain transactions require the payment of transaction fees to the
          appropriate network (&ldquo;Gas Fees&rdquo;). Except as otherwise
          expressly set forth in the terms of another offer by Ring Labs, you
          will be solely responsible to pay the Gas Fees for any transaction
          that you initiate via any of our Products.
        </p>

        <h3>4.7 Release of Claims</h3>
        <p>
          You expressly agree that you assume all risks in connection with your
          access and use of any of our Products. You further expressly waive and
          release us from any and all liability, claims, causes of action, or
          damages arising from or in any way relating to your use of any of our
          Products. If you are a California resident, you waive the benefits and
          protections of California Civil Code &sect; 1542, which provides:
          &ldquo;[a] general release does not extend to claims that the creditor
          or releasing party does not know or suspect to exist in his or her
          favor at the time of executing the release and that, if known by him
          or her, would have materially affected his or her settlement with the
          debtor or released party.&rdquo;
        </p>

        {/* Section 5 */}
        <h2>5. DISCLAIMERS</h2>

        <h3>5.1 ASSUMPTION OF RISK &mdash; GENERALLY</h3>
        <p className="legal-caps">
          BY ACCESSING AND USING ANY OF OUR PRODUCTS, YOU REPRESENT THAT YOU ARE
          FINANCIALLY AND TECHNICALLY SOPHISTICATED ENOUGH TO UNDERSTAND THE
          INHERENT RISKS ASSOCIATED WITH USING CRYPTOGRAPHIC AND
          BLOCKCHAIN-BASED SYSTEMS, AND THAT YOU HAVE A WORKING KNOWLEDGE OF THE
          USAGE AND INTRICACIES OF DIGITAL ASSETS SUCH AS ETHER (ETH), SO-CALLED
          STABLECOINS, AND OTHER DIGITAL TOKENS SUCH AS THOSE FOLLOWING THE
          ETHEREUM TOKEN STANDARD (ERC-20) OR THE SOLANA PROGRAM LIBRARY (SPL)
          TOKEN STANDARD.
        </p>
        <p className="legal-caps">
          IN PARTICULAR, YOU UNDERSTAND THAT THE MARKETS FOR THESE DIGITAL
          ASSETS ARE NASCENT AND HIGHLY VOLATILE DUE TO RISK FACTORS INCLUDING,
          BUT NOT LIMITED TO, ADOPTION, SPECULATION, TECHNOLOGY, SECURITY, AND
          REGULATION. YOU UNDERSTAND THAT ANYONE CAN CREATE A TOKEN, INCLUDING
          FAKE VERSIONS OF EXISTING TOKENS AND TOKENS THAT FALSELY CLAIM TO
          REPRESENT PROJECTS, AND ACKNOWLEDGE AND ACCEPT THE RISK THAT YOU MAY
          MISTAKENLY TRADE THOSE OR OTHER TOKENS. SO-CALLED STABLECOINS MAY NOT
          BE AS STABLE AS THEY PURPORT TO BE, MAY NOT BE FULLY OR ADEQUATELY
          COLLATERALIZED, AND MAY BE SUBJECT TO PANICS AND RUNS.
        </p>
        <p className="legal-caps">
          FURTHER, YOU UNDERSTAND THAT SMART CONTRACT TRANSACTIONS AUTOMATICALLY
          EXECUTE AND SETTLE, AND THAT BLOCKCHAIN-BASED TRANSACTIONS ARE
          IRREVERSIBLE WHEN CONFIRMED. YOU ACKNOWLEDGE AND ACCEPT THAT THE COST
          AND SPEED OF TRANSACTING WITH CRYPTOGRAPHIC AND BLOCKCHAIN-BASED
          SYSTEMS SUCH AS ETHEREUM AND SOLANA ARE VARIABLE AND MAY INCREASE
          DRAMATICALLY AT ANY TIME.
        </p>
        <p className="legal-caps">
          IN SUMMARY, YOU ACKNOWLEDGE THAT WE ARE NOT RESPONSIBLE FOR ANY OF
          THESE VARIABLES OR RISKS AND CANNOT BE HELD LIABLE FOR ANY RESULTING
          LOSSES THAT YOU EXPERIENCE WHILE ACCESSING OR USING ANY OF OUR
          PRODUCTS. ACCORDINGLY, YOU UNDERSTAND AND AGREE TO ASSUME FULL
          RESPONSIBILITY FOR ALL OF THE RISKS OF ACCESSING AND USING THE WALLET.
        </p>

        <h3>5.2 ASSUMPTION OF RISK &mdash; WALLET-SPECIFIC</h3>
        <p className="legal-caps">
          YOU UNDERSTAND AND ACKNOWLEDGE THAT RING WALLET IS A SELF-CUSTODY
          WALLET AND THAT RING LABS DOES NOT STORE, BACK UP, OR HAVE ACCESS TO
          YOUR PRIVATE KEYS, MASTER SEED, OR PASSKEY CREDENTIALS. IF YOU LOSE
          ACCESS TO YOUR DEVICE, PASSKEY CREDENTIAL, OR THE CLOUD KEYCHAIN THAT
          SYNCS YOUR PASSKEY, YOUR WALLET AND ALL ASSETS CONTROLLED BY IT WILL
          BE PERMANENTLY AND IRREVERSIBLY LOST. RING LABS HAS NO ABILITY TO
          RECOVER YOUR WALLET UNDER ANY CIRCUMSTANCES.
        </p>
        <p className="legal-caps">
          YOU FURTHER ACKNOWLEDGE THAT THE WALLET OPERATES AS A PROGRESSIVE WEB
          APPLICATION (PWA) OR BROWSER EXTENSION. CLEARING YOUR BROWSER DATA,
          UNINSTALLING THE APPLICATION, OR CHANGES TO YOUR DEVICE&rsquo;S
          OPERATING SYSTEM OR BROWSER MAY AFFECT LOCAL STORAGE AND CACHED DATA.
          YOUR PASSKEY CREDENTIAL REMAINS THE SOLE METHOD OF RECOVERY AND
          AUTHENTICATION.
        </p>

        <h3>5.3 NO WARRANTIES</h3>
        <p className="legal-caps">
          EACH OF OUR PRODUCTS IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND
          &ldquo;AS AVAILABLE&rdquo; BASIS. TO THE FULLEST EXTENT PERMITTED BY
          LAW, WE DISCLAIM ANY REPRESENTATIONS AND WARRANTIES OF ANY KIND,
          WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING, BUT NOT LIMITED TO,
          THE WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
          PURPOSE. YOU ACKNOWLEDGE AND AGREE THAT YOUR USE OF EACH OF OUR
          PRODUCTS IS AT YOUR OWN RISK. WE DO NOT REPRESENT OR WARRANT THAT
          ACCESS TO ANY OF OUR PRODUCTS WILL BE CONTINUOUS, UNINTERRUPTED,
          TIMELY, OR SECURE; THAT THE INFORMATION CONTAINED IN ANY OF OUR
          PRODUCTS WILL BE ACCURATE, RELIABLE, COMPLETE, OR CURRENT; OR THAT ANY
          OF OUR PRODUCTS WILL BE FREE FROM ERRORS, DEFECTS, VIRUSES, OR OTHER
          HARMFUL ELEMENTS. NO ADVICE, INFORMATION, OR STATEMENT THAT WE MAKE
          SHOULD BE TREATED AS CREATING ANY WARRANTY CONCERNING ANY OF OUR
          PRODUCTS. WE DO NOT ENDORSE, GUARANTEE, OR ASSUME RESPONSIBILITY FOR
          ANY ADVERTISEMENTS, OFFERS, OR STATEMENTS MADE BY THIRD PARTIES
          CONCERNING ANY OF OUR PRODUCTS.
        </p>

        <h3>5.4 NO INVESTMENT ADVICE</h3>
        <p className="legal-caps">
          WE MAY DISPLAY INFORMATION ABOUT TOKENS OR DIGITAL ASSETS IN OUR
          PRODUCTS SOURCED FROM THIRD-PARTY DATA PROVIDERS. THE PROVISION OF
          INFORMATIONAL MATERIALS DOES NOT MAKE TRADES IN THOSE TOKENS
          SOLICITED; WE ARE NOT ATTEMPTING TO INDUCE YOU TO MAKE ANY PURCHASE AS
          A RESULT OF INFORMATION PROVIDED. ALL SUCH INFORMATION PROVIDED BY ANY
          OF OUR PRODUCTS IS FOR INFORMATIONAL PURPOSES ONLY AND SHOULD NOT BE
          CONSTRUED AS INVESTMENT ADVICE OR A RECOMMENDATION THAT A PARTICULAR
          TOKEN IS A SAFE OR SOUND INVESTMENT. YOU SHOULD NOT TAKE, OR REFRAIN
          FROM TAKING, ANY ACTION BASED ON ANY INFORMATION CONTAINED IN ANY OF
          OUR PRODUCTS. BY PROVIDING TOKEN INFORMATION FOR YOUR CONVENIENCE, WE
          DO NOT MAKE ANY INVESTMENT RECOMMENDATIONS TO YOU OR OPINE ON THE
          MERITS OF ANY TRANSACTION OR OPPORTUNITY. YOU ALONE ARE RESPONSIBLE
          FOR DETERMINING WHETHER ANY INVESTMENT, INVESTMENT STRATEGY OR RELATED
          TRANSACTION IS APPROPRIATE FOR YOU BASED ON YOUR PERSONAL INVESTMENT
          OBJECTIVES, FINANCIAL CIRCUMSTANCES, AND RISK TOLERANCE.
        </p>

        <h3>5.5 DAPP BROWSER DISCLAIMER</h3>
        <p className="legal-caps">
          THE WALLET INCLUDES A BUILT-IN DAPP BROWSER THAT ALLOWS YOU TO ACCESS
          THIRD-PARTY DECENTRALIZED APPLICATIONS. RING LABS DOES NOT DEVELOP,
          AUDIT, ENDORSE, OR CONTROL ANY THIRD-PARTY DAPP. YOU ACCESS DAPPS
          THROUGH THE BROWSER ENTIRELY AT YOUR OWN RISK. WE ARE NOT RESPONSIBLE
          FOR ANY LOSSES, DAMAGES, OR CLAIMS ARISING FROM YOUR USE OF OR
          INTERACTION WITH ANY THIRD-PARTY DAPP, INCLUDING BUT NOT LIMITED TO
          LOSSES RESULTING FROM SMART CONTRACT VULNERABILITIES, PHISHING, OR
          FRAUDULENT APPLICATIONS.
        </p>

        {/* Section 6 */}
        <h2>6. Indemnification</h2>
        <p>
          You agree to hold harmless, release, defend, and indemnify us and our
          officers, directors, employees, contractors, agents, affiliates, and
          subsidiaries from and against all claims, damages, obligations,
          losses, liabilities, costs, and expenses arising from: (a) your access
          and use of any of our Products; (b) your violation of any term or
          condition of this Agreement, the right of any third party, or any
          other applicable law, rule, or regulation; (c) any other party&rsquo;s
          access and use of any of our Products with your assistance or using
          any device or account that you own or control; and (d) any dispute
          between you and (i) any other user of any of the Products or (ii) any
          of your own customers or users.
        </p>

        {/* Section 7 */}
        <h2>7. Limitation of Liability</h2>
        <p className="legal-caps">
          UNDER NO CIRCUMSTANCES SHALL WE OR ANY OF OUR OFFICERS, DIRECTORS,
          EMPLOYEES, CONTRACTORS, AGENTS, AFFILIATES, OR SUBSIDIARIES BE LIABLE
          TO YOU FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
          OR EXEMPLARY DAMAGES, INCLUDING, BUT NOT LIMITED TO, DAMAGES FOR LOSS
          OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE PROPERTY, ARISING
          OUT OF OR RELATING TO ANY ACCESS OR USE OF OR INABILITY TO ACCESS OR
          USE ANY OF THE PRODUCTS, NOR WILL WE BE RESPONSIBLE FOR ANY DAMAGE,
          LOSS, OR INJURY RESULTING FROM HACKING, TAMPERING, OR OTHER
          UNAUTHORIZED ACCESS OR USE OF ANY OF THE PRODUCTS OR THE INFORMATION
          CONTAINED WITHIN IT, WHETHER SUCH DAMAGES ARE BASED IN CONTRACT, TORT,
          NEGLIGENCE, STRICT LIABILITY, OR OTHERWISE, ARISING OUT OF OR IN
          CONNECTION WITH AUTHORIZED OR UNAUTHORIZED USE OF ANY OF THE PRODUCTS,
          EVEN IF AN AUTHORIZED REPRESENTATIVE OF RING LABS HAS BEEN ADVISED OF
          OR KNEW OR SHOULD HAVE KNOWN OF THE POSSIBILITY OF SUCH DAMAGES. WE
          ASSUME NO LIABILITY OR RESPONSIBILITY FOR ANY: (A) ERRORS, MISTAKES,
          OR INACCURACIES OF CONTENT; (B) PERSONAL INJURY OR PROPERTY DAMAGE, OF
          ANY NATURE WHATSOEVER, RESULTING FROM ANY ACCESS OR USE OF THE WALLET;
          (C) UNAUTHORIZED ACCESS OR USE OF ANY SECURE SERVER OR DATABASE IN OUR
          CONTROL, OR THE USE OF ANY INFORMATION OR DATA STORED THEREIN; (D)
          INTERRUPTION OR CESSATION OF FUNCTION RELATED TO ANY OF THE PRODUCTS;
          (E) BUGS, VIRUSES, TROJAN HORSES, OR THE LIKE THAT MAY BE TRANSMITTED
          TO OR THROUGH THE WALLET; (F) ERRORS OR OMISSIONS IN, OR LOSS OR
          DAMAGE INCURRED AS A RESULT OF THE USE OF, ANY CONTENT MADE AVAILABLE
          THROUGH ANY OF THE PRODUCTS; AND (G) THE DEFAMATORY, OFFENSIVE, OR
          ILLEGAL CONDUCT OF ANY THIRD PARTY.
        </p>
        <p className="legal-caps">
          WE HAVE NO LIABILITY TO YOU OR TO ANY THIRD PARTY FOR ANY CLAIMS OR
          DAMAGES THAT MAY ARISE AS A RESULT OF ANY TRANSACTIONS THAT YOU ENGAGE
          IN VIA ANY OF OUR PRODUCTS, OR ANY OTHER TRANSACTIONS THAT YOU CONDUCT
          VIA ANY OF OUR PRODUCTS. EXCEPT AS EXPRESSLY PROVIDED FOR HEREIN, WE
          DO NOT PROVIDE REFUNDS FOR ANY PURCHASES THAT YOU MIGHT MAKE ON OR
          THROUGH ANY OF OUR PRODUCTS.
        </p>
        <p className="legal-caps">
          WE MAKE NO WARRANTIES OR REPRESENTATIONS, EXPRESS OR IMPLIED, ABOUT
          LINKED THIRD-PARTY SERVICES, THE THIRD PARTIES THEY ARE OWNED AND
          OPERATED BY, THE INFORMATION CONTAINED ON THEM, ASSETS AVAILABLE
          THROUGH THEM, OR THE SUITABILITY, PRIVACY, OR SECURITY OF THEIR
          PRODUCTS OR SERVICES. YOU ACKNOWLEDGE SOLE RESPONSIBILITY FOR AND
          ASSUME ALL RISK ARISING FROM YOUR USE OF THIRD-PARTY SERVICES,
          THIRD-PARTY WEBSITES, APPLICATIONS, OR RESOURCES. WE SHALL NOT BE
          LIABLE UNDER ANY CIRCUMSTANCES FOR DAMAGES ARISING OUT OF OR IN ANY
          WAY RELATED TO SOFTWARE, PRODUCTS, SERVICES, AND/OR INFORMATION
          OFFERED OR PROVIDED BY THIRD PARTIES AND ACCESSED THROUGH ANY OF OUR
          PRODUCTS.
        </p>
        <p className="legal-caps">
          SOME JURISDICTIONS DO NOT ALLOW THE LIMITATION OF LIABILITY FOR
          PERSONAL INJURY, OR OF INCIDENTAL OR CONSEQUENTIAL DAMAGES, SO THIS
          LIMITATION MAY NOT APPLY TO YOU. IN NO EVENT SHALL OUR TOTAL LIABILITY
          TO YOU FOR ALL DAMAGES (OTHER THAN AS MAY BE REQUIRED BY APPLICABLE
          LAW IN CASES INVOLVING PERSONAL INJURY) EXCEED THE AMOUNT OF ONE
          HUNDRED U.S. DOLLARS ($100.00 USD) OR ITS EQUIVALENT IN THE LOCAL
          CURRENCY OF THE APPLICABLE JURISDICTION.
        </p>
        <p className="legal-caps">
          THE FOREGOING DISCLAIMER WILL NOT APPLY TO THE EXTENT PROHIBITED BY
          LAW.
        </p>

        {/* Section 8 */}
        <h2>8. Governing Law, Dispute Resolution and Class Action Waivers</h2>

        <h3>8.1 Governing Law</h3>
        <p>
          You agree that the laws of Singapore, without regard to principles of
          conflict of laws, govern this Agreement and any Dispute between you
          and us. You further agree that each of our Products shall be deemed to
          be based solely in Singapore, and that although a Product may be
          available in other jurisdictions, its availability does not give rise
          to general or specific personal jurisdiction in any forum outside
          Singapore. Any arbitration conducted pursuant to this Agreement shall
          be governed by the Singapore International Arbitration Act (Cap.
          143A). You agree that the courts of Singapore are the proper forum for
          any appeals of an arbitration award or for court proceedings in the
          event that this Agreement&rsquo;s binding arbitration clause is found
          to be unenforceable.
        </p>

        <h3>8.2 Dispute Resolution</h3>
        <p>
          We will use our best efforts to resolve any potential disputes through
          informal, good faith negotiations. If a potential dispute arises, you
          must contact us by sending an email to{' '}
          <a href="mailto:hello@ringprotocol.com">hello@ringprotocol.com</a> so
          that we can attempt to resolve it without resorting to formal dispute
          resolution. If we aren&rsquo;t able to reach an informal resolution
          within sixty days of your email, then you and we both agree to resolve
          the potential dispute according to the process set forth below.
        </p>
        <p>
          Any claim or controversy arising out of or relating to any of our
          Products, this Agreement, or any other acts or omissions for which you
          may contend that we are liable, including, but not limited to, any
          claim or controversy as to arbitrability (&ldquo;Dispute&rdquo;),
          shall be finally and exclusively settled by arbitration administered
          by the Singapore International Arbitration Centre (&ldquo;SIAC&rdquo;)
          in accordance with the SIAC Arbitration Rules in force at the time of
          filing. You understand that you are required to resolve all Disputes
          by binding arbitration. The arbitration shall be held on a
          confidential basis before a single arbitrator, who shall be selected
          pursuant to SIAC rules. The arbitration will be held in Singapore,
          unless you and we both agree to hold it elsewhere. The language of the
          arbitration shall be English. Unless we agree otherwise, the
          arbitrator may not consolidate your claims with those of any other
          party. Any judgment on the award rendered by the arbitrator may be
          entered in any court of competent jurisdiction. If for any reason a
          claim by law or equity must proceed in court rather than in
          arbitration, any such claim may be brought only in the courts of
          Singapore.
        </p>

        <h3>8.3 Class Action and Jury Trial Waiver</h3>
        <p>
          You must bring any and all Disputes against us in your individual
          capacity and not as a plaintiff in or member of any purported class
          action, collective action, private attorney general action, or other
          representative proceeding. This provision applies to class
          arbitration. You and we both agree to waive the right to demand a
          trial by jury.
        </p>

        {/* Section 9 */}
        <h2>9. Miscellaneous</h2>

        <h3>9.1 Entire Agreement</h3>
        <p>
          These terms constitute the entire agreement between you and us with
          respect to the subject matter hereof. This Agreement supersedes any
          and all prior or contemporaneous written and oral agreements,
          communications and other understandings (if any) relating to the
          subject matter of the terms.
        </p>

        <h3>9.2 Assignment</h3>
        <p>
          You may not assign or transfer this Agreement, by operation of law or
          otherwise, without our prior written consent. Any attempt by you to
          assign or transfer this Agreement without our prior written consent
          shall be null and void. We may freely assign or transfer this
          Agreement. Subject to the foregoing, this Agreement will bind and
          inure to the benefit of the parties, their successors and permitted
          assigns.
        </p>

        <h3>9.3 Not Registered with the SEC or Any Other Agency</h3>
        <p>
          We are not registered with the U.S. Securities and Exchange
          Commission, the Monetary Authority of Singapore, or any other
          securities regulatory authority as a national securities exchange or
          in any other capacity. You understand and acknowledge that we do not
          broker trading orders on your behalf. We also do not facilitate the
          execution or settlement of your trades, which occur entirely on public
          distributed blockchains. As a result, we do not (and cannot) guarantee
          market best pricing or best execution through our Products.
        </p>

        <h3>9.4 Notice</h3>
        <p>
          We may provide any notice to you under this Agreement using
          commercially reasonable means, including using public communication
          channels. Notices we provide by using public communication channels
          will be effective upon posting.
        </p>

        <h3>9.5 Severability</h3>
        <p>
          If any provision of this Agreement shall be determined to be invalid
          or unenforceable under any rule, law, or regulation of any local,
          state, or federal government agency, such provision will be changed
          and interpreted to accomplish the objectives of the provision to the
          greatest extent possible under any applicable law and the validity or
          enforceability of any other provision of this Agreement shall not be
          affected.
        </p>

        <h3>9.6 Term and Termination</h3>
        <p>
          This Agreement is effective until terminated. We may terminate or
          suspend your access to any of our Products immediately, without prior
          notice or liability, for any reason whatsoever, including without
          limitation if you breach any term of this Agreement. Upon termination:
          (a) all rights and licenses granted to you under this Agreement will
          immediately terminate; and (b) you must cease all use of the Products.
          Because the Wallet is a self-custody application, termination of your
          access to our Products does not affect your ability to manage your
          digital assets independently using your private keys. Sections 3
          (Intellectual Property), 4.3 (Self-Custody and No Fiduciary Duties),
          4.7 (Release of Claims), 5 (Disclaimers), 6 (Indemnification), 7
          (Limitation of Liability), 8 (Governing Law, Dispute Resolution and
          Class Action Waivers), and 9 (Miscellaneous) shall survive any
          termination of this Agreement.
        </p>

        <h3>9.7 Force Majeure</h3>
        <p>
          We shall not be liable for any failure or delay in performing our
          obligations under this Agreement where such failure or delay results
          from circumstances beyond our reasonable control, including but not
          limited to: (a) acts of God, natural disasters, epidemics, or
          pandemics; (b) war, terrorism, riots, or civil unrest; (c) government
          actions, laws, regulations, embargoes, or sanctions; (d) power
          outages, telecommunications failures, or internet service disruptions;
          (e) blockchain network congestion, forks, or protocol-level failures;
          (f) third-party RPC provider, indexer, or infrastructure outages; (g)
          cyberattacks, including denial-of-service attacks, hacking, or
          malware; or (h) any other event beyond our reasonable control. Our
          obligations shall be suspended for the duration of such circumstances.
        </p>

        <h3>9.8 Time Limitation on Claims</h3>
        <p>
          You agree that any claim you may have arising out of or related to
          your relationship with us or this Agreement must be filed within one
          (1) year after such claim arose; otherwise, your claim is permanently
          barred. This limitation applies regardless of the form of action,
          whether in contract, tort, strict liability, or otherwise.
        </p>

        <h3>9.9 Consumer Rights Preservation</h3>
        <p>
          Nothing in this Agreement shall limit or exclude any rights you may
          have under applicable consumer protection laws that cannot be lawfully
          limited or excluded. Some jurisdictions do not allow the exclusion of
          certain warranties or the limitation of certain liabilities. If these
          laws apply to you, some or all of the above exclusions or limitations
          may not apply, and you may have additional rights.
        </p>
      </div>
    </div>
  )
}
