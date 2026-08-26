import React from 'react';
import CatalogEditor from './CatalogEditor';

// Field sets mirror the DB columns. Only these keys are ever sent on save,
// so derived / legacy columns are never touched.
const packagesConfig = {
  table: 'packages',
  title: 'Services (Packages)',
  subtitle: 'Interior & exterior detailing tiers shown on the public site.',
  itemLabel: 'Service',
  orderBy: { column: 'base_price', ascending: true },
  priceField: { key: 'base_price', type: 'money' },
  badgeKeys: ['category', 'tier'],
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Ultimate Interior' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Short summary shown under the title' },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { value: 'interior', label: 'Interior' },
        { value: 'exterior', label: 'Exterior' },
      ],
    },
    {
      key: 'tier',
      label: 'Tier',
      type: 'select',
      options: [
        { value: 'standard', label: 'Standard' },
        { value: 'deluxe', label: 'Deluxe' },
        { value: 'ultimate', label: 'Ultimate' },
      ],
    },
    { key: 'base_price', label: 'Base Price', type: 'money', prefix: '$', required: true, placeholder: '0.00' },
    { key: 'duration_minutes', label: 'Duration', type: 'number', suffix: 'min', placeholder: '60' },
    { key: 'is_active', label: 'Active (visible to customers)', type: 'switch', default: true },
    { key: 'features', label: 'Features', type: 'features' },
    { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Extra fine print or internal notes' },
  ],
};

const addOnsConfig = {
  table: 'add_ons',
  title: 'Add-Ons',
  subtitle: 'Optional extras customers can attach to a booking.',
  itemLabel: 'Add-On',
  orderBy: { column: 'sort_order', ascending: true },
  priceField: { key: 'price', type: 'money' },
  badgeKeys: ['type'],
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Pet Hair Removal' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Short summary shown under the title' },
    { key: 'price', label: 'Price', type: 'money', prefix: '$', required: true, placeholder: '0.00' },
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'interior', label: 'Interior' },
        { value: 'exterior', label: 'Exterior' },
      ],
    },
    { key: 'duration_minutes', label: 'Duration', type: 'number', suffix: 'min', placeholder: '15' },
    { key: 'sort_order', label: 'Sort Order', type: 'number', placeholder: '0', help: 'Lower numbers appear first.' },
    { key: 'is_active', label: 'Active (visible to customers)', type: 'switch', default: true },
    { key: 'features', label: 'Features', type: 'features' },
    { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Extra fine print or internal notes' },
  ],
};

const monthlyPlansConfig = {
  table: 'monthly_plans',
  title: 'Monthly Plans',
  subtitle: 'Recurring maintenance plans and their discounts.',
  itemLabel: 'Plan',
  orderBy: { column: 'name', ascending: true },
  priceField: { key: 'discount', type: 'discount', valueKey: 'discount_value', typeKey: 'discount_type' },
  badgeKeys: [],
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Monthly Maintenance' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Short summary of the plan' },
    {
      key: 'discount_type',
      label: 'Discount Type',
      type: 'select',
      options: [
        { value: 'percentage', label: 'Percentage (%)' },
        { value: 'amount', label: 'Fixed Amount ($)' },
      ],
    },
    { key: 'discount_value', label: 'Discount Value', type: 'money', placeholder: '10' },
    { key: 'is_active', label: 'Active (visible to customers)', type: 'switch', default: true },
  ],
};

const ServicesAndAddOnsSection = () => (
  <div>
    <CatalogEditor config={packagesConfig} />
    <CatalogEditor config={addOnsConfig} />
    <CatalogEditor config={monthlyPlansConfig} />
  </div>
);

export default ServicesAndAddOnsSection;
