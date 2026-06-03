-- Create print jobs table for Lulu integration
-- Tracks print jobs created through Lulu API

CREATE TABLE public.print_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  lulu_print_job_id TEXT UNIQUE NOT NULL,
  external_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CREATED',
  total_cost_incl_tax TEXT,
  shipping_address JSONB NOT NULL,
  shipping_level TEXT NOT NULL,
  line_items JSONB NOT NULL,
  product_id TEXT,
  print_job_data JSONB,
  webhook_updates JSONB[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_print_jobs_user_id ON public.print_jobs(user_id);
CREATE INDEX idx_print_jobs_book_id ON public.print_jobs(book_id);
CREATE INDEX idx_print_jobs_lulu_id ON public.print_jobs(lulu_print_job_id);
CREATE INDEX idx_print_jobs_status ON public.print_jobs(status);
CREATE INDEX idx_print_jobs_external_id ON public.print_jobs(external_id);

-- Add updated_at trigger
CREATE TRIGGER trigger_print_jobs_update_updated_at 
  BEFORE UPDATE ON public.print_jobs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.print_jobs IS 'Tracks print jobs created through Lulu API';
COMMENT ON COLUMN public.print_jobs.lulu_print_job_id IS 'Print job ID from Lulu API';
COMMENT ON COLUMN public.print_jobs.external_id IS 'Our internal tracking ID for the print job';
COMMENT ON COLUMN public.print_jobs.status IS 'Current status of the print job from Lulu';
COMMENT ON COLUMN public.print_jobs.print_job_data IS 'Full print job response from Lulu API';
COMMENT ON COLUMN public.print_jobs.webhook_updates IS 'Array of webhook updates received from Lulu';