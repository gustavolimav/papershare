import crypto from "crypto";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { ServiceError } from "./errors";
import type { StorageModel } from "../types/index";

const bucket = process.env.STORAGE_BUCKET ?? "";

const client = new S3Client({
  region: process.env.STORAGE_REGION ?? "us-east-1",
  forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? "",
  },
  ...(process.env.STORAGE_ENDPOINT !== undefined && {
    endpoint: process.env.STORAGE_ENDPOINT,
  }),
});

let bucketEnsured = false;

async function ensureBucketExists(): Promise<void> {
  if (bucketEnsured) {
    return;
  }

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (error) {
      const errorName = (error as { name?: string }).name;

      if (
        errorName !== "BucketAlreadyOwnedByYou" &&
        errorName !== "BucketAlreadyExists"
      ) {
        throw new ServiceError({
          cause: error as Error,
          message: "Não foi possível preparar o armazenamento de arquivos.",
        });
      }
    }
  }

  bucketEnsured = true;
}

async function saveFile(
  file: Buffer,
  originalFilename: string,
): Promise<{ key: string; size: number }> {
  if (process.env.NODE_ENV === "test") {
    return {
      key: `test-${crypto.randomUUID()}${path.extname(originalFilename)}`,
      size: file.length,
    };
  }

  const key = `${crypto.randomUUID()}${path.extname(originalFilename)}`;

  await ensureBucketExists();

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file,
      }),
    );
  } catch (error) {
    throw new ServiceError({
      cause: error as Error,
      message: "Não foi possível salvar o arquivo.",
    });
  }

  return { key, size: file.length };
}

async function deleteFile(key: string): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    throw new ServiceError({
      cause: error as Error,
      message: "Não foi possível remover o arquivo.",
    });
  }
}

const storage: StorageModel = {
  saveFile,
  deleteFile,
};

export default storage;
