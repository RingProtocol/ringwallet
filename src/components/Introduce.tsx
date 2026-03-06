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
    { title: 'No platform fee', desc: 'We don’t add platform fees on top of network costs.' },
    { title: 'AI Agent friendly', desc: 'Built so agents and automation can interact with your wallet in a secure, programmable way.' },
    { title: 'Developer friendly', desc: 'Built-in dev tools and 1000+ chains. Get Test Token easy' },
    { title: 'Listener to your voice', desc: 'Designed to respond to how you want to use crypto—simple when you want simple, powerful when you need it.' },
  ]

  return (
    <section className="introduce" aria-label="Product introduction">
      <p className="introduce-vision">
        Sign in with your fingerprint, keep your keys, no platform fees. We believe ownership should feel natural, safe, and open.
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
        Ring Wallet is <strong>open source</strong>. We want to build in the open and with the community. Long-term support by Ring.
      </p>
      <p className="introduce-tagline">Own your keys. Own your future.</p>
    </section>
  )
}

export default Introduce
