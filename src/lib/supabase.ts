import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://nqarwtzvludtnxduezrg.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_CPyNmn9DGEUQi604gqX-DQ_UPaKxJgp";

export const supabase = createClient(supabaseUrl, supabaseKey);

export const BUCKET_NAME = "lead-documents";

export async function ensureBucketExists() {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error("Error listing buckets:", error);
      return;
    }

    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);
    if (!bucketExists) {
      const { data, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 25 * 1024 * 1024, // 25MB max per document
      });
      if (createError) {
        console.warn("Notice: bucket creation via anon key:", createError.message);
      } else {
        console.log(`Created Supabase Storage Bucket: ${BUCKET_NAME}`);
      }
    }
  } catch (err) {
    console.error("ensureBucketExists error:", err);
  }
}
