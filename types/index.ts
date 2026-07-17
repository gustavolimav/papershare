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
  is_superadmin: boolean;
  active_workspace_id: string | null;
}

export interface UserPublic {
  id: string;
  username: string;
  email: string;
  created_at: Date;
  updated_at: Date;
  is_superadmin: boolean;
  active_workspace_id: string | null;
}

export interface Session {
  id: string;
  token: string;
  user_id: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export type WorkspaceRole = "owner" | "editor" | "viewer";

export interface Workspace {
  id: string;
  name: string;
  created_by: string;
  is_personal: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface WorkspaceWithRole extends Workspace {
  role: WorkspaceRole;
  member_count: number;
  // Whether the workspace creator has an Anthropic key configured — same
  // boolean-only pattern as AiKeyStatusResponse, just scoped to the
  // workspace's AI identity (its creator) instead of the requester.
  ai_configured: boolean;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: Date;
}

export interface WorkspaceMemberResponse {
  user_id: string;
  username: string;
  email: string;
  role: WorkspaceRole;
  created_at: Date;
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
  // Who uploaded it — audit/display field only ("Enviado por"); no longer
  // consulted for authorization, which is workspace-scoped (see workspace_id).
  user_id: string;
  workspace_id: string;
  ai_summary: string | null;
  ai_summary_generated_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export type DocumentResponse = Document;

// Only the list endpoint joins the uploader's username in — a single
// document fetch (findOneById) has no need for it.
export interface DocumentListItem extends Document {
  uploaded_by_username: string;
}

export interface DocumentSummaryResponse {
  summary: string | null;
  generated_at: Date | null;
}

export interface DocumentListResponse {
  documents: DocumentListItem[];
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
  notify_on_view: boolean;
  require_email: boolean;
  watermark_enabled: boolean;
  nda_text: string | null;
  brand_accent_color: string | null;
  brand_welcome_message: string | null;
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
  notify_on_view: boolean;
  require_email: boolean;
  allowed_emails: string[];
  watermark_enabled: boolean;
  nda_text: string | null;
  brand_accent_color: string | null;
  brand_welcome_message: string | null;
}

// Deliberately narrower than ShareLinkResponse: this is what the public,
// unauthenticated endpoint returns, so it must not leak the link's
// document_id/user_id/updated_at or the document's storage_key/user_id/timestamps.
// watermark_enabled/nda_text/brand_* ARE included (unlike allowed_emails) —
// the viewer's own client needs them to render the watermark, the NDA gate,
// and the branding, none of which are sensitive (the owner set them for
// display).
export interface ShareLinkWithDocument {
  id: string;
  token: string;
  label: string | null;
  expires_at: Date | null;
  allow_download: boolean;
  is_active: boolean;
  created_at: Date;
  has_password: boolean;
  watermark_enabled: boolean;
  nda_text: string | null;
  brand_accent_color: string | null;
  brand_welcome_message: string | null;
  // Whether the document owner has an Anthropic key configured — tells the
  // viewer whether to show the chat toggle at all, without exposing
  // anything about the key itself.
  ai_chat_available: boolean;
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
  viewer_email: string | null;
  viewer_name: string | null;
  ip_address: string | null;
  country_code: string | null;
  user_agent: string | null;
  time_on_page: number | null;
  pages_viewed: number | null;
  downloaded: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RecordedLinkView extends LinkView {
  is_new_viewer: boolean;
}

export interface ShareLinkNotificationInfo {
  owner_email: string;
  document_id: string;
  document_title: string;
  link_label: string | null;
  notify_on_view: boolean;
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

export interface PageBreakdown {
  page_number: number;
  avg_time_seconds: number;
  view_count: number;
}

// One row per distinct viewer (grouped by fingerprint) on a single link,
// aggregated across all of their visits — a viewer can have more than one
// link_views row if they return after the 30-min dedup window closes.
export interface ViewerEngagement {
  // A hashed per-browser fingerprint, not sensitive to the document owner
  // who already sees the rest of this viewer's activity — surfaced so the
  // frontend can reference a specific viewer (e.g. to request a follow-up
  // email suggestion for them) without a separate persisted "viewer" id.
  viewer_fingerprint: string | null;
  viewer_email: string | null;
  viewer_name: string | null;
  total_time_on_page: number;
  max_pages_viewed: number;
  visit_count: number;
  downloaded: boolean;
  first_viewed_at: Date;
  last_viewed_at: Date;
  // 0-100, weighted blend of time on page / % of pages viewed / return
  // visits / download — see models/linkView.ts#computeEngagementScore for
  // the exact weights and rationale.
  engagement_score: number;
}

export interface FollowUpEmailSuggestion {
  subject: string;
  body: string;
  viewer_email: string | null;
}

// Only on the per-link response: a page-by-page breakdown (and the
// per-viewer engagement list) only make sense in the context of one link,
// not aggregated across a document's links.
export interface LinkAnalyticsResponse extends LinkViewAnalytics {
  page_breakdown: PageBreakdown[];
  viewers: ViewerEngagement[];
}

export interface TopLink {
  link_id: string;
  label: string | null;
  total_views: number;
}

export interface DocumentAnalyticsResponse extends LinkViewAnalytics {
  top_links: TopLink[];
}

export interface Suggestion {
  type: "drop_off" | "engagement";
  message: string;
  page_number: number | null;
}

export interface AnalyticsInsightResponse {
  insight: string | null;
  suggestions: Suggestion[];
  generated_at: Date | null;
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
  workspace_id: string;
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
  notify_on_view?: boolean;
  require_email?: boolean;
  allowed_emails?: string[];
  watermark_enabled?: boolean;
  nda_text?: string;
  brand_accent_color?: string;
  brand_welcome_message?: string;
}

export interface ShareLinkUpdateInput {
  label?: string | null;
  password?: string | null;
  expires_at?: string | null;
  allow_download?: boolean;
  is_active?: boolean;
  notify_on_view?: boolean;
  require_email?: boolean;
  allowed_emails?: string[] | null;
  watermark_enabled?: boolean;
  nda_text?: string | null;
  brand_accent_color?: string | null;
  brand_welcome_message?: string | null;
}

export interface PageTimeInput {
  page: number;
  seconds: number;
}

export interface LinkViewCreateInput {
  viewer_fingerprint?: string;
  viewer_email?: string;
  viewer_name?: string;
  ip_address?: string;
  user_agent?: string;
  time_on_page?: number;
  pages_viewed?: number;
  page_times?: PageTimeInput[];
  downloaded?: boolean;
}

export interface ViewNotificationInput {
  to: string;
  documentTitle: string;
  documentId: string;
  linkLabel: string | null;
  analyticsUrl: string;
  viewerEmail?: string | null;
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
  findOneById(id: string): Promise<User>;
  findOneByUsername(username: string): Promise<User>;
  findOneByEmail(email: string): Promise<User>;
  updateByUsername(
    username: string,
    userInput: UserUpdateInput,
  ): Promise<UserPublic>;
  deleteByUsername(username: string): Promise<void>;
  setAiApiKey(userId: string, apiKey: string | null): Promise<void>;
  hasAiApiKey(userId: string): Promise<boolean>;
  // Internal use only (decrypted plaintext) — never returned over the API.
  getAiApiKey(userId: string): Promise<string | null>;
}

export interface AiKeyStatusResponse {
  configured: boolean;
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
  findAllByWorkspaceId(
    workspaceId: string,
    pagination: { page: number; perPage: number },
  ): Promise<DocumentListResponse>;
  findOneById(id: string, userId: string): Promise<DocumentResponse>;
  updateById(
    id: string,
    userId: string,
    input: DocumentUpdateInput,
  ): Promise<DocumentResponse>;
  deleteById(id: string, userId: string): Promise<{ storage_key: string }>;
  updateSummary(id: string, summary: string): Promise<DocumentSummaryResponse>;
}

export interface WorkspaceModel {
  create(userId: string, name: string): Promise<Workspace>;
  findAllByUserId(userId: string): Promise<WorkspaceWithRole[]>;
  // Throws NotFoundError if the workspace doesn't exist, is deleted, or the
  // user isn't a member (same response for all three, to avoid leaking
  // which workspaces exist); throws ForbiddenError if the user's role is
  // below minRole. Central authorization check reused by US-30/US-31.
  requireRole(
    workspaceId: string,
    userId: string,
    minRole: WorkspaceRole,
  ): Promise<void>;
  updateById(
    workspaceId: string,
    userId: string,
    name: string,
  ): Promise<Workspace>;
  deleteById(workspaceId: string, userId: string): Promise<void>;
  activate(workspaceId: string, userId: string): Promise<Workspace>;
  // Resolves the AI "identity" for any document in this workspace — whoever
  // created the workspace, regardless of who uploaded the specific document
  // or who's currently acting. Returns null if the document/workspace can't
  // be resolved (e.g. a deleted document).
  getCreatorIdForDocument(documentId: string): Promise<string | null>;
  listMembers(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberResponse[]>;
  inviteMember(
    workspaceId: string,
    actingUserId: string,
    email: string,
    role: "editor" | "viewer",
  ): Promise<WorkspaceMemberResponse>;
  updateMemberRole(
    workspaceId: string,
    actingUserId: string,
    targetUserId: string,
    newRole: WorkspaceRole,
  ): Promise<WorkspaceMemberResponse>;
  removeMember(
    workspaceId: string,
    actingUserId: string,
    targetUserId: string,
  ): Promise<void>;
}

export interface ShareLinkModel {
  create(
    documentId: string,
    userId: string,
    input: ShareLinkCreateInput,
  ): Promise<ShareLinkResponse>;
  findAllByDocumentId(
    documentId: string,
    userId: string,
  ): Promise<ShareLinkResponse[]>;
  findOneById(
    id: string,
    documentId: string,
    userId: string,
  ): Promise<ShareLinkResponse>;
  updateById(
    id: string,
    documentId: string,
    userId: string,
    input: ShareLinkUpdateInput,
  ): Promise<ShareLinkResponse>;
  revokeById(
    id: string,
    documentId: string,
    userId: string,
  ): Promise<ShareLinkResponse>;
  getByToken(
    token: string,
    password?: string,
    email?: string,
    name?: string,
  ): Promise<ShareLinkWithDocument>;
  getFileByToken(
    token: string,
    password?: string,
    email?: string,
    name?: string,
  ): Promise<{ storage_key: string; mime_type: string }>;
  validateToken(token: string): Promise<{ id: string }>;
  getNotificationInfo(
    shareLinkId: string,
  ): Promise<ShareLinkNotificationInfo | null>;
  getPublicMetadata(
    token: string,
  ): Promise<{ title: string; description: string | null } | null>;
  getNdaText(token: string): Promise<string | null>;
}

export interface LinkViewModel {
  recordView(
    token: string,
    input: LinkViewCreateInput,
  ): Promise<RecordedLinkView>;
  getAnalyticsByLinkId(
    linkId: string,
    pageCount: number | null,
  ): Promise<LinkAnalyticsResponse>;
  getAnalyticsByDocumentId(
    documentId: string,
  ): Promise<DocumentAnalyticsResponse>;
  getPageBreakdownByDocumentId(documentId: string): Promise<PageBreakdown[]>;
  getViewerByFingerprint(
    linkId: string,
    fingerprint: string,
    pageCount: number | null,
  ): Promise<ViewerEngagement | null>;
}

export interface StorageModel {
  saveFile(
    file: Buffer,
    originalFilename: string,
  ): Promise<{ key: string; size: number }>;
  deleteFile(key: string): Promise<void>;
  getFile(key: string): Promise<{ body: Buffer; contentType: string }>;
}

export interface MailerModel {
  sendViewNotification(input: ViewNotificationInput): Promise<void>;
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
