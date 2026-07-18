"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toastPaymentRequired } from "@/lib/toastPaymentRequired";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

interface UploadZoneProps {
  onUploaded: () => void;
}

export function UploadZone({ onUploaded }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function validateFile(file: File): string | null {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return "Tipo de arquivo não suportado. Envie um PDF, DOCX ou PPTX.";
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return "O arquivo excede o tamanho máximo permitido de 50MB.";
    }

    return null;
  }

  function upload(file: File) {
    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setProgress(0);

    const title = file.name.replace(/\.[^/.]+$/, "");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/v1/documents");

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      setProgress(null);

      if (xhr.status >= 200 && xhr.status < 300) {
        onUploaded();
        return;
      }

      try {
        const body = JSON.parse(xhr.responseText);

        if (!toastPaymentRequired(xhr.status, body)) {
          setError(body?.message ?? "Não foi possível enviar o arquivo.");
        }
      } catch {
        setError("Não foi possível enviar o arquivo.");
      }
    });

    xhr.addEventListener("error", () => {
      setProgress(null);
      setError("Não foi possível enviar o arquivo.");
    });

    xhr.send(formData);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];

    if (file) {
      upload(file);
    }
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Arraste um arquivo aqui ou
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          Escolher arquivo
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_MIME_TYPES.join(",")}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              upload(file);
            }

            event.target.value = "";
          }}
        />
      </div>

      {progress !== null && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
