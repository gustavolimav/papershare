/* eslint-disable no-unused-vars */
import type { QueryResult, QueryResultRow } from "pg";
import type { NextApiRequest, NextApiResponse } from "next";

// Database Models
export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface UserPublic {
  id: string;
  username: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  token: string;
  user_id: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Document {
  id: string;
  title: string;
  description: string | null;
  original_filename: string;
  storage_key: string;
  mime_type: string;
  size_bytes: number;
  page_count: number | null;
  user_id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export type DocumentResponse = Document;

export interface DocumentListResponse {
  documents: DocumentResponse[];
  total: number;
}

export interface ShareLink {
  id: string;
  token: string;
  document_id: string;
  user_id: string;
  label: string | null;
  password_hash: string | null;
  expires_at: Date | null;
  allow_download: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ShareLinkResponse {
  id: string;
  token: string;
  document_id: string;
  user_id: string;
  label: string | null;
  expires_at: Date | null;
  allow_download: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  has_password: boolean;
}

// Deliberately narrower than ShareLinkResponse: this is what the public,
// unauthenticated endpoint returns, so it must not leak the link's
// document_id/user_id/updated_at or the document's storage_key/user_id/timestamps.
export interface ShareLinkWithDocument {
  id: string;
  token: string;
  label: string | null;
  expires_at: Date | null;
  allow_download: boolean;
  is_active: boolean;
  created_at: Date;
  has_password: boolean;
  document: {
    id: string;
    title: string;
    description: string | null;
    mime_type: string;
    size_bytes: number;
    page_count: number | null;
  };
}

export interface LinkView {
  id: string;
  share_link_id: string;
  viewer_fingerprint: string | null;
  ip_address: string | null;
  country_code: string | null;
  user_agent: string | null;
  time_on_page: number | null;
  pages_viewed: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface ViewsByDay {
  date: string;
  count: number;
}

export interface LinkViewAnalytics {
  total_views: number;
  unique_viewers: number;
  avg_time_on_page: number | null;
  avg_pages_viewed: number | null;
  first_viewed_at: Date | null;
  last_viewed_at: Date | null;
  views_by_day: ViewsByDay[];
}

export type LinkAnalyticsResponse = LinkViewAnalytics;

export interface TopLink {
  link_id: string;
  label: string | null;
  total_views: number;
}

export interface DocumentAnalyticsResponse extends LinkViewAnalytics {
  top_links: TopLink[];
}

// Input Types
export interface UserCreateInput {
  username: string;
  email: string;
  password: string;
}

export interface UserUpdateInput {
  username?: string;
  email?: string;
  password?: string;
}

export interface AuthenticationInput {
  email: string;
  password: string;
}

export interface DocumentCreateInput {
  title: string;
  description?: string;
  original_filename: string;
  storage_key: string;
  mime_type: string;
  size_bytes: number;
  page_count: number | null;
  user_id: string;
}

export interface DocumentUpdateInput {
  title?: string;
  description?: string;
}

export interface ShareLinkCreateInput {
  label?: string;
  password?: string;
  expires_at?: string;
  allow_download?: boolean;
}

export interface ShareLinkUpdateInput {
  label?: string | null;
  password?: string | null;
  expires_at?: string | null;
  allow_download?: boolean;
  is_active?: boolean;
}

export interface LinkViewCreateInput {
  viewer_fingerprint?: string;
  ip_address?: string;
  user_agent?: string;
  time_on_page?: number;
  pages_viewed?: number;
}

// Database Query Types
export interface DatabaseQuery {
  text: string;
  values?: any[];
}

export interface DatabaseResult<T extends QueryResultRow = any>
  extends QueryResult<T> {
  rows: T[];
  rowCount: number | null;
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  action?: string;
}

export interface StatusResponse {
  updated_at: string;
  dependencies: {
    database: {
      version: string;
      max_connections: number;
      opened_connections: number;
    };
  };
}

// Error Types
export interface ErrorResponse {
  name: string;
  message: string;
  action: string;
  status: number;
}

export interface ErrorConstructorOptions {
  cause?: Error;
  message?: string;
  action?: string;
  statusCode?: number;
}

// Next.js API Types
export interface AuthenticatedNextApiRequest extends NextApiRequest {
  user?: User;
  session?: Session;
}

export type NextApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
) => void | Promise<void>;

// Migration Types
export interface Migration {
  id: number;
  name: string;
  run_on: Date;
}

export interface RunMigration {
  path: string;
  name: string;
  timestamp: string;
}

// Model Interface Types
export interface UserModel {
  create(userInput: UserCreateInput): Promise<UserPublic>;
  findOneByUsername(username: string): Promise<User>;
  findOneByEmail(email: string): Promise<User>;
  updateByUsername(
    username: string,
    userInput: UserUpdateInput,
  ): Promise<UserPublic>;
  deleteByUsername(username: string): Promise<void>;
}

export interface PasswordModel {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

export interface SessionModel {
  create(userId: string): Promise<Session>;
  findOneByToken(token: string): Promise<Session | null>;
  deleteByToken(token: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  EXPIRATION_IN_MILLISECONDS: number;
}

export interface AuthenticationModel {
  getAuthentication(email: string, password: string): Promise<User>;
}

export interface DocumentModel {
  create(input: DocumentCreateInput): Promise<DocumentResponse>;
  findAllByUserId(
    userId: string,
    pagination: { page: number; perPage: number },
  ): Promise<DocumentListResponse>;
  findOneById(id: string, userId: string): Promise<DocumentResponse>;
  updateById(
    id: string,
    userId: string,
    input: DocumentUpdateInput,
  ): Promise<DocumentResponse>;
  deleteById(id: string, userId: string): Promise<{ storage_key: string }>;
}

export interface ShareLinkModel {
  create(
    documentId: string,
    userId: string,
    input: ShareLinkCreateInput,
  ): Promise<ShareLinkResponse>;
  findAllByDocumentId(documentId: string): Promise<ShareLinkResponse[]>;
  findOneById(id: string, documentId: string): Promise<ShareLinkResponse>;
  updateById(
    id: string,
    documentId: string,
    input: ShareLinkUpdateInput,
  ): Promise<ShareLinkResponse>;
  revokeById(id: string, documentId: string): Promise<ShareLinkResponse>;
  getByToken(token: string, password?: string): Promise<ShareLinkWithDocument>;
  validateToken(token: string): Promise<{ id: string }>;
}

export interface LinkViewModel {
  recordView(token: string, input: LinkViewCreateInput): Promise<LinkView>;
  getAnalyticsByLinkId(linkId: string): Promise<LinkAnalyticsResponse>;
  getAnalyticsByDocumentId(
    documentId: string,
  ): Promise<DocumentAnalyticsResponse>;
}

export interface StorageModel {
  saveFile(
    file: Buffer,
    originalFilename: string,
  ): Promise<{ key: string; size: number }>;
  deleteFile(key: string): Promise<void>;
}

export interface MigratorModel {
  listPendingMigrations(): Promise<RunMigration[]>;
  runPendingMigrations(): Promise<RunMigration[]>;
}

export interface DatabaseModel {
  query<T extends QueryResultRow = any>(
    query: string | DatabaseQuery,
  ): Promise<DatabaseResult<T>>;
  getNewClient(): Promise<any>;
}
