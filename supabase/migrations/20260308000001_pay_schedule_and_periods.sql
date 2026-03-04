-- ============================================================
-- Pay Schedule & Pay Periods
-- ============================================================

-- pay_schedule JSONB on distributors
-- Shape: { frequency, pay_day, first_pay_date, commission_lag }
ALTER TABLE distributors ADD COLUMN pay_schedule jsonb;

-- pay_periods table
CREATE TABLE pay_periods (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  distributor_id  uuid REFERENCES distributors(id),
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  expected_amount numeric(10,2),
  actual_amount   numeric(10,2),
  status          text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','closed','paid','discrepancy')),
  paid_at         timestamptz,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, distributor_id, period_start, period_end)
);

CREATE INDEX idx_pay_periods_account_status ON pay_periods(account_id, status);
CREATE INDEX idx_pay_periods_period_end ON pay_periods(period_end);

-- RLS
ALTER TABLE pay_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pay_periods_select" ON pay_periods
  FOR SELECT USING (account_id = get_account_id());
CREATE POLICY "pay_periods_insert" ON pay_periods
  FOR INSERT WITH CHECK (account_id = get_account_id());
CREATE POLICY "pay_periods_update" ON pay_periods
  FOR UPDATE USING (account_id = get_account_id());
CREATE POLICY "pay_periods_delete" ON pay_periods
  FOR DELETE USING (account_id = get_account_id());

-- Link commissions to pay periods
ALTER TABLE commissions ADD COLUMN pay_period_id uuid REFERENCES pay_periods(id);
