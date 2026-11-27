import { useId } from "react";
import { Plus, X } from "lucide-react";
import { Segmented } from "./controls.jsx";
import { t } from "../lib/appI18n.js";

import { rowSchemas } from "../../../supabase/functions/_shared/setupQuestions.js";
import { VEHICLE_BODY_TYPES } from "../book/core.js";

const actions = {
  days_off: "Add closure",
  special_hours: "Add date",
  service_periods: "Add date range",
  credentials: "Add qualification",
  templates: "Add message",
  email_footers: "Add email note",
  weather_alerts: "Add warning",
  vehicle_sizes: "Add size",
  service_groups: "Add category",
  services: "Add service",
  addons: "Add add-on",
  size_prices: "Add size price",
  travel_zones: "Add area",
  price_rules: "Add fee",
  pay_custom: "Add payment method",
  plans: "Add plan",
  promos: "Add code",
};
function Records({ field, value = [], onChange }) {
  const schema = rowSchemas[field.key];
  return (
    <fieldset className="sq-field sq-records">
      <legend>{t(field.label)}</legend>
      {value.map((row, index) => (
        <div className="sq-record" key={index}>
          <button
            type="button"
            className="btn icon ghost sq-remove"
            aria-label={t("Remove row {n}", { n: index + 1 })}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <X size={18} />
          </button>
          {schema.map((f) => (
            <QuestionField
              key={f.key}
              field={f}
              value={row[f.key]}
              onChange={(v) =>
                onChange(
                  value.map((r, i) => (i === index ? { ...r, [f.key]: v } : r)),
                )
              }
            />
          ))}
        </div>
      ))}
      <button
        type="button"
        className="btn inline"
        onClick={() => onChange([...value, {}])}
      >
        <Plus size={16} />
        {t(actions[field.key])}
      </button>
    </fieldset>
  );
}

export function answerText(field, value) {
  if (field.type === "rows")
    return value
      .map((row) =>
        rowSchemas[field.key]
          .filter((f) => row[f.key] != null && row[f.key] !== "")
          .map(
            (f, i) =>
              (i === 0 ? "" : t(f.label) + " · ") + answerText(f, row[f.key]),
          )
          .join("\n"),
      )
      .join("\n\n");
  if (field.type === "choice")
    return t(field.options.find(([k]) => k === value)?.[1] ?? "");
  if (field.type === "bool") return t(value ? "Yes" : "No");
  if (field.type === "weekdays") return value.map((n) => t(days[n])).join(", ");
  if (field.type === "tasks")
    return value
      .map((k) => t(field.options.find(([v]) => v === k)?.[1]))
      .join(", ");
  if (field.type === "bodyTypes")
    return value
      .map((k) => t(VEHICLE_BODY_TYPES.find((b) => b.key === k)?.label ?? k))
      .join(", ");
  if (field.type === "lines") return value.join(", ");
  return String(value);
}

export const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
function FaqEditor({ field, value = [], onChange }) {
  return (
    <fieldset className="sq-field">
      <legend>{t(field.label)}</legend>
      {value.map((row, index) => (
        <div className="sq-row" key={index}>
          {[
            ["q", "Question"],
            ["a", "Answer"],
          ].map(([key, label]) => (
            <label key={key}>
              {t(label)}
              <input
                value={row[key] ?? ""}
                onChange={(e) =>
                  onChange(
                    value.map((r, i) =>
                      i === index ? { ...r, [key]: e.target.value } : r,
                    ),
                  )
                }
              />
            </label>
          ))}
          <button
            className="btn icon ghost"
            type="button"
            aria-label={t("Remove row {n}", { n: index + 1 })}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <X size={18} />
          </button>
        </div>
      ))}
      <button
        className="btn inline"
        type="button"
        onClick={() => onChange([...value, { q: "", a: "" }])}
      >
        <Plus size={16} />
        {t("Add a question")}
      </button>
    </fieldset>
  );
}

