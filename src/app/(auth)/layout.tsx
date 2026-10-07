const features = [
  {
    icon: '🛍️',
    title: 'Buy & Sell',
    desc: 'List your unused textbooks, electronics, and gear. Find deals posted by peers.',
  },
  {
    icon: '🤝',
    title: 'Peer Lending',
    desc: 'Borrow items for a day or a week. Lend yours and build trust.',
  },
  {
    icon: '💼',
    title: 'Micro Gigs',
    desc: 'Hire students for tutoring, design, or coding. Offer your own skills.',
  },
  {
    icon: '⭐',
    title: 'Trust Score',
    desc: 'Every transaction builds your reputation. High scores unlock more.',
  },
]

const testimonials = [
  { name: 'Priya K.', role: 'Design Student', score: 92, text: 'Sold my old laptop in 2 hours and made ₹12,000. This platform is insane!' },
  { name: 'Rahul S.', role: 'CSE · 3rd Year', score: 88, text: 'Borrowed a DSLR for my project shoot. Saved ₹4,000 in rental costs.' },
  { name: 'Meera J.', role: 'MBA Student',    score: 95, text: 'Earned ₹8,000 this month tutoring juniors on this platform. 🔥' },
]

export default function AuthLayout({
  children,
}: {
  children: import('react').ReactNode
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'var(--font-inter)' }}>

      {/* ── LEFT: Auth Form ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        padding: '0',
        position: 'relative',
        minHeight: '100vh',
      }}>
        {/* Top branding */}
        <div style={{
          padding: '24px 36px',
          display: 'flex', alignItems: 'center', gap: '10px',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #3525cd, #712ae2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 900, fontSize: '15px',
          }}>U</div>
          <span style={{ fontWeight: 800, fontSize: '18px', color: '#191c1d', fontFamily: 'var(--font-manrope)', letterSpacing: '-0.3px' }}>
            UniXchange
          </span>
        </div>

        {/* Centered form area */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 32px',
        }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            {children}
          </div>
        </div>

        {/* Bottom badge */}
        <div style={{
          padding: '20px 36px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          fontSize: '12px', color: '#777587',
          borderTop: '1px solid #f0f0f0',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
          Trusted by 2,000+ students across India
        </div>
      </div>

      {/* ── RIGHT: Feature Showcase ── */}
      <div
        className="hidden lg:flex auth-right-panel"
        style={{
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px 56px',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(160deg, #1a0a6e 0%, #2d1580 30%, #3525cd 60%, #712ae2 100%)',
          color: 'white',
        }}
      >
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: '-120px', right: '-80px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-80px', left: '-60px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', right: '10%', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px' }}>

          {/* Header */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
              borderRadius: '999px', padding: '6px 14px', marginBottom: '20px',
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em' }}>LIVE ON CAMPUS</span>
            </div>
            <h2 style={{
              fontSize: '36px', fontWeight: 800, lineHeight: 1.15,
              letterSpacing: '-0.5px', fontFamily: 'var(--font-manrope)',
              marginBottom: '14px',
            }}>
              Everything your campus needs,<br />
              <span style={{ opacity: 0.75 }}>in one place.</span>
            </h2>
            <p style={{ fontSize: '15px', opacity: 0.7, lineHeight: 1.7 }}>
              Buy, sell, borrow, and earn — all within your verified student community.
            </p>
          </div>

          {/* Feature cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
            {features.map((f) => (
              <div key={f.title} style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px', padding: '18px',
                border: '1px solid rgba(255,255,255,0.12)',
                transition: 'background 0.2s',
              }}>
                <span style={{ fontSize: '22px', display: 'block', marginBottom: '10px' }}>{f.icon}</span>
                <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '5px', fontFamily: 'var(--font-manrope)' }}>{f.title}</p>
                <p style={{ fontSize: '11px', opacity: 0.65, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: '24px' }} />

          {/* Testimonials */}
          <p style={{ fontSize: '11px', fontWeight: 700, opacity: 0.5, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>
            What students say
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {testimonials.map((t) => (
              <div key={t.name} style={{
                backgroundColor: 'rgba(255,255,255,0.07)',
                borderRadius: '14px', padding: '14px 16px',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'flex-start', gap: '12px',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '14px',
                }}>
                  {t.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-manrope)' }}>{t.name}</span>
                      <span style={{ fontSize: '11px', opacity: 0.55, marginLeft: '6px' }}>{t.role}</span>
                    </div>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '999px', padding: '2px 8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700 }}>★ {t.score}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', opacity: 0.7, lineHeight: 1.6 }}>{t.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex', gap: '0', marginTop: '28px',
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderRadius: '16px', border: '1px solid rgba(255,255,255,0.12)',
            overflow: 'hidden',
          }}>
            {[
              { value: '2,000+', label: 'Students' },
              { value: '₹12L+',  label: 'Traded' },
              { value: '98%',    label: 'Satisfaction' },
            ].map((stat, i) => (
              <div key={stat.label} style={{
                flex: 1, padding: '16px', textAlign: 'center',
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none',
              }}>
                <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-manrope)', marginBottom: '3px' }}>{stat.value}</div>
                <div style={{ fontSize: '11px', opacity: 0.55, fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}