import React from 'react'
import './Introduce.css'

/**
 * Product introduction for the login screen. Content is derived from README.md.
 * Shown below the login button when the user is not logged in.
 */
const Introduce: React.FC = () => {
  const principles = [
    { title: 'No password, no mnemonic', desc: 'Log in with your fingerprint. No seed phrases to write down or lose.' },
    { title: 'Self-custody', desc: 'Your keys, your assets. We don’t hold them for you.' },
    { title: 'No extra fee', desc: 'We don’t add transaction fees on top of network costs.' },
    { title: 'AI Agent friendly', desc: 'Built so agents and automation can interact with your wallet in a secure, programmable way.' },
    { title: 'Listener to your voice', desc: 'Designed to respond to how you want to use crypto—simple when you want simple, powerful when you need it.' },
  ]

  return (
    <section className="introduce" aria-label="Product introduction">
      <p className="introduce-vision">
        Ring Wallet is a new kind of crypto wallet: <strong>no passwords, no mnemonics, no friction.</strong> You sign in with your fingerprint. You keep full control of your keys. You pay no extra fees on transactions.
      </p>
      <p className="introduce-belief">
        We believe ownership should feel natural, safe, and open. Ring Wallet is our step toward that future.
      </p>
      <dl className="introduce-principles">
        {principles.map(({ title, desc }) => (
          <div key={title} className="introduce-principle">
            <dt>{title}</dt>
            <dd>{desc}</dd>
          </div>
        ))}
      </dl>
      <p className="introduce-open">
        Ring Wallet is <strong>open source</strong>. We want to build in the open and with the community. Long-term support by <a href="https://ring.exchange" target="_blank" rel="noopener noreferrer">ring.exchange</a>.
      </p>
      <p className="introduce-tagline">Own your keys. Own your future.</p>
    </section>
  )
}

export default Introduce
