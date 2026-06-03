-- Add onboarding completion flag to users table
-- This field tracks whether a user has completed the onboarding wizard
-- Used to show/hide the onboarding wizard on first login

ALTER TABLE public.users
ADD COLUMN has_completed_onboarding BOOLEAN DEFAULT false;

-- Add index for better performance when querying users who haven't completed onboarding
CREATE INDEX idx_users_onboarding ON public.users(has_completed_onboarding) WHERE has_completed_onboarding = false;

-- Comment for documentation
COMMENT ON COLUMN public.users.has_completed_onboarding IS 'Whether this user has completed the onboarding wizard (true) or not (false). Used to show onboarding on first login.';
