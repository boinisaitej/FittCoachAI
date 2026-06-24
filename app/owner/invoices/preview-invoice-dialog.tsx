"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, ExternalLink, Eye, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Reusable preview + download dialog for any invoice. Used by both owner
 * (`/owner/invoices`) and client (`/client/invoices`) lists. Reuses the
 * existing `/api/invoices/[id]/pdf` endpoint:
 *   • plain URL  → inline preview in the iframe
 *   • ?download=1 → forces a browser save-as
 */
export function PreviewInvoiceDialog({
  invoiceId,
  invoiceNumber,
  total,
  status,
}: {
  invoiceId: string;
  invoiceNumber: string;
  total: string;
  status: string;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const previewUrl = `/api/invoices/${invoiceId}/pdf`;
  const downloadUrl = `/api/invoices/${invoiceId}/pdf?download=1`;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setLoaded(false);
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        title="Preview invoice"
        className="gap-1"
      >
        <Eye className="h-4 w-4" />
        <span className="hidden sm:inline">Preview</span>
      </Button>

      <DialogContent className="max-w-[min(96vw,1024px)] p-0 sm:max-w-[1024px]">
        <DialogHeader className="border-b px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base">
                Invoice <span className="font-mono">{invoiceNumber}</span>
              </DialogTitle>
              <Badge variant={status === "paid" ? "success" : "outline"} className="capitalize">
                {status}
              </Badge>
              <Badge variant="secondary" className="tabular-nums">
                {total}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button asChild variant="outline" size="sm">
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" title="Open in new tab">
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">New tab</span>
                </a>
              </Button>
              <Button asChild variant="gradient" size="sm">
                <a href={downloadUrl} download={`${invoiceNumber}.pdf`} title="Download PDF">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download</span>
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="relative h-[78vh] bg-muted/30">
          <AnimatePresence>
            {!loaded && (
              <motion.div
                key="ld"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground"
              >
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>Rendering PDF…</span>
              </motion.div>
            )}
          </AnimatePresence>
          <iframe
            src={previewUrl}
            title={`Invoice ${invoiceNumber}`}
            className="h-full w-full"
            onLoad={() => setLoaded(true)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
