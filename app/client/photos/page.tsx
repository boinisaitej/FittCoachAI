import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PhotosManager } from "./photos-manager";

export default async function PhotosPage() {
  const user = await requireRole("client");
  const supabase = createClient();
  const { data: photos } = await supabase
    .from("progress_photos")
    .select("id,kind,storage_path,notes,taken_at")
    .eq("client_id", user.id)
    .order("taken_at", { ascending: false });

  // Sign URLs for private bucket
  const withUrls = await Promise.all(
    (photos ?? []).map(async (p) => {
      const { data } = await supabase.storage.from("progress-photos").createSignedUrl(p.storage_path, 60 * 60);
      return { ...p, url: data?.signedUrl ?? "" };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Progress photos</h1>
        <p className="text-sm text-muted-foreground">Upload Before / Progress / After photos and watch the transformation.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotosManager photos={withUrls} clientId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
