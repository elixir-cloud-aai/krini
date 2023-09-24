import { useEffect } from 'react';
import 'vanilla-cookieconsent';
import 'vanilla-cookieconsent/dist/cookieconsent.css';

const pluginConfig = {
  current_lang: 'en',
  autoclear_cookies: true,
  page_scripts: true,
  force_consent: true,
  gui_options: {
    consent_modal: {
      layout: 'bar',
      position: 'bottom center',
      transition: 'slide',
      swap_buttons: true
    }
  },
  onAccept: function (cookie) {
    // check for production environment
    if (process.env.NODE_ENV === 'production') {
      // handle analytics cookies
      if (cookie.categories.includes('analytics')) {
        window.GAConsentGranted();
      }
    }
  },
  languages: {
    en: {
      consent_modal: {
        title: 'Cookie consent',
        description:
          'We use cookies to recognize your repeated visits and preferences, as well as to measure the effectiveness of our documentation and whether users find what they\'re searching for. With your consent, you\'re helping us to make our documentation better. <button type="button" data-cc="c-settings" class="cc-link"> Let me choose</button>',
        primary_btn: {
          text: 'Accept all',
          role: 'accept_all'
        },
        secondary_btn: {
          text: 'Reject',
          role: 'accept_necessary'
        }
      },
      settings_modal: {
        title: 'Cookie Settings',
        save_settings_btn: 'Save settings',
        accept_all_btn: 'Accept all',
        reject_all_btn: 'Reject',
        close_btn_label: 'Close',
        cookie_table_headers: [
          { col1: 'Name' },
          { col2: 'Domain' },
          { col3: 'Expiration' },
          { col4: 'Description' }
        ],
        blocks: [
          {
            title: 'Cookie usage',
            description:
              'We use cookies to ensure the basic functionalities of the website and to enhance your online experience. You can choose for each category to opt-in/out whenever you want.'
          },
          {
            title: 'Strictly necessary cookies',
            description:
              'These cookies are essential for the proper functioning of the website. Without these cookies, the website would not work properly',
            toggle: {
              value: 'necessary',
              enabled: true,
              readonly: true
            }
          },
          {
            title: 'Analytics cookies',
            description:
              'These cookies are used to collect information about how you use our website. The information collected includes the number of visitors, the source of traffic, and the pages visited anonymously.',
            toggle: {
              value: 'analytics',
              enabled: true,
              readonly: false
            }
          },
          {
            title: 'More information',
            description:
              'For any queries in relation to our policy on cookies and your choices, please <a class="cc-link" href="mailto:cloud-service@elixir-europe.org">contact us</a>.'
          }
        ]
      }
    }
  }
};

const CookieConsent = () => {
  useEffect(() => {
    if (!document.getElementById('cc--main')) {
      window.CookieConsentApi = window.initCookieConsent();
      window.CookieConsentApi.run(pluginConfig);
    }
  }, []);

  return null;
};

export default CookieConsent;
