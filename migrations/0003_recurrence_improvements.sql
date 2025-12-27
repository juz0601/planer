-- Migration 0003: Improve recurrence rules
-- Adds support for custom units and monthly week-based recurrence

ALTER TABLE recurrence_rules ADD COLUMN week_of_month INTEGER; -- 1-5 for "first Monday", "second Tuesday", etc.
ALTER TABLE recurrence_rules ADD COLUMN day_of_week_for_month INTEGER; -- 0-6 for day of week when using week_of_month
ALTER TABLE recurrence_rules ADD COLUMN custom_unit TEXT CHECK(custom_unit IN ('hours', 'days', 'weeks', 'months')); -- Unit for custom recurrence


