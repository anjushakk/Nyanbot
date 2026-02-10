import { motion, AnimatePresence } from "framer-motion";
import { FileText, X, CheckCircle2, Loader2 } from "lucide-react";

export interface UploadedPdf {
  name: string;
  status: "uploading" | "processing" | "ready";
  pages?: number;
}

interface PdfUploadBannerProps {
  files: UploadedPdf[];
  onRemove: (name: string) => void;
}

const PdfUploadBanner = ({ files, onRemove }: PdfUploadBannerProps) => {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-6 pb-2">
      <AnimatePresence>
        {files.map((f) => (
          <motion.div
            key={f.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-xs"
          >
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span className="text-foreground truncate max-w-[150px]">{f.name}</span>
            {f.status === "ready" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-neon-cyan" />
            ) : (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            )}
            {f.pages && <span className="text-muted-foreground">{f.pages}p</span>}
            <button onClick={() => onRemove(f.name)} className="text-muted-foreground hover:text-destructive transition-colors">
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default PdfUploadBanner;
