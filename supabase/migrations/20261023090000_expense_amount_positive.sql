-- ROADMAP 101.2 — AN EXPENSE IS MONEY THAT WENT OUT, SO ITS AMOUNT IS ABOVE ZERO.
--
-- `expenses.amount` was `numeric not null` with nothing else, and the Add expense
-- sheet saved any non-zero number, so a -50 (minus key on a phone pad, a pasted
-- -189) was stored and "Earned less expenses" went UP. The sheet now refuses it
-- too (`ExpenseModal.jsx`); this is the same rule where every writer meets it.
--
-- If applying this fails with "is violated by some row", a negative or zero
-- expense is already stored. Find it with
--   select id, business_id, date, amount from public.expenses where amount <= 0;
-- and correct or remove it, then apply again. Nothing here rewrites data.

alter table public.expenses
  add constraint expenses_amount_positive check (amount > 0);
