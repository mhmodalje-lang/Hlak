/**
 * BARBER HUB - SEO Head updater
 * Updates <title>, meta description and OG tags dynamically per page.
 */
import { useEffect } from 'react';

const SEOHead = ({ title, description, image, url }) => {
  useEffect(() => {
    if (title) {
      document.title = title;
    }
    const setMeta = (name, content, prop = false) => {
      if (!content) return;
      const attr = prop ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    if (description) {
      setMeta('description', description);
      setMeta('og:description', description, true);
      setMeta('twitter:description', description);
    }
    if (title) {
      setMeta('og:title', title, true);
      setMeta('twitter:title', title);
    }
    if (image) {
      setMeta('og:image', image, true);
      setMeta('twitter:image', image);
    }
    if (url) {
      setMeta('og:url', url, true);
    }
  }, [title, description, image, url]);
  return null;
};

export default SEOHead;