function WeekEditor({ value = [], onChange }) {
  const setDay = (weekday, record) =>
    onChange(
      [
        ...value.filter((r) => r.weekday !== weekday),
        ...(record ? [{ ...record, weekday }] : []),
      ].sort((a, b) => a.weekday - b.weekday),
    );
  return (
    <fieldset className="sq-field">
      <legend>{t("Weekly hours")}</legend>
      {[1, 2, 3, 4, 5, 6, 0].map((day) => {
        const row = value.find((r) => r.weekday === day);
        return (
          <div className="sq-day" key={day}>
            <strong>{t(days[day])}</strong>
            <Segmented
              label={t(days[day])}
              value={!row ? "keep" : row.closed ? "closed" : "open"}
              options={[
                ["keep", "Keep hours"],
                ["open", "Open"],
                ["closed", "Closed"],
              ]}
              onChange={(v) =>
                setDay(
                  day,
                  v === "keep"
                    ? null
                    : v === "closed"
                      ? { closed: true }
                      : { closed: false, open: "09:00", close: "17:00" },
                )
              }
            />
            {day === 1 && row && (
              <button
                type="button"
                className="btn inline"
                onClick={() =>
                  onChange([
                    ...value.filter((r) => r.weekday === 0 || r.weekday === 6),
                    ...[1, 2, 3, 4, 5].map((weekday) => ({ ...row, weekday })),
                  ])
                }
              >
                {t("Use Monday’s hours for all weekdays")}
              </button>
            )}
            {row && !row.closed && (
              <div className="sq-times">
                {["open", "close"].map((k) => (
                  <label key={k}>
                    {t(k === "open" ? "Opens" : "Closes")}
                    <input
                      type="time"
                      value={row[k]}
                      aria-label={
                        t(days[day]) +
                        " " +
                        t(k === "open" ? "Opens" : "Closes")
                      }
                      onChange={(e) =>
                        setDay(day, { ...row, [k]: e.target.value })
                      }
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}

export default function QuestionField({ field, value, onChange }) {
  const id = useId();
  if (field.type === "rows")
    return <Records field={field} value={value} onChange={onChange} />;
  if (field.type === "lines")
    return (
      <label className="sq-field">
        {t(field.label)}
        <textarea
          aria-label={t(field.label)}
          rows={3}
          value={(value ?? []).join("\n")}
          onChange={(e) => onChange(e.target.value.split("\n"))}
        />
      </label>
    );
  if (field.type === "choice" && field.options.length > 5)
    return (
      <label className="sq-field">
        {t(field.label)}
        <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {field.options.map(([k, l]) => (
            <option key={k} value={k}>
              {t(l)}
            </option>
          ))}
        </select>
      </label>
    );
  if (field.type === "bool")
    return (
      <fieldset className="sq-field">
        <legend>{t(field.label)}</legend>
        <Segmented
          label={t(field.label)}
          value={value}
          options={[
            [true, "Yes"],
            [false, "No"],
          ]}
          onChange={onChange}
        />
      </fieldset>
    );
  if (["bodyTypes", "weekdays", "tasks"].includes(field.type)) {
    const choices =
      field.type === "tasks"
        ? field.options
        : field.type === "bodyTypes"
          ? VEHICLE_BODY_TYPES.map((b) => [b.key, b.label])
          : days.map((d, i) => [i, d]);
    return (
      <fieldset className="sq-field">
        <legend>{t(field.label)}</legend>
        <div className="sq-ticks">
          {choices.map(([k, l]) => (
            <label key={k}>
              <input
                type="checkbox"
                checked={value?.includes(k) ?? false}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...(value ?? []), k]
                      : value.filter((n) => n !== k),
                  )
                }
              />
              {t(l)}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  if (field.type === "faqs")
    return <FaqEditor field={field} value={value} onChange={onChange} />;
  if (field.type === "color")
    return (
      <fieldset className="sq-field">
        <legend>{t(field.label)}</legend>
        <div className="sq-color">
          <input
            type="color"
            aria-label={t("Pick a color")}
            value={/^#[0-9a-f]{6}$/i.test(value ?? "") ? value : "#247b55"}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            type="text"
            aria-label={t("Hex color")}
            placeholder="#247B55"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </fieldset>
    );
  if (field.type === "hours")
    return <WeekEditor value={value} onChange={onChange} />;
  if (field.type === "choice")
    return (
      <fieldset className="sq-field">
        <legend>{t(field.label)}</legend>
        <Segmented
          label={t(field.label)}
          value={value}
          options={field.options}
          onChange={onChange}
        />
      </fieldset>
    );
  const numeric = ["integer", "money", "positive"].includes(field.type);
  const timezones =
    field.type === "timezone"
      ? (Intl.supportedValuesOf?.("timeZone") ?? [])
      : [];
  return (
    <label className="sq-field" htmlFor={id}>
      {t(field.label)}
      {field.type === "long" ? (
        <textarea
          id={id}
          rows={3}
          maxLength={4000}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          type={
            numeric
              ? "number"
              : field.type === "color"
                ? "text"
                : ["url", "tel", "email", "time", "date"].includes(field.type)
                  ? field.type
                  : "text"
          }
          placeholder={
            field.type === "color"
              ? "#247B55"
              : field.type === "timezone"
                ? "America/Los_Angeles"
                : undefined
          }
          list={timezones.length ? id + "zones" : undefined}
          min={field.min ?? (field.type === "positive" ? 1 : 0)}
          max={field.max}
          step={field.type === "money" ? "0.01" : numeric ? "1" : undefined}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.key === "cancellation_window_hours" && (
        <small className="quiet">
          {t(
            "For example, enter 24 to let customers cancel or reschedule online until one day before their appointment. Enter 0 to allow changes until the appointment starts.",
          )}
        </small>
      )}
      {timezones.length > 0 && (
        <datalist id={id + "zones"}>
          {timezones.map((z) => (
            <option key={z} value={z} />
          ))}
        </datalist>
      )}
    </label>
  );
}
