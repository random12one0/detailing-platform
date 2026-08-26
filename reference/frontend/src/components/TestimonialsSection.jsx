import React from 'react';
import CatalogEditor from './CatalogEditor';

// Reviews / testimonials manager. Reuses the generic CatalogEditor pattern.
// Only these keys are sent on save, so no extra columns are ever touched.
const testimonialsConfig = {
  table: 'testimonials',
  title: 'Reviews',
  subtitle: 'Customer testimonials shown in the "What Local Drivers Say" section on the public site.',
  itemLabel: 'Review',
  orderBy: { column: 'sort_order', ascending: true },
  titleField: 'author',
  subtitleField: 'quote',
  badgeKeys: ['source'],
  fields: [
    { key: 'author', label: 'Author', type: 'text', required: true, placeholder: 'e.g. Marisol R.' },
    { key: 'quote', label: 'Quote', type: 'textarea', required: true, placeholder: 'What the customer said…' },
    { key: 'rating', label: 'Rating', type: 'number', suffix: '★', placeholder: '5', help: 'Star rating from 1 to 5.' },
    { key: 'source', label: 'Source', type: 'text', placeholder: 'e.g. Google, Yelp' },
    { key: 'sort_order', label: 'Sort Order', type: 'number', placeholder: '0', help: 'Lower numbers appear first.' },
    { key: 'is_active', label: 'Active (visible on the site)', type: 'switch', default: true },
  ],
};

const TestimonialsSection = () => (
  <div>
    <CatalogEditor config={testimonialsConfig} />
  </div>
);

export default TestimonialsSection;
