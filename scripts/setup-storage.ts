import "dotenv/config";
import { Client } from "pg";

async function setupStorage() {
  const rawConn = (process.env.DIRECT_URL || process.env.DATABASE_URL || "").replace("?sslmode=require", "").replace("&sslmode=require", "");
  console.log("Connecting directly to Supabase PostgreSQL...");

  const client = new Client({
    connectionString: rawConn,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to Supabase PostgreSQL database directly.");

  // 1. Create or ensure bucket exists in storage.buckets
  await client.query(`
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('lead-documents', 'lead-documents', true, 26214400, NULL)
    ON CONFLICT (id) DO UPDATE SET public = true;
  `);
  console.log("Bucket 'lead-documents' created/verified in storage.buckets.");

  // 2. Add Storage RLS policies so uploads and downloads work seamlessly
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow All Operations lead-documents'
      ) THEN
        CREATE POLICY "Allow All Operations lead-documents"
        ON storage.objects FOR ALL
        USING (bucket_id = 'lead-documents')
        WITH CHECK (bucket_id = 'lead-documents');
      END IF;
    END $$;
  `);
  console.log("Storage policies for 'lead-documents' configured successfully!");

  await client.end();
}

setupStorage().catch(console.error);
