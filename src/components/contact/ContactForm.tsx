// src/components/contact/ContactForm.tsx
import { useState } from 'react';
import type { FormEvent } from 'react';

type Status = 'idle' | 'sending' | 'success' | 'error';

export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch('https://formspree.io/f/mrbajbon', {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        setStatus('success');
        setMessage('Thank you! Your message has been sent.');
        form.reset();
      } else {
        setStatus('error');
        setMessage('Oops! Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error! Please check your connection and try again.');
    }
  }

  const inputClass = 'w-full px-4 py-3 rounded-card border border-border-color bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300';
  const labelClass = 'block text-sm font-medium text-text-primary mb-2';

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div>
        <label htmlFor="name" className={labelClass}>Name</label>
        <input id="name" name="name" type="text" required placeholder="Your name" className={inputClass} />
      </div>
      <div>
        <label htmlFor="email" className={labelClass}>Email</label>
        <input id="email" name="email" type="email" required placeholder="your@email.com" className={inputClass} />
      </div>
      <div>
        <label htmlFor="subject" className={labelClass}>Subject</label>
        <input id="subject" name="subject" type="text" required placeholder="What's this about?" className={inputClass} />
      </div>
      <div>
        <label htmlFor="message" className={labelClass}>Message</label>
        <textarea id="message" name="message" required rows={6} placeholder="Your message..." className={inputClass} style={{ resize: 'vertical' }} />
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full py-4 px-8 rounded-card font-semibold text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-medium disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        style={{ background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))' }}
      >
        {status === 'sending' ? 'Sending...' : 'Send Message'}
      </button>

      {message && (
        <p
          className={`text-sm font-medium text-center py-3 px-4 rounded-card transition-opacity duration-300 ${
            status === 'success' ? 'bg-accent/10 text-accent' : 'bg-red-50 text-red-600'
          }`}
          role="alert"
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </form>
  );
}
