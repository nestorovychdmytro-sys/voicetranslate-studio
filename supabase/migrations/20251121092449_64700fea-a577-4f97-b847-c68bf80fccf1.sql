-- Create storage bucket for translated videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('translated-videos', 'translated-videos', true);

-- Create RLS policies for the bucket
CREATE POLICY "Anyone can view translated videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'translated-videos');

CREATE POLICY "Anyone can upload translated videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'translated-videos');